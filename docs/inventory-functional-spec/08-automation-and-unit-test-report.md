# Automation & Unit Test Report — Current State

This is a snapshot, not a log. It synthesizes `OneSphere-Inventory/docs/INVENTORY_AUTOMATION_TESTS.md`
(1000+ lines of dated, per-item history going back to 2026-08-14) into a single current-state view, plus
two fresh, real test runs executed on 2026-08-30 specifically for this report:

- Frontend: `npx ng test` (full, unscoped) in `d:\ERP-AIH\OneSphere-Inventory`.
- Backend: `dotnet test` (full, unscoped) in `d:\ERP-AIH\GLOBAL_ACCOUNTS_LATEST\Kapil_Group_ERP_API.Tests`.

Both ran clean to completion — no build-blocking file stopped either suite from executing. That is
itself worth stating plainly, because the automation doc's own history records real periods where
`ng test` and `dotnet test` did not compile at all; that is not the state today.

## Summary

The frontend suite (Angular's native Vitest-backed `@angular/build:unit-test` builder) currently runs
**71 spec files / 561 tests**, with **545 passing (97.1%)** and **16 failing across 6 files** — every
failure is a pre-existing Angular dependency-injection wiring gap (`DatePipe`/`MessageService` not
provided to a service or component under test), not a business-logic regression or a compile error. The
backend suite (xUnit/Moq, `Kapil_Group_ERP_API.Tests`) currently runs **429/429 passing (100%)**, but
with a real, silent regression underneath that clean number: the dedicated `ReportsControllerTests.cs`
file — previously documented with 29+ cases covering all 16 `ReportsController` endpoints (13 standard
reports, Stock Valuation Comparison, MIS Report, Loss Sales Report) — no longer exists anywhere in the
repository. The 16 report endpoints in `Kapil_Group_ERP_API/Controllers/ReportsController.cs` currently
have **zero** backend test coverage, and the "100% passing" figure reflects a smaller, silently-shrunk
suite, not a healthier one. On the frontend side, coverage is heavily concentrated in one area (the
2026-08 Warehouse/Branch Independence effort, which touches Stock Movement and the shared transaction
shell) and is **entirely absent** for two whole functional areas: Masters (all ~25 screens) and
Manufacturing (all ~7 screens).

## Frontend Test Suite — Current Run

```
npx ng test        (d:\ERP-AIH\OneSphere-Inventory, 2026-08-30)

Test Files   6 failed | 65 passed (71)
Tests       16 failed | 545 passed (561)
```

The full run **compiled and executed to completion** — this repo's own copy of `shared/login`,
`shared/main-layout`, and `core/guards/auth.guard.spec.ts` all now compile under Vitest (the
Jasmine-syntax blocker recorded against `shared/login/login.component.spec.ts` on 2026-08-14/08-17 was
rewritten to `vi.spyOn(...)` on 2026-08-30 and no longer blocks anything). No file had to be excluded to
get a number — the figures above are the true, complete, unscoped total, not a scoped/partial run.

The two OneSphere-Accounts compile blockers named in this task's brief (`auth.guard.spec.ts` importing a
non-existent `AuthGuard`, `accounts-dashboard.spec.ts` importing a non-existent `AccountsDashboard`) live
in a **different Angular project** (`OneSphere-Accounts`), not in `OneSphere-Inventory`; they were not
re-verified as part of this task since it is scoped to the Inventory frontend, but they do not affect the
numbers above.

All 16 failing tests are DI-wiring gaps, not logic failures — see **Known Broken/Blocking Test Files**
below for the full breakdown by file.

## Backend Test Suite — Current Run

```
dotnet test        (Kapil_Group_ERP_API.Tests, 2026-08-30)

Passed!  - Failed: 0, Passed: 429, Skipped: 0, Total: 429, Duration: 284 ms
```

Clean, fast, fully compiling. But see **Known Broken/Blocking Test Files** — the clean number hides that
an entire controller's test file (Reports) is missing, not passing.

## Frontend Coverage by Functional Area

Business-rule coverage for transaction screens overwhelmingly lives in shared
`inventory-screen-shell.*.spec.ts` files that test the common base class (`InventoryScreenShell`) behind
every transaction screen, rather than one spec per concrete screen component. A handful of screens also
have their own concrete-component spec (e.g. `purchase-invoice.multi-attribute-columns.spec.ts`). The
counts below are a best-effort roll-up by primary subject — several shared-shell files (most notably
`inventory-screen-shell.branch-warehouse-resolution.spec.ts`, 38 cases, and `...stock-transfer.spec.ts`,
36 cases) span more than one row and are counted once, under the area they most directly exercise.

| Functional Area | Representative spec files | Approx. test cases | Notes |
|---|---|---:|---|
| **Masters** (Product/Service, Vendor, Customer, UOM, Variant, Attribute, Brand, Category, HSN/SAC Mapping, Price List, Serial/Batch Policy, Barcode Config, Substitute Products, Consumption Type, Payment Terms, Transporter, Vehicle, Work-Center, ~25 screens under `Inventory_Masters/`) | **none** | **0** | **ZERO coverage.** Not one spec file exists under `src/app/inventory/Inventory_Masters/`. |
| **Config** (Warehouse/Location Master, Branch Master, Business Segments, Tax Code Import) | none (a prior `warehouse-location-master.spec.ts` was deleted 2026-08-27 when the code it tested — `branchIdForName()`/`branchNameForId()` — was removed as part of Full Warehouse/Branch Independence) | **0** | **ZERO coverage** today, though this is a smaller area (4 screens) than Masters. |
| **Procure-to-Pay** (Purchase Requisition, RFQ, Purchase Order, GRN, Purchase Invoice, Purchase Return, Debit Note, Vendor Payment) | `purchase-invoice-attachments.component.spec.ts`, `purchase-invoice.multi-attribute-columns.spec.ts`, `inventory-screen-shell.pi-direct-qty.spec.ts`, `...pi-serial-badge.spec.ts`, `goods-receipt.no-duplicate-variant-subcell.spec.ts`, `purchase-return.no-duplicate-variant-subcell.spec.ts`, `inventory-screen-shell.debit-credit-note-invoice-ref.spec.ts` (shared with Credit Note/O2C), `payment-receipt-voucher.mode-selector/tds-auto-apply/tcs-vendor-threshold.spec.ts` | ~85 | Purchase Requisition and RFQ have no dedicated frontend spec at all (only backend controller coverage — see below). |
| **Order-to-Cash** (Sales Enquiry, Sales Quotation, Sales Order, Estimation, Proforma Invoice, Sales Invoice, Delivery Challan, Sales Return, Credit Note, Customer Receipt) | `sales-order/delivery-challan/sales-return.no-duplicate-variant-subcell.spec.ts`, `inventory-screen-shell.direct-si-dc-confirmation.spec.ts`, `...dc-reference-append.spec.ts`, `...dc-variant-options.spec.ts`, `...close-dc.spec.ts`, `...return-reference-lock.spec.ts`, `...interbranch-sale.spec.ts` (33 cases) | ~75 | Sales Enquiry, Sales Quotation, Estimation, and Proforma Invoice have no dedicated frontend spec at all. |
| **Stock Movement** (Stock Transfer, Stock Adjustment, Cycle Count, Opening Stock Entry, Opening Inventory Balance) | `inventory-screen-shell.stock-transfer.spec.ts` (36), `...branch-warehouse-resolution.spec.ts` (38), `...stock-adjustment.spec.ts` + `...stock-adjustment-branch.spec.ts` (15), `...opening-screens-merged-location.spec.ts` (10), `...active-branch-filter.spec.ts`, `...merged-location-tagging.spec.ts`, `...stock-hint-location-label.spec.ts`, `...location-defaulting.spec.ts` (19), `...product-merge.spec.ts`, `...cycle-count.spec.ts`, `...opening-stock-entry.spec.ts`, `inventory-line-product-picker.component.spec.ts` (34) | ~230+ | By far the best-covered area — this is where nearly every 2026-08-20-through-08-30 Warehouse/Branch Independence session added tests. Cycle Count itself is thin (4 cases) relative to the rest of this area. |
| **Manufacturing** (BOM Master, Production Planning, Production Entry, Production Return, Material Consumption, Material Issue for Production, Work-Center Master — ~7 screens) | **none** | **0** | **ZERO coverage.** Not one spec file exists for any Manufacturing screen. |
| **Reports** (19 registry report types: Inventory/Stock Summary, Stock Ledger, Warehouse-Wise Stock, Low Stock Alert, PO/GRN/PI/SO/DC/SI Registers, Pending Document, HSN Summary, Batch/Serial Expiry, Product Profitability, Loss Sales, Stock Valuation Comparison, MIS Report, Audit Trail) | `inventory-report-page.audit.spec.ts`, `...branch-filter.spec.ts`, `inventory-report.registry.spec.ts`, `stock-valuation-comparison.spec.ts` + its service spec, `mis-report.spec.ts` + its service spec, plus `stat-card`/`bar-chart`/`donut-chart` component specs | ~44 (report specs) + 20 (chart primitives) | Only **3 of 19** report types have a dedicated component-level spec (Audit Trail, Stock Valuation Comparison, MIS Report). The other 16 render through the generic `InventoryReportPageComponent` with only registry-shape and branch-filter-relabeling coverage — no report-specific data-mapping assertions. Loss Sales Report has backend coverage only (see below), no frontend spec. |
| **Login/Auth** | `shared/login/login.component.spec.ts` (10 cases), `core/guards/auth.guard.spec.ts` (1), `core/services/auth.service.spec.ts` (1), `core/services/Login/login.service.spec.ts` (1), `core/services/Common/common.service.spec.ts` (1), `.../company-details-service.spec.ts` (1), `core/services/Navigation/navigation.service.spec.ts` (1) | 16 | **Currently the most broken area**: all 10 `login.component.spec.ts` cases and all 4 of the `Common`/`Login`/`Navigation`-service specs fail at runtime on a `DatePipe`/`MessageService` DI gap (see below) — only `auth.guard.spec.ts` and `auth.service.spec.ts` pass. This is Inventory's own duplicate copy of the login screen; per project memory it is very likely dead code once federated under the Accounts-hosted shell, but that has never been confirmed. |
| **Main-layout/Switcher** | `shared/main-layout/main-layout.component/main-layout.component.spec.ts` | 13 | All passing — this file was fixed on 2026-08-28 (added missing `MessageService`/`DatePipe`/`provideRouter([])` providers), so it no longer carries the DI gap that `shared/login` still has. |
| **Cross-cutting shared UI** (not tied to one business area) | `payment-mode-selector.component.spec.ts` (15), `inventory-gstin-list.component.spec.ts` (10), `inventory-party-form.component.spec.ts` (7), `inventory-screen-shell.channel-partner.spec.ts` + its service spec (12), `...vendor-customer-gstins.spec.ts`, `...hsn-column.spec.ts`, `...export-icons.spec.ts`, `...mrp-toggle.spec.ts`, `...selling-below-cost.spec.ts`, `...serial-qty-cap.spec.ts`, `...product-master-return-nav.spec.ts` (12), `...reference-picker.spec.ts`, `...party-quick-add.spec.ts`, `...contact-quick-add.spec.ts` | ~90 | Solid coverage of shared quick-add/reference-picker/GSTIN plumbing used across many screens. |

## Backend Coverage by Functional Area

`Kapil_Group_ERP_API.Tests/Controllers/` holds one test file per controller. Counts below are
`[Fact]`/`[Theory]` attribute counts (a `[Theory]` with multiple `InlineData` rows runs as more than one
test case at execution time, which is why the sum of these counts is lower than the suite's total of
429).

| Functional Area | Test file | Test methods | Notes |
|---|---|---:|---|
| Masters (Payment Terms, Brand, Attribute, Product Group, Variant, Serial Policy, Batch Policy, Barcode Config, Substitute Products, Consumption Type, and more) | `InventoryMastersControllerTests.cs` | 96 | Good width — every master in this file follows the same Get/Create-invalid/Update-invalid/Update-valid density. |
| Config (Warehouses, Locations, UOM, Category, Segments, HSN/SAC, Company Details, Branches) | `InventoryConfigControllerTests.cs` | 107 | Despite the name, this file backs `InventoryConfigController`, which covers what the frontend calls both "Config" and part of "Masters" — naming doesn't line up 1:1 between the two layers. |
| Procure-to-Pay + Stock Movement (Purchase Requisition, RFQ, Purchase Order, GRN, Purchase Invoice, Stock Transfer, cancel/reference-doc lookups) | `InventoryTransactionsControllerTests.cs` | 53 | Purchase Requisition and RFQ, which have zero frontend spec coverage, are covered here at the controller layer. |
| Order-to-Cash (Estimation, Proforma Invoice, Sales Invoice, Sales Order, Sales Quotation, Available Serials, cancel) | `SalesTransactionsControllerTests.cs` | 43 | Mirrors the P2P file's density pattern. |
| **Reports** (all 16 endpoints: 13 standard reports, Stock Valuation Comparison, MIS Report, Loss Sales Report) | **none — file does not exist** | **0** | **Real regression.** `ReportsControllerTests.cs` was extensively documented in `INVENTORY_AUTOMATION_TESTS.md` as recently as the 2026-08-20 entries (29+ cases: 26 for the 13 standard endpoints, 3 for Stock Valuation Comparison, 2 for MIS Report, 2 for Loss Sales Report — some figures overlap across entries but the file unambiguously existed and was regularly run). A repo-wide search (`find ... -iname "*ReportsController*"`) confirms only the production `ReportsController.cs` remains; the test file is gone from disk. Most likely lost to churn in this shared, multi-session working tree — the same kind of silent regression the automation doc already records happening twice to `InventoryTransactionsControllerTests.cs`'s `S3UploadService` constructor arg and once to `UsersControllerTests.cs`. |
| Platform / cross-cutting (not Inventory-specific, shared infra) | `ModulesControllerTests.cs` (13), `PermissionsControllerTests.cs` (12), `TaxCodesControllerTests.cs` (13), `UsersControllerTests.cs` (19), `MultiTenantControllerBaseTests.cs` (15), `Security/ControllerAuthorizationAttributeTests.cs` (9), `Security/MultiTenantAuthorizationFiltersTests.cs` (18), `JwtConfigTests.cs` (13) | 112 | Auth/tenancy/JWT plumbing shared by every module, not scoped to Inventory. |
| Stored-procedure / SQL layer | none | 0 | No automated test harness exists for the Postgres stored-procedure layer at all (migrations 048–174+), which is where the actual stock/tax/GL arithmetic lives. Every SQL-level verification in the automation doc's history is a manual, often rolled-back `psql` script run during that session — real, but not repeatable/regression-checked by CI. |

## Known Broken/Blocking Test Files

None of the following block a full `ng test`/`dotnet test` run from completing — both suites run to
completion today. They are listed because they represent real, standing gaps a future session could
mistake for something else.

| File | Failure mode | Scope / tied to |
|---|---|---|
| `OneSphere-Inventory/src/app/app.spec.ts` (2 cases) | `NG0201: No provider found for MessageService` — the root standalone `App` component's test module doesn't provide `MessageService`. | Pre-existing, unrelated to any specific feature. Note this is a *different* error than the historically-documented one (previously `DatePipe`); the DI gap has shifted shape at some point without anyone re-diagnosing it. |
| `OneSphere-Inventory/src/app/shared/login/login.component.spec.ts` (10 cases) | `NG0201: No provider found for DatePipe` via `_CompanyDetailsService -> _CommonService -> DatePipe`. | Pre-existing DI-wiring gap in `CommonService`'s constructor chain, unrelated to this file's actual login/warehouse-picker logic (which the Jasmine-to-vitest rewrite on 2026-08-30 already fixed so it *compiles*). This is Inventory's own duplicate copy of the login screen — the real, served login lives in `OneSphere-Accounts`; per project memory this Inventory copy is likely dead code once federated, unconfirmed. |
| `OneSphere-Inventory/src/app/core/services/Common/common.service.spec.ts` (1) | Same `DatePipe` DI gap — `CommonService`'s constructor injects `DatePipe` and no test in this file's module provides it. | Pre-existing, root cause of the next 3 rows too (all downstream of `CommonService`). |
| `OneSphere-Inventory/src/app/core/services/Common/company-details-service.spec.ts` (1) | Same `DatePipe` DI gap, via `CompanyDetailsService -> CommonService`. | Same root cause. |
| `OneSphere-Inventory/src/app/core/services/Login/login.service.spec.ts` (1) | Same `DatePipe` DI gap, via `LoginService -> CommonService`. | Same root cause. |
| `OneSphere-Inventory/src/app/core/services/Navigation/navigation.service.spec.ts` (1) | Same `DatePipe` DI gap, via `NavigationService -> CommonService`. | Same root cause. |
| `OneSphere-Accounts/src/app/core/guards/auth.guard.spec.ts` | TypeScript compile error — imports a non-existent `AuthGuard` export (the real export is the functional guard `authGuard`). | **Not in this repo** — lives in the separate `OneSphere-Accounts` project. Named in this task's brief as a known blocker; out of scope for an Inventory-only run and not re-verified here. |
| `OneSphere-Accounts/src/app/core/services/accounts/accounts-dashboard.spec.ts` | TypeScript compile error — imports a non-existent `AccountsDashboard` export. | Same as above — Accounts project, not Inventory. |
| `Kapil_Group_ERP_API.Tests/Controllers/ReportsControllerTests.cs` | **File does not exist.** | See Backend Coverage table above — this is a coverage gap, not a failing test, but it is the single most consequential backend testing gap right now: 16 live, actively-changing report endpoints with no regression net. |

A fix for the 5 remaining `DatePipe`/`MessageService` cases (6 rows above, excluding the 2 Accounts-project
rows and the missing Reports file) is small in scope: add `DatePipe` and `MessageService` to each failing
spec's `TestBed.configureTestingModule({ providers: [...] })`, the same fix already applied to
`main-layout.component.spec.ts` on 2026-08-28.

## Notable Recent Test-Driven Catches

A few examples from the automation doc's history where writing or running a test caught a real bug,
not just documented one after the fact:

- **2026-08-18** — Verifying the new Stock Valuation Comparison report against live data caught
  `fn_post_pi_stock` (a self-heal-guarded function) silently reverted to a pre-fix body with no cost-layer
  call, meaning every Purchase Invoice posted system-wide in that window created stock with no matching
  cost layer.
- **2026-08-20** — Live verification of the "no location at all" refusal rule found Delivery Challan
  could post a DC with `from_warehouse_id = NULL` and drain 3 units straight out of the shared "Unassigned"
  stock pool — reproduced live, then fixed and refused.
- **2026-08-26** — A new regression spec for the Product Picker rollout caught a real UI defect the
  moment it was written: 5 transaction screens (Purchase Return, Goods Receipt, Sales Order, Delivery
  Challan, Sales Return) had a leftover duplicate Variant/Attribute sub-row rendering underneath the new
  picker trigger, doubling the row height and confusing users about which control actually mattered.
- **2026-08-28** — A newly-added spec's own broken test fixture (`transaction()` helper never setting a
  `fields` array) turned out to be masking that 14 of 19 cases in
  `inventory-screen-shell.location-defaulting.spec.ts` had been silently failing since the file was
  created — caught only because a later session tried to extend the same map and the numbers didn't add up.
- **2026-08-28** — Writing referential-identity tests (`toBe()`, not `toEqual()`) for Stock Transfer's
  location picker caught a real "flickery, hard to select" UX bug: a plain method rebuilding a fresh array
  on every call was defeating `ng-select`'s change detection, closing the dropdown on every keystroke.

## Recommendations

- **Fix the 6 broken frontend spec files first** (`app.spec.ts`, `shared/login/login.component.spec.ts`,
  and the 4 `Common`/`Login`/`Navigation` service specs) — the fix is well-understood and small
  (add `DatePipe`/`MessageService` to each `TestBed` module, matching the fix already applied to
  `main-layout.component.spec.ts`), and it would take the frontend suite from 97.1% to effectively 100%
  passing with no new test-writing required.
- **Rebuild `ReportsControllerTests.cs`.** This is the most consequential gap found while producing this
  report: 16 live, frequently-changing report endpoints (several added or modified as recently as
  2026-08-18/20) currently have zero backend regression coverage, after previously having 29+ documented
  cases. Given this codebase's history of silent test-file regressions in a shared working tree (this is
  the third one recorded, after two separate `InventoryTransactionsControllerTests.cs`/`UsersControllerTests.cs`
  incidents), this file should be restored and someone should look into why test files keep disappearing
  or reverting in this shared checkout.
- **Zero coverage on Manufacturing** (BOM Master, Production Planning/Entry/Return, Material
  Consumption, Material Issue for Production, Work-Center Master) and **Masters** (~25 screens) is the
  largest structural gap on the frontend. Masters screens are mostly repetitive CRUD, so a small number of
  representative specs (one deeply tested master, e.g. Product/Service Master, plus a shared-pattern test
  for the generic add/edit/list flow the rest follow) would likely catch most regressions cheaply.
- **Decide whether Inventory's own `shared/login`/`shared/main-layout` copies are dead code.** The
  automation doc and project memory both flag this as "very likely dead but never confirmed" going back to
  2026-08-17. If confirmed dead, `shared/login/login.component.spec.ts`'s 10 broken cases can simply be
  deleted along with the component; if not dead, they need the same DI-provider fix as everything else on
  this list plus an explanation for why this copy still needs to exist independently of Accounts'.
- **No SQL/stored-procedure test harness exists.** This is a known, long-standing gap (called out in the
  automation doc since 2026-08-14) and the actual stock/tax/GL arithmetic lives entirely in Postgres
  functions and procedures. Every verification of that layer today is a manual, one-off `psql` script run
  during whatever session touched it — real but not regression-checked. Standing this up (even a minimal
  containerized-Postgres harness for the highest-risk functions — the ~10 self-heal-guarded posting
  functions) would close the single largest correctness-risk gap in this report, bigger than any frontend
  gap above.
- **Only 3 of 19 report types have dedicated frontend assertions.** The other 16 report definitions render
  through the generic `InventoryReportPageComponent` with only structural (registry-shape,
  branch-filter-relabeling) coverage — no test currently asserts that any of those 16 reports' actual data
  mapping is correct.
