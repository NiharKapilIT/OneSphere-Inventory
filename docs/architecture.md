# Global ERP Architecture Documentation

Document date: 14-May-2026  
Project: Global ERP V21  
Repository scope: Angular frontend application  
Documentation format: Word-friendly Markdown

## 1. Documentation Set

This architecture pack contains the following focused documents:

| Document | Purpose |
| --- | --- |
| [Software Architecture Document](software-architecture-saas-erp.md) | Complete SaaS ERP software architecture covering business, technical, database, security, deployment, workflow, and future roadmap. |
| [Business Architecture Document](business-architecture.md) | Modules, users, workflows, approvals, business rules, and business gaps. |
| [Technical Architecture Document](technical-architecture.md) | Frontend, backend API integration, database interface, security, build, and deployment. |
| [Database Architecture Document](database-architecture.md) | Logical tables, relationships, tenant model, transactions, reports, and database validation items. |

## 2. Source Boundary

The current workspace contains the Angular frontend application. It does not contain backend API source code or database schema files.

Because of that:

- Frontend architecture is documented directly from source code.
- Business modules and workflows are documented from routes, navigation metadata, screens, services, and visible UI behavior.
- Database architecture is a logical/inferred model and must be validated against the actual database.
- Backend architecture is documented from frontend API integration points and should be completed with backend repository details.

## 3. Current Application Summary

Global ERP is an Angular 21 standalone single page application with guarded routing and feature-based lazy loading.

Primary business modules:

- Accounts
- Inventory
- HRMS
- Settings
- Contacts
- SOS Help

Primary technical layers:

- Angular standalone components
- Angular Router
- Core services
- Shared layout and UI components
- Runtime API configuration from `src/assets/appsettings.json`
- REST API integration through `CommonService`
- PDF/Excel report exports

## 4. Important Local Files

| Area | Files |
| --- | --- |
| Bootstrap | `src/main.ts`, `src/app/app.config.ts`, `src/app/app.ts`, `src/app/app.html` |
| Routing | `src/app/app.routes.ts` |
| Accounts routes | `src/app/features/accounts/accounts_routs.ts` |
| Inventory routes | `src/app/features/inventory/inventory_routs.ts` |
| HRMS routes | `src/app/features/HRMS/hrms_routs.ts` |
| Settings routes | `src/app/features/settings/settings_routs.ts` |
| Auth | `src/app/core/services/auth.service.ts`, `src/app/core/guards/auth.guard.ts`, `src/app/shared/login/login.component.ts` |
| API facade | `src/app/core/services/Common/common.service.ts` |
| Navigation | `src/app/core/services/Navigation/navigation.service.ts`, `src/app/shared/main-layout/main-layout.component/main-layout.component.ts` |
| Runtime API config | `src/assets/appsettings.json`, `src/envir/environment.ts`, `src/envir/environment.prod.ts` |

## 5. Recommended Reading Order

1. Software Architecture Document
2. Business Architecture Document
3. Technical Architecture Document
4. Database Architecture Document

This order starts with the complete SaaS ERP software architecture, then provides deeper business, technical, and database-focused documents.
