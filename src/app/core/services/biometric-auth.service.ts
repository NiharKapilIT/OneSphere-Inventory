import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';

const CRED_KEY_PREFIX = 'biometric_cred_';
const REQ_KEY_PREFIX  = 'biometric_req_';

// Morpho RD Service: single-finger capture, ISO 19794-2 format (non-Aadhaar)
const CAPTURE_XML =
  `<?xml version="1.0"?><PidOptions ver="1.0">` +
  `<Opts fCount="1" fType="0" iCount="0" pCount="0" format="0" ` +
  `pidVer="2.0" timeout="10000" posh="UNKNOWN" env="P" />` +
  `</PidOptions>`;

export type BiometricResult = 'success' | 'cancelled' | 'unsupported' | 'no_credential' | 'error';

@Injectable({ providedIn: 'root' })
export class BiometricAuthService {
  private readonly http = inject(HttpClient);

  constructor() {
    // Expose for browser-console diagnostics: window['bioSvc'].detectService()
    if (typeof window !== 'undefined') (window as any)['bioSvc'] = this;
  }

  /** Reads from sessionStorage so the URL is configurable via appsettings.json */
  private get rdUrl(): string {
    return sessionStorage.getItem('morphoRdUrl') ?? 'http://localhost:11100';
  }

  isSupported(): boolean {
    return typeof window !== 'undefined';
  }

  /**
   * Probes all known Morpho/Saffron service ports and returns the first
   * reachable base URL, or null if none respond.
   * Call this from the browser console: window['bioSvc'].detectService()
   */
  async detectService(): Promise<string | null> {
    const candidates = [
      { url: 'http://localhost:11100', path: '/rd/info' },   // Morpho RD Service (HTTP)
      { url: 'https://localhost:11200', path: '/rd/info' },  // Morpho RD Service (HTTPS)
      { url: 'http://localhost:8005',  path: '/rd/info' },   // Morpho WebAPI alt port
      { url: 'http://localhost:8079',  path: '/info' },      // SecuGen WebAPI
      { url: 'http://localhost:9743',  path: '/rd/info' },   // Startek RD
    ];
    for (const c of candidates) {
      if (await this.pingUrl(c.url + c.path)) {
        console.log('[BiometricAuth] Service found at', c.url);
        return c.url;
      }
    }
    console.warn('[BiometricAuth] No fingerprint service found on any known port.');
    return null;
  }

  /**
   * Probes all known capture endpoints and methods.
   * Run from browser console: window['bioSvc'].detectCapture()
   */
  async detectCapture(): Promise<void> {
    const base = this.rdUrl;
    const variants: { label: string; method: string; url: string }[] = [
      { label: 'POST /rd/capture (text/plain)',        method: 'POST', url: `${base}/rd/capture` },
      { label: 'GET  /rd/capture (no body)',           method: 'GET',  url: `${base}/rd/capture` },
      { label: 'GET  /rd/capture?PidOptions=...',      method: 'GET',  url: `${base}/rd/capture?PidOptions=${encodeURIComponent(CAPTURE_XML)}` },
      { label: 'POST /capture (text/plain)',           method: 'POST', url: `${base}/capture` },
      { label: 'GET  /capture',                        method: 'GET',  url: `${base}/capture` },
    ];
    console.group('[BiometricAuth] detectCapture — probing endpoints');
    for (const v of variants) {
      const status = await this.probeMethod(v.method, v.url);
      const icon = status === 200 ? '✅' : status === 0 ? '🔌' : `❌ ${status}`;
      console.log(icon, v.label);
    }
    console.groupEnd();
  }

  private probeMethod(method: string, url: string): Promise<number> {
    return new Promise(resolve => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url);
      if (method === 'POST') xhr.setRequestHeader('Content-Type', 'text/plain');
      xhr.timeout = 4000;
      xhr.ontimeout = () => resolve(0);
      xhr.onerror  = () => resolve(0);
      xhr.onload   = () => resolve(xhr.status);
      xhr.send(method === 'POST' ? CAPTURE_XML : null);
    });
  }

  /** Pings the configured service info endpoint to confirm the device is ready. */
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    return this.pingUrl(`${this.rdUrl}/rd/info`);
  }

  private pingUrl(url: string): Promise<boolean> {
    return new Promise(resolve => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      xhr.timeout = 3000;
      xhr.ontimeout = () => resolve(false);
      xhr.onerror   = () => resolve(false);
      xhr.onload    = () => resolve(xhr.status === 200);
      xhr.send();
    });
  }

  hasCredential(userId: number): boolean {
    return !!localStorage.getItem(CRED_KEY_PREFIX + userId);
  }

  /** Capture a fingerprint and return the raw PID XML without enrolling it. */
  async capturePidXml(): Promise<{ pidXml: string | null; error: string }> {
    try {
      const pidXml = await this.capture();
      return pidXml
        ? { pidXml, error: '' }
        : { pidXml: null, error: 'Scan cancelled or failed. Please try again.' };
    } catch (err: any) {
      if (this.isDeviceUnavailable(err))
        return { pidXml: null, error: 'Fingerprint device not reachable. Ensure Morpho RD Service is running.' };
      return { pidXml: null, error: 'Scan failed. Please try again.' };
    }
  }

  /** Enroll a pre-captured PID XML for a known userId (use after user creation). */
  async enrollWithPid(userId: number, pidXml: string): Promise<BiometricResult> {
    const api = sessionStorage.getItem('apiURL') ?? '';
    try {
      await firstValueFrom(
        this.http.post(`${api}/biometric/enroll`, { userId, pidXml }).pipe(timeout(15000))
      );
      localStorage.setItem(CRED_KEY_PREFIX + userId, '1');
      return 'success';
    } catch (err: any) {
      if (this.isDeviceUnavailable(err)) return 'unsupported';
      return 'error';
    }
  }

  /**
   * Captures a fingerprint via the Morpho RD Service and enrolls it on the backend.
   * The PID XML is sent as-is; no raw image is ever stored on the client.
   * Backend endpoint: POST /api/biometric/enroll  { userId, pidXml }
   */
  async registerCredential(
    userId: number,
    _username: string,
    _displayName: string
  ): Promise<BiometricResult> {
    const api = sessionStorage.getItem('apiURL') ?? '';
    try {
      const pidXml = await this.capture();
      if (!pidXml) return 'cancelled';

      await firstValueFrom(
        this.http.post(`${api}/biometric/enroll`, { userId, pidXml }).pipe(timeout(15000))
      );
      localStorage.setItem(CRED_KEY_PREFIX + userId, '1');
      return 'success';
    } catch (err: any) {
      if (this.isDeviceUnavailable(err)) return 'unsupported';
      return 'error';
    }
  }

  /**
   * Captures a fingerprint and verifies it against the stored template on the backend.
   * Backend endpoint: POST /api/biometric/verify  { userId, pidXml } → { matched: boolean }
   */
  async authenticateCredential(userId: number): Promise<BiometricResult> {
    if (!localStorage.getItem(CRED_KEY_PREFIX + userId)) return 'no_credential';
    const api = sessionStorage.getItem('apiURL') ?? '';
    try {
      const pidXml = await this.capture();
      if (!pidXml) return 'cancelled';

      const response = await firstValueFrom(
        this.http.post<{ matched: boolean }>(`${api}/biometric/verify`, { userId, pidXml })
          .pipe(timeout(15000))
      );
      return response.matched ? 'success' : 'error';
    } catch (err: any) {
      if (this.isDeviceUnavailable(err)) return 'unsupported';
      return 'error';
    }
  }

  removeCredential(userId: number): void {
    localStorage.removeItem(CRED_KEY_PREFIX + userId);
  }

  setRequired(userId: number, required: boolean): void {
    required
      ? localStorage.setItem(REQ_KEY_PREFIX + userId, '1')
      : localStorage.removeItem(REQ_KEY_PREFIX + userId);
  }

  isRequired(userId: number): boolean {
    return localStorage.getItem(REQ_KEY_PREFIX + userId) === '1';
  }

  /**
   * Capture a fingerprint from the Morpho RD Service.
   *
   * Method negotiation:
   *  1. Try POST /rd/capture with text/plain (no CORS preflight; standard UIDAI path).
   *  2. On HTTP 405 retry with GET /rd/capture?PidOptions=<encoded> — several Morpho
   *     Saffron non-UIDAI builds only accept GET on this endpoint.
   *
   * Returns the raw PID XML on success, null if scan was cancelled/failed,
   * throws on network/timeout errors (device unreachable).
   */
  private capture(): Promise<string | null> {
    return new Promise((resolve, reject) => {
      this.xhrCapture('POST', `${this.rdUrl}/rd/capture`, CAPTURE_XML, resolve, reject, () => {
        // POST returned 405 — this build uses GET; send options as query param
        console.info('[BiometricAuth] POST /rd/capture → 405, retrying as GET');
        const url = `${this.rdUrl}/rd/capture?PidOptions=${encodeURIComponent(CAPTURE_XML)}`;
        this.xhrCapture('GET', url, null, resolve, reject, () => {
          reject({ status: 405 });
        });
      });
    });
  }

  private xhrCapture(
    method: 'POST' | 'GET',
    url: string,
    body: string | null,
    resolve: (v: string | null) => void,
    reject: (e: any) => void,
    on405: () => void
  ): void {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    if (method === 'POST') xhr.setRequestHeader('Content-Type', 'text/plain');
    xhr.timeout = 15000;
    xhr.ontimeout = () => reject({ status: 0, name: 'TimeoutError' });
    xhr.onerror  = () => reject({ status: 0 });
    xhr.onload   = () => {
      if (xhr.status === 405) { on405(); return; }
      if (xhr.status !== 200) { reject({ status: xhr.status }); return; }
      const xml = xhr.responseText;
      if (!xml) { resolve(null); return; }
      // errCode="0" = success; any other code = scan cancelled or hardware error
      const m = xml.match(/errCode="(-?\d+)"/);
      resolve(m && m[1] === '0' ? xml : null);
    };
    xhr.send(body);
  }

  private isDeviceUnavailable(err: any): boolean {
    return !err?.status || err?.status === 0 || err?.status === 503 || err?.name === 'TimeoutError';
  }
}
