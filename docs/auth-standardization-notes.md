# Auth Standardization Notes

Date: 2026-05-25

## Scope

This change is frontend-only. It does not change database, backend APIs, stored procedures, or feature modules.

## Standard Session

New multi-tenant screens should use the `/api/auth/...` login flow. A standard session has:

- `token`
- `refreshToken`
- `companyId`
- `branchId`
- JWT claims: `user_id`, `company_id`, `active_branch_id`

## What Changed

- Auth service now checks JWT expiry.
- Auth service can verify whether a token has tenant claims.
- Route guard validates standard tenant claims for Inventory, Settings, and HRMS.
- HTTP interceptor retries one failed `401` request after refreshing the token.
- If refresh fails, the session is cleared and the user is sent to login.

## Legacy Rule

Legacy Accounts login is left untouched for now. It is not treated as a standard multi-tenant session because it may not contain `company_id` in the JWT.

## Files Changed

```text
src/app/core/services/auth.service.ts
src/app/core/guards/auth.guard.ts
src/app/core/Interceptor/Interceptor.ts
docs/auth-standardization-notes.md
```
