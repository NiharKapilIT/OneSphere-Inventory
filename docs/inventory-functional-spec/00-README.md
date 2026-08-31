# Inventory Module — Functional & Data-Model Documentation Set

Produced 2026-08-28 through 2026-08-31 by walking the live frontend configuration, the live shared screen shell, the live C# services, and the actual latest stored-procedure definitions in the Postgres migrations — not from a spec, not from memory of intended design. Every claim in these documents is traceable to a specific file, line, or migration number. Where something looks built but isn't, that is stated plainly; this set exists to make the *next* planning decision (a migration, a sprint, a hiring conversation) accurate, not to make the current state look better than it is.

## How to read this set

| File | Covers |
|---|---|
| [01-business-flow-overview.md](./01-business-flow-overview.md) | The whole module end-to-end, one page, for orientation. Start here. |
| [02-masters-and-setup.md](./02-masters-and-setup.md) | All 27 master/config screens — Branch, Warehouse, Product, Category, Vendor, Customer, UOM, HSN/SAC, and 20 more. |
| [03-procure-to-pay.md](./03-procure-to-pay.md) | Purchase Requisition → RFQ → PO → GRN → Purchase Invoice → Purchase Return/Debit Note → Vendor Payment. |
| [04-order-to-cash.md](./04-order-to-cash.md) | Estimation → Quotation → Sales Order → Delivery Challan → Sales Invoice → Sales Return/Credit Note → Customer Receipt, plus POS. |
| [05-stock-movement-and-manufacturing.md](./05-stock-movement-and-manufacturing.md) | Opening Balance, Stock Transfer, Stock Adjustment, Cycle Count, and the 8-screen Manufacturing group. |
| [06-reports-and-dashboards.md](./06-reports-and-dashboards.md) | Every report and dashboard, and what data actually backs each one. |
| [07-accounting-integration.md](./07-accounting-integration.md) | How (and how incompletely) Inventory transactions reach the Accounts schema. |
| [08-automation-and-unit-test-report.md](./08-automation-and-unit-test-report.md) | Current automated test coverage, by area, with known gaps. |

Every transaction/master section in files 02–05 follows the same template: business purpose, predecessor/successor documents, status lifecycle, key business rules, accounting/GL impact, frontend location, backend tables, backend stored procedures, and known gaps. If you only need one thing about one screen, that section is self-contained — you don't need to read the whole file.

## If you read nothing else: the findings that matter most

These surfaced independently across five different research passes and are corroborated by direct code/SQL evidence in the linked documents — not a single reviewer's opinion.

**1. Four live, actively-used screens have a permanently empty "Existing Saved Records" grid.** Stock Transfer, Stock Adjustment, Opening Stock Entry, and Cycle Count all save correctly to the database, but `mapToGridRows()` in the shared frontend shell has no case for any of the four, so their saved-records lists always render empty regardless of how much real data exists. Cycle Count is at least hidden from the sidebar; the other three are live and being used today. → [05-stock-movement-and-manufacturing.md](./05-stock-movement-and-manufacturing.md). This is a small, well-understood fix (one `case` block per screen, following the pattern every other transaction screen already uses) with an outsized user-facing impact.

**2. A meaningful fraction of the screen catalog is UI-only, with no backend at all**, despite convincing `outputImpact`/`dependsOn` copy that reads as if the feature is real:
- All 8 Manufacturing screens (Production Planning through Gate Pass) — see [05](./05-stock-movement-and-manufacturing.md).
- Sales Enquiry and POS Billing — see [04](./04-order-to-cash.md).
- 6 Masters: Vehicle Master, Price List Master, BOM Master, Work Center Master, Approval Workflow Master, Transporter Master — see [02](./02-masters-and-setup.md).
- Opening Inventory Balance (a dead near-duplicate of the real Opening Stock Entry) — see [05](./05-stock-movement-and-manufacturing.md).

None of this is hidden maliciously — most are honestly `disabled: true` in the sidebar — but anyone scoping future work from the screen list alone, without checking this document set, would overestimate how much already exists.

**3. Accounting integration has never had genuine per-branch books, with one new exception.** Every existing GL posting (Purchase Invoice, Sales Invoice, Sales Return's reversal, Vendor Payment) hardcodes a single fake `company_code='COMP1', branch_code='BNCH1'` regardless of which real branch the transaction belongs to — this is true across the whole module, not one screen. The lone exception is Stock Transfer's brand-new posting (2026-08-28), which is genuinely branch/warehouse-aware and is the template to follow, not the pattern to copy from Purchase/Sales Invoice. Full detail: [07-accounting-integration.md](./07-accounting-integration.md).

**4. Credit Note never posts to the ledger, despite being the module's nominal "settlement document."** The actual receivable reduction happens earlier, inside Sales Return's own reversal posting — Credit Note is documentary-only. → [04-order-to-cash.md](./04-order-to-cash.md).

**5. Several reversal/cancellation paths are less correct than the forward postings they undo**, and in one case regressed silently:
- GRN's "PO Reference" picker is broken today — a stored procedure rewrite years after the original feature silently dropped the PO-reference branch, so GRN cannot actually be created against a PO through the UI anymore. → [03-procure-to-pay.md](./03-procure-to-pay.md).
- Sales Return's and Purchase Return's GL reversals never received the interstate/IGST logic their forward postings got — an interstate return posts the wrong tax heads. → [03](./03-procure-to-pay.md), [04](./04-order-to-cash.md).
- Delivery Challan's Close/Cancel stock-reversal paths ignore `branch_id` entirely (branch-only DCs risk touching the wrong branch's stock on close/cancel), even though the forward dispatch was made branch-aware. → [04-order-to-cash.md](./04-order-to-cash.md).
- Cancelling a Vendor Payment never reverses its GL entry at all — worse than the other two, which at least attempt (imperfectly) to reverse. → [03-procure-to-pay.md](./03-procure-to-pay.md).

**6. Report-level Branch/Warehouse filtering is decorative end-to-end.** Several report stored procedures do support real location filtering, but the .NET controllers never forward the parameter from the UI — so every report's Warehouse/Branch picker looks functional but does nothing, system-wide. → [06-reports-and-dashboards.md](./06-reports-and-dashboards.md).

**7. Test coverage looks stronger than it is in one specific place.** The full backend suite reports 429/429 passing, but `ReportsControllerTests.cs` — which used to cover all 16 endpoints of `ReportsController` — has been deleted from the repository entirely, so that "429/429" silently excludes an entire controller rather than proving it works. Frontend sits at 545/561 (16 known, pre-existing DI-configuration failures, not logic bugs). → [08-automation-and-unit-test-report.md](./08-automation-and-unit-test-report.md).

## Suggested prioritization for a next planning pass

Roughly in order of effort-to-impact, based on everything above:

1. **Fix `mapToGridRows()` for the 4 affected screens** (finding #1) — small, mechanical, immediately visible to real users.
2. **Restore Reports test coverage** (finding #7) — before anything else touches `ReportsController`, since there's currently no safety net.
3. **Fix GRN's broken PO-reference picker** (finding #5) — a real regression blocking a documented, previously-working flow.
4. **Decide the fate of the fully-stubbed screens** (finding #2) — either commit to building them or remove them from the sidebar/route table so they stop looking like backlog items that are "almost done."
5. **Extend genuine per-branch accounting** (finding #3) beyond Stock Transfer to Purchase/Sales Invoice, using the new pattern as the template — the highest-effort item here, but the one most likely to matter to an auditor or a multi-branch P&L request.
6. **Wire report-level location filtering through the controllers** (finding #6) and **decide whether Credit Note should actually post to the ledger** (finding #4) — both moderate effort, clear business value.
