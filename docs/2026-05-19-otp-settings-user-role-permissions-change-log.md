# 2026-05-19 - OTP, Registration, Settings, Roles and Tenant Selection Change Log

## Request

- Fix newly created account login OTP delivery.
- Remove Company Code and development OTP exposure from the normal login page.
- Add Settings screens so a company admin can create branches, users, roles, and permissions.
- Change registration so it only verifies email by OTP, creates the company, and records module, branch, and user limits for pricing/payment.
- After registration login, send the company admin directly to Settings to create branches and users.
- Allow the same email address to exist in more than one company for now; after OTP verification, ask the user to choose company and branch when more than one context exists.
- Keep the implementation process and complete change log.
- Use existing database tables only.

## Root Cause

- Login OTP skipped SMTP delivery whenever development OTP exposure was enabled. The API returned the OTP in the response, but did not call the SMTP sender.
- The login UI displayed/autofilled the exposed development OTP.
- OTP login showed Company Code even though the backend can resolve a unique active user by email, username, mobile, or login identifier.
- The registration wizard collected branches and admin-user details too early. The intended SaaS flow is company creation first, then branch/user setup from Settings after login.
- The Angular app was not consistently attaching the JWT bearer token to protected Settings API calls.
- The backend already had secure APIs and tables for users, branches, roles, screens, and permissions, but the required Settings screens/routes were missing.

## Process Followed

1. Traced registration OTP, login OTP, company creation, user creation, branch access, role, and permission flows in `AuthController`, `MultiTenantDataService`, and `OtpSender`.
2. Compared registration OTP delivery with login OTP delivery and removed the login-only development OTP shortcut.
3. Mapped the existing database tables used by the multi-tenant flow.
4. Reworked registration to stop at email OTP, company details, selected modules, max branches, and max users.
5. Kept login possible by creating the first company admin silently from the verified registration email when no admin-user payload is supplied.
6. Added multi-company/multi-branch OTP login selection and context switching.
7. Added Settings screens for branch management, user management, roles, and permissions.
8. Added email notification when a user is created from Settings.
9. Added data-only migrations to align Settings routes and permissions.
10. Verified Angular and API compilation.

## Database Tables

- No new database table was added for these latest flow changes.
- Registration OTP uses existing `registration_otp_requests`.
- Login OTP uses existing `otp_login_requests`.
- Registration/company setup uses existing `companies`, `company_plans`, `company_module_access`, `company_subscription_orders`, and `company_subscription_order_modules`.
- Users and login identities use existing `users`.
- Branch access uses existing `branches` and `user_branch_access`.
- Roles and permissions use existing `roles`, `user_roles`, `screens`, and `role_screen_permissions`.
- Session refresh and audit continue to use existing `refresh_tokens` and `audit_logs`.
- New migration `20260519_registration_settings_flow.sql` only updates existing `screens` and `role_screen_permissions` rows for the `BRANCH` screen.

## Backend Changes

- `MultiTenantDataService.cs`
  - Login OTP now always attempts email delivery through `IOtpSender`.
  - Development OTP exposure no longer suppresses email sending.
  - OTP verification now returns `requiresSelection` with company/branch options when the same login identifier belongs to multiple active contexts.
  - Added server-side completion for selected company/branch login.
  - Added `SwitchCompanyAsync` so an authenticated user can switch company/branch where their email/login identifier is valid.
  - Company creation now supports the new registration flow without `defaultBranch` or `adminUser`.
  - First company admin is created silently from the verified registration email so the registrant can log in.
  - Creating a branch now grants the company admin branch access automatically.
  - Creating a user now sends a confirmation email.

- `AuthController.cs`
  - OTP request responses now use safe user-facing messages instead of "Development OTP generated" messages.
  - Added authenticated `POST /api/auth/switch-company`.

- `MultiTenantDtos.cs`
  - Extended OTP verification with optional `companyId` and `branchId`.
  - Added response DTOs for tenant selection.
  - Added switch-company request DTO.

- `OtpSender.cs`
  - Increased default SMTP timeout from 8 seconds to 15 seconds.
  - Added user-created confirmation email support.

- `appsettings.json`
  - Set `MultiTenant:ExposeOtpInDevelopment` to `false`.

- `20260519_settings_user_role_permissions.sql`
  - Ensures Settings module screen routes and Company Admin permissions for users, roles, and screen access.

- `20260519_registration_settings_flow.sql`
  - Points the existing `BRANCH` screen to `/dashboard/settings/branch-management/manage-branches`.
  - Ensures Company Admin can view/create/update/delete/export branch setup from Settings.

## Frontend Changes

- Login and Registration
  - Removed Company Code from the visible OTP login screen.
  - Removed development OTP display/autofill from login.
  - Login OTP request now shows normal inbox messaging only.
  - Registration now asks only for email OTP, company details, module selection, max branches, and max users.
  - Removed branch creation and admin-user creation from registration.
  - After registration, the user is sent back to OTP login and then redirected to Settings branch setup.
  - Login now asks the user to choose company and branch after OTP verification when multiple contexts exist.

- Session and Context
  - Stored tenant options from login for context switching.
  - Added company/branch switch controls in the main layout user menu.
  - Switching company/branch refreshes the multi-tenant session payload.

- HTTP
  - Registered the existing interceptor.
  - Interceptor attaches `Authorization: Bearer <token>` for configured API calls.

- Settings
  - Added `AccessControlService` methods for branch create/update/inactivate.
  - Added `Manage Branches` screen for first-login setup and ongoing branch maintenance.
  - Added `Manage Users` screen to create/update/inactivate users, assign branches, set default branch, and assign roles.
  - Added `Roles & Permissions` screen to create/update/inactivate roles and maintain screen-level permissions.
  - Added Settings routes:
    - `/dashboard/settings/branch-management/manage-branches`
    - `/dashboard/settings/user-management/manage-users`
    - `/dashboard/settings/user-management/roles-permissions`
  - Settings dashboard and navigation now link to branch, user, role, and permission management.

## Continuation Updates

- Treated Settings as a core setup module in the backend subscription checks so newly registered company admins can always reach branch, user, role, and permission setup.
- Included Settings automatically in initial company module access even when the registration UI cannot load the module list.
- Refreshed the authenticated session after branch creation so the first branch becomes available immediately in the current session.
- Added `/api/auth/me` tenant options to keep company/branch switching available after session refresh and branch switching.
- Reloaded the user-menu context switcher whenever the avatar menu opens so newly refreshed branch/company options are shown without logout.

## Files Changed

- `Global-ERP-Web-Api/GLOBAL_ACCOUNTS_LATEST/Kapil_Group_ERP_API/MultiTenancy/Models/MultiTenantDtos.cs`
- `Global-ERP-Web-Api/GLOBAL_ACCOUNTS_LATEST/Kapil_Group_ERP_API/MultiTenancy/Services/MultiTenantDataService.cs`
- `Global-ERP-Web-Api/GLOBAL_ACCOUNTS_LATEST/Kapil_Group_ERP_API/MultiTenancy/Services/OtpSender.cs`
- `Global-ERP-Web-Api/GLOBAL_ACCOUNTS_LATEST/Kapil_Group_ERP_API/Controllers/AuthController.cs`
- `Global-ERP-Web-Api/GLOBAL_ACCOUNTS_LATEST/Kapil_Group_ERP_API/appsettings.json`
- `Global-ERP-Web-Api/GLOBAL_ACCOUNTS_LATEST/Kapil_Group_ERP_API/Database/Migrations/20260519_settings_user_role_permissions.sql`
- `Global-ERP-Web-Api/GLOBAL_ACCOUNTS_LATEST/Kapil_Group_ERP_API/Database/Migrations/20260519_registration_settings_flow.sql`
- `GLOBAL_ERP_V21/src/app/app.config.ts`
- `GLOBAL_ERP_V21/src/app/core/Interceptor/Interceptor.ts`
- `GLOBAL_ERP_V21/src/app/core/services/auth.service.ts`
- `GLOBAL_ERP_V21/src/app/core/services/Settings/access-control.service.ts`
- `GLOBAL_ERP_V21/src/app/core/services/Navigation/navigation.service.ts`
- `GLOBAL_ERP_V21/src/app/features/settings/settings_routs.ts`
- `GLOBAL_ERP_V21/src/app/features/settings/settings-dashboard/settings-dashboard.ts`
- `GLOBAL_ERP_V21/src/app/features/settings/settings-dashboard/settings-dashboard.html`
- `GLOBAL_ERP_V21/src/app/features/settings/branch-management/manage-branches/manage-branches.component.ts`
- `GLOBAL_ERP_V21/src/app/features/settings/branch-management/manage-branches/manage-branches.component.html`
- `GLOBAL_ERP_V21/src/app/features/settings/branch-management/manage-branches/manage-branches.component.scss`
- `GLOBAL_ERP_V21/src/app/features/settings/user-management/manage-users/manage-users.component.ts`
- `GLOBAL_ERP_V21/src/app/features/settings/user-management/manage-users/manage-users.component.html`
- `GLOBAL_ERP_V21/src/app/features/settings/user-management/manage-users/manage-users.component.scss`
- `GLOBAL_ERP_V21/src/app/features/settings/user-management/roles-permissions/roles-permissions.component.ts`
- `GLOBAL_ERP_V21/src/app/features/settings/user-management/roles-permissions/roles-permissions.component.html`
- `GLOBAL_ERP_V21/src/app/features/settings/user-management/roles-permissions/roles-permissions.component.scss`
- `GLOBAL_ERP_V21/src/app/shared/login/login.component.ts`
- `GLOBAL_ERP_V21/src/app/shared/login/login.component.html`
- `GLOBAL_ERP_V21/src/app/shared/login/login.component.scss`
- `GLOBAL_ERP_V21/src/app/shared/main-layout/main-layout.component/main-layout.component.ts`
- `GLOBAL_ERP_V21/src/app/shared/main-layout/main-layout.component/main-layout.component.html`
- `GLOBAL_ERP_V21/src/app/shared/main-layout/main-layout.component/main-layout.component.scss`
- `GLOBAL_ERP_V21/docs/2026-05-19-otp-settings-user-role-permissions-change-log.md`

## Verification

- `npm.cmd run build`
  - Passed.
  - Remaining warning: initial bundle exceeds the configured 2 MB budget by 77.14 KB, total 2.08 MB.
  - Remaining warning: `main-layout.component.scss` exceeds the configured 24 KB style budget by 291 bytes.
  - Remaining warning: `login.component.scss` exceeds the configured 24 KB style budget by 3.42 KB.

- `dotnet build KapilGroupERP.sln -p:UseAppHost=false -p:OutDir=C:\tmp\onesphere-api-build\`
  - Passed.
  - 0 warnings, 0 errors.

## Deployment Notes

- Run these migrations before using the Settings setup flow:
  - `20260519_settings_user_role_permissions.sql`
  - `20260519_registration_settings_flow.sql`
- Restart the API after deployment so the OTP, tenant selection, switch-company, and user-created email changes are active.
- Confirm SMTP settings are valid in the target environment.
- Users created in Settings should have an email address because OTP login and confirmation mail depend on email delivery.
