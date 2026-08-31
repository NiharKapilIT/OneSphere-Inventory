import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Observable, catchError, finalize, map, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { AuthApiResponse, AuthService } from '../services/auth.service';

let refreshRequest$: Observable<AuthApiResponse> | null = null;

// When this app is loaded as a Module Federation remote inside the
// OneSphere-Accounts host, the access token deliberately lives ONLY in that
// host's in-memory TokenService (never sessionStorage/a cookie), and this
// app's own separately-bundled AuthService has no Angular DI path to reach
// that exact instance. OneSphere-Accounts' TokenService installs this bridge
// on the shared `window` (same page, same JS realm under federation) so
// every request here can still get the live token. Falls back to
// sessionStorage['token'] when the bridge isn't present -- i.e. this app
// running standalone (its own login writes sessionStorage['token'] itself,
// see auth.service.ts's setMultiTenantSession).
function currentAccessToken(): string {
  const bridge = (window as unknown as { __oneSphereGetAccessToken?: () => string | null }).__oneSphereGetAccessToken;
  const bridged = bridge?.();
  return bridged || sessionStorage.getItem('token') || '';
}

export const responseInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const apiUrl = sessionStorage.getItem('apiURL') || '';
  const token = currentAccessToken();
  const isApiRequest = !!apiUrl && req.url.startsWith(apiUrl);
  const request = token && isApiRequest && !isAnonymousAuthEndpoint(req.url) && !req.headers.has('Authorization')
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    map((event) => {
      if (event instanceof HttpResponse) {
        const body = event.body;

        // If response is plain true/false, return as-is
        if (typeof body === 'boolean') {
          return event.clone({ body });
        }

        // If response has success + receipt_number, return full object
        if (body && typeof body === 'object') {
          return event.clone({ body });
        }

        return event;
      }
      return event;
    }),
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !isApiRequest || isRefreshExcluded(req.url)) {
        return throwError(() => error);
      }

      const refreshToken = authService.getRefreshToken();
      if (!refreshToken || !authService.hasTenantClaims()) {
        if (sessionStorage.getItem('authSessionKind') === 'legacy') {
          return throwError(() => error);
        }
        authService.logout();
        router.navigate(['/login']);
        return throwError(() => error);
      }

      if (!refreshRequest$) {
        refreshRequest$ = authService.refreshToken(refreshToken).pipe(
          tap(response => {
            if (!response.data?.accessToken) {
              throw new Error('Refresh token response did not include an access token.');
            }
            authService.setMultiTenantSession(response.data);
          }),
          finalize(() => {
            refreshRequest$ = null;
          }),
          shareReplay(1)
        );
      }

      return refreshRequest$.pipe(
        catchError(refreshError => {
          // The refresh call itself failed — there's no way to recover the session.
          authService.logout();
          router.navigate(['/login']);
          return throwError(() => refreshError);
        }),
        switchMap(() => {
          const refreshedToken = authService.getToken();
          const retriedRequest = request.clone({
            setHeaders: { Authorization: `Bearer ${refreshedToken}` }
          });
          return next(retriedRequest).pipe(
            catchError(retryError => {
              // Only a repeat 401 after a successful refresh means the session is
              // genuinely invalid. Any other error (404, 500, ...) is unrelated to
              // auth and must not blow away a perfectly valid session.
              if (retryError instanceof HttpErrorResponse && retryError.status === 401) {
                authService.logout();
                router.navigate(['/login']);
              }
              return throwError(() => retryError);
            })
          );
        })
      );
    })
  );
};

function isAnonymousAuthEndpoint(url: string): boolean {
  return [
    '/auth/request-otp',
    '/auth/verify-otp',
    '/auth/password-login',
    '/auth/request-registration-otp',
    '/auth/verify-registration-otp',
    '/auth/refresh-token',
    '/auth/suggest-company-code',
    '/auth/check-company-code',
    '/Accounts/login'
  ].some(path => url.includes(path));
}

function isRefreshExcluded(url: string): boolean {
  return isAnonymousAuthEndpoint(url);
}
