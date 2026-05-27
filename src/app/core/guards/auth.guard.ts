import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Protects private routes — redirects to /login if not authenticated
export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const moduleId = resolveDashboardModule(state.url);
  const requireTenantClaims = requiresStandardTenantSession(moduleId);

  return authService.ensureAuthenticated(requireTenantClaims).pipe(
    map(isAuthenticated => {
      if (!isAuthenticated) {
        if (!authService.isAuthenticated()) {
          authService.logout();
        }
        return router.createUrlTree(['/login']);
      }

      if (!moduleId || authService.canAccessModule(moduleId)) return true;

      return router.createUrlTree(['/dashboard']);
    })
  );
};

// Protects public routes — redirects to /dashboard if already logged in
export const guestGuard: CanActivateFn = (_route, _state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) return true;

  router.navigate(['/dashboard']);
  return false;
};

function resolveDashboardModule(url: string): string | null {
  const match = (url || '').split(/[?#]/)[0].match(/^\/dashboard\/([^/]+)/i);
  const moduleId = match?.[1]?.toLowerCase() ?? null;
  return moduleId && ['accounts', 'hrms', 'inventory', 'settings'].includes(moduleId)
    ? moduleId
    : null;
}

function requiresStandardTenantSession(moduleId: string | null): boolean {
  if (sessionStorage.getItem('authSessionKind') === 'legacy') return false;
  return moduleId === 'inventory' || moduleId === 'settings' || moduleId === 'hrms';
}
