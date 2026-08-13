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

// Warns when a role lacks a screen's permission (as configured in Settings >
// User Management > Roles & Permissions), without blocking navigation — the
// requested screen always loads; this only shows a non-blocking "Access
// restricted" toast alongside it.
export const screenPermissionGuard = (screenCode: string): CanActivateFn => (_route, state) => {
  const authService = inject(AuthService);

  if (!authService.can(screenCode, 'view')) {
    warnAccessRestricted(state.url);
  }

  return true;
};

// Same as screenPermissionGuard, but for the single dynamic `:reportKey`
// route that backs every Inventory report page — looks up the screen code
// for whichever report slug is in the URL instead of taking one statically.
const REPORT_SLUG_SCREEN_CODES: Record<string, string> = {
  'stock-summary': 'INV_R_STOCK_SUMMARY',
  'stock-ledger': 'INV_R_STOCK_LEDGER',
  'warehouse-wise-stock': 'INV_R_WAREHOUSE_STOCK',
  'purchase-order-register': 'INV_R_PO_REGISTER',
  'grn-register': 'INV_R_GRN_REGISTER',
  'purchase-invoice-register': 'INV_R_PI_REGISTER',
  'sales-order-register': 'INV_R_SO_REGISTER',
  'delivery-challan-register': 'INV_R_DC_REGISTER',
  'sales-invoice-register': 'INV_R_SI_REGISTER',
  'hsn-summary': 'INV_R_HSN_SUMMARY',
  'batch-serial-expiry': 'INV_R_BATCH_SERIAL_EXPIRY',
  'product-profitability': 'INV_R_PRODUCT_PROFIT',
  'low-stock-alert': 'INV_R_LOW_STOCK',
  'pending-document': 'INV_R_PENDING_DOC',
  'inventory-audit-trail': 'INV_R_AUDIT_TRAIL',
  // Aliases also accepted by findInventoryReport() in inventory-report.registry.ts
  'stock-availability-report': 'INV_R_STOCK_SUMMARY',
  'hsn-sac-report': 'INV_R_HSN_SUMMARY'
};

export const reportPermissionGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);

  const reportKey = route.paramMap.get('reportKey') ?? '';
  const screenCode = REPORT_SLUG_SCREEN_CODES[reportKey];

  if (screenCode && !authService.can(screenCode, 'view')) {
    warnAccessRestricted(state.url);
  }

  return true;
};

// Dispatches a plain window event rather than injecting MessageService
// directly — MessageService is provided in the host shell (OneSphere-Accounts),
// and injecting it from here (a separately-built federated remote) hits
// NG0201 "No provider found for MessageService": native federation's
// cross-bundle singleton sharing doesn't reliably dedupe it. A plain window
// event works regardless of module boundaries — the host's AppComponent
// listens for it and owns the real MessageService/<p-toast>.
// The sessionStorage debounce (shared with OneSphere-HRMS's CommonService and
// OneSphere-Accounts' screenPermissionGuard) is keyed by the target page
// rather than a blanket timer, so it only swallows a genuine duplicate fire
// for the SAME screen (this guard + that screen's own reactive 403), never a
// legitimate toast for a different screen visited moments later.
function warnAccessRestricted(pageKey: string): void {
  const now = Date.now();
  let last: { key: string; at: number } | null = null;
  try {
    last = JSON.parse(sessionStorage.getItem('accessRestrictedToast') || 'null');
  } catch {
    last = null;
  }
  if (last && last.key === pageKey && now - last.at < 3000) return;
  sessionStorage.setItem('accessRestrictedToast', JSON.stringify({ key: pageKey, at: now }));

  window.dispatchEvent(new CustomEvent('erp:access-restricted', {
    detail: { message: "You don't have permission for this module. Contact your administrator to request access." }
  }));
}

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
  return moduleId && ['inventory', 'settings'].includes(moduleId)
    ? moduleId
    : null;
}

function requiresStandardTenantSession(moduleId: string | null): boolean {
  if (sessionStorage.getItem('authSessionKind') === 'legacy') return false;
  return moduleId === 'inventory' || moduleId === 'settings';
}
