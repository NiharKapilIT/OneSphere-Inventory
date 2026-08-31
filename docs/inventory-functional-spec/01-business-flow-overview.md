# Inventory Module — End-to-End Business Flow Overview

Author's note: this document set was produced 2026-08-28 by walking the actual live frontend configuration and backend stored procedures/migrations — not from a spec or from memory of how the module was originally designed. Where something looks incomplete or contradictory, that's reported honestly rather than smoothed over, because the stated purpose of this documentation is to make the *next* migration/feature decision easier, not to present a polished facade.

## 1. What this module is

The Inventory module is the operational core of the Kapil Group ERP (OneSphere): everything from setting up a product catalog, through procurement and sales, to physical stock movement, manufacturing, and the reporting that tells a business owner what's actually happening. It shares one Postgres database and one .NET backend with the Accounts (finance) and HRMS modules, and is served to the browser federated inside the Accounts Angular application (Inventory does not run standalone in production).

## 2. The master-data foundation

Before any transaction can be posted, a set of master records has to exist. The full breakdown of each is in [02-masters-and-setup.md](./02-masters-and-setup.md), but the load-bearing ones, conceptually:

- **Branch** and **Warehouse** — the two location types everything else is scoped by. As of the "Full Warehouse/Branch Independence" project (culminating in migration 167), these are **independent peer concepts**, not parent/child. A warehouse's old `branch_id` link is frozen/legacy. A transaction can post against a branch directly, a warehouse directly, or (for Stock Transfer) one of each on either side — there is no requirement to resolve a warehouse back to "the branch it belongs to." This single architectural decision ripples through nearly every transaction screen, the login/session-switching UI, and (as of the most recent work) the accounting integration.
- **Product / Service Master**, with **Category**, **Brand**, **Product Group**, **Attribute**, **Variant**, **UOM**, **HSN/SAC**, **Batch/Lot Policy**, and **Serial Number Policy** all feeding it — this is what every purchase and sales line item is built from.
- **Vendor Master** / **Customer Master** — the two party types, sharing a common underlying contact/party form.
- **Business Segment** — a cross-cutting dimension (e.g. Electronics / Restaurant / Project) that most transactions and reports can be filtered or scoped by.
- **Payment Terms**, **Price List**, **Tax Code** setup — commercial terms that transactions default from.

## 3. The three transactional flows

### 3.1 Procure-to-Pay (buying)
Purchase Requisition → RFQ → Purchase Order → Goods Receipt (physical stock in) → Purchase Invoice (financial liability) → Purchase Return / Debit Note (reversal) → Vendor Payment (settlement). Full detail: [03-procure-to-pay.md](./03-procure-to-pay.md).

### 3.2 Order-to-Cash (selling)
Estimation/Sales Enquiry → Sales Quotation → Sales Order → Delivery Challan (physical stock out) → Sales Invoice (financial receivable) → Sales Return / Credit Note (reversal) → Customer Receipt (settlement), with POS Billing as a parallel fast-checkout path for over-the-counter sales. Full detail: [04-order-to-cash.md](./04-order-to-cash.md).

### 3.3 Stock movement and manufacturing
Opening Inventory Balance / Opening Stock Entry seed the ledger before live operations begin. Stock Transfer moves value between any two locations (branch or warehouse, either side, any combination). Stock Adjustment corrects physical-vs-book discrepancies via an approval workflow rather than a draft/posted lifecycle. Cycle Count is currently non-functional (disabled in the sidebar — its records grid has a real, confirmed defect). Manufacturing (BOM → Production Planning → Material Issue → Production Entry/Return, Material Consumption, plus logistics-adjacent Internal Issue Slip / Shipment Entry / Gate Pass) consumes and produces stock outside the buy/sell cycle. Full detail: [05-stock-movement-and-manufacturing.md](./05-stock-movement-and-manufacturing.md).

## 4. Costing — how stock value is actually computed

Underlying every stock-reducing transaction is a real costing engine (item 33 in this project's history, migration 139 and successors): `inventory.inv_stock_cost_layers` holds discrete cost layers per location, and `fn_add_stock_cost_layer`/`fn_consume_stock_cost_layers` implement FIFO, LIFO, or Weighted-Average consumption depending on configuration. This is not a placeholder — GRN/Purchase Invoice add layers, Sales Invoice/Delivery Challan/Stock Transfer/Stock Adjustment consume them, and the value consumed is what flows into both stock valuation reports and (as of the newest work) accounting postings.

## 5. Accounting integration — two very different states of maturity

This is important enough to warrant its own document: [07-accounting-integration.md](./07-accounting-integration.md). In short: Purchase Invoice and Sales Invoice have posted real journal entries into the Accounts schema for a long time, but that integration **hardcodes a single company/branch identity** (`'COMP1'`/`'BNCH1'`) regardless of which real branch or warehouse the transaction belongs to — meaning the accounting side has never actually had separate per-branch books, despite the ledger table having a `branch_code` column. Stock Transfer's brand-new accounting integration (migration 174, 2026-08-28) is the first posting path in this system that is genuinely branch/warehouse-aware, and it deliberately does not touch or fix GRN/PI's pre-existing hardcoding — that remains a known, flagged gap for a future migration to address.

## 6. Reporting

Stock Availability, Stock Ledger, Stock Valuation Comparison, MIS Report (admin-only), Loss/Sales analysis, HSN/SAC compliance reporting, and the Inventory Dashboard all sit on top of the transactional and costing data above. Full detail: [06-reports-and-dashboards.md](./06-reports-and-dashboards.md).

## 7. Multi-branch/warehouse session model

A logged-in user has an "active" Branch and/or Warehouse for their session (stored on the refresh token and mirrored into `sessionStorage`/JWT claims), set at login and changeable via a topbar switcher without logging out. Since 2026-08-28, this is a single merged "Warehouse / Branch" picker everywhere it appears (login, switcher, and every transaction screen's own location field) rather than two separate mandatory dropdowns — reflecting the same independence principle as section 2. As of the same date, per-user **warehouse access** is a real, enforced permission (mirroring the pre-existing per-user branch access), and every transaction screen's "Existing Saved Records" list is filtered to the session's active branch/warehouse by default.

## 8. How to use this document set

- [02-masters-and-setup.md](./02-masters-and-setup.md) — every master/config screen, its tables, and its consumers.
- [03-procure-to-pay.md](./03-procure-to-pay.md) — buying side, screen-by-screen.
- [04-order-to-cash.md](./04-order-to-cash.md) — selling side, screen-by-screen.
- [05-stock-movement-and-manufacturing.md](./05-stock-movement-and-manufacturing.md) — stock movement and manufacturing, screen-by-screen.
- [06-reports-and-dashboards.md](./06-reports-and-dashboards.md) — every report/dashboard and its real data source.
- [07-accounting-integration.md](./07-accounting-integration.md) — how (and how incompletely) Inventory transactions reach the Accounts schema.
- [08-automation-and-unit-test-report.md](./08-automation-and-unit-test-report.md) — current automated test coverage, by area, with known gaps.

Every screen-level section in this set follows the same template: business purpose, predecessor/successor documents, status lifecycle, key business rules, accounting/GL impact, frontend location, backend tables, backend stored procedures, and known gaps. Where a gap is flagged, treat it as a real finding to plan around, not documentation noise.
