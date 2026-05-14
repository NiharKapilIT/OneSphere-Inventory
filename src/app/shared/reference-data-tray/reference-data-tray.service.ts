import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { ReferenceDataBindEvent, ReferenceDataTrayConfig, ReferenceDataTrayState } from './reference-data-tray.models';
import { REFERENCE_DATA_TRAY_CONFIGS } from './reference-data-tray.registry';

@Injectable({ providedIn: 'root' })
export class ReferenceDataTrayService {
  private readonly storagePrefix = 'reference-data-tray';
  private readonly referenceBindSubject = new Subject<ReferenceDataBindEvent>();
  readonly referenceBind$ = this.referenceBindSubject.asObservable();

  resolveForRoute(route: string): ReferenceDataTrayConfig | null {
    const currentPath = this.normalizeRoute(route);

    return REFERENCE_DATA_TRAY_CONFIGS.find(config =>
      config.routes.some(matcher => {
        const targetPath = this.normalizeRoute(matcher.path);
        return matcher.match === 'prefix'
          ? currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)
          : currentPath === targetPath;
      })
    ) ?? null;
  }

  loadState(configId: string): ReferenceDataTrayState | null {
    const storage = this.getStorage();
    if (!storage) return null;

    try {
      const raw = storage.getItem(this.stateKey(configId));
      return raw ? JSON.parse(raw) as ReferenceDataTrayState : null;
    } catch {
      return null;
    }
  }

  saveState(configId: string, state: ReferenceDataTrayState): void {
    const storage = this.getStorage();
    if (!storage) return;

    storage.setItem(this.stateKey(configId), JSON.stringify(state));
  }

  bindReferenceData(event: ReferenceDataBindEvent): void {
    this.referenceBindSubject.next(event);
  }

  private stateKey(configId: string): string {
    return `${this.storagePrefix}:${configId}`;
  }

  private normalizeRoute(route: string): string {
    const pathOnly = (route || '/').split(/[?#]/)[0] || '/';
    const withLeadingSlash = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
    return withLeadingSlash.replace(/\/+$/, '') || '/';
  }

  private getStorage(): Storage | null {
    return typeof window === 'undefined' ? null : window.localStorage;
  }
}
