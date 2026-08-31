# Procure-to-Pay

Scope: Purchase Requisition -> Request for Quotation (RFQ) -> Purchase Order (PO) -> Goods Receipt Note (GRN) -> Purchase Invoice (PI) -> Purchase Return / Debit Note -> Vendor Payment.

Frontend root: `d:\ERP-AIH\OneSphere-Inventory\src\app\inventory\` (configs in `Inventory_Shared\inventory-screen.model.ts`, generic rendering/save engine in `Inventory_Shared\inventory-screen-shell\inventory-screen-shell.ts`).
Backend root: `d:\ERP-AIH\GLOBAL_ACCOUNTS_LATEST\Kapil_Group_ERP_API\` (C# entry point `MultiTenancy\Services\InventoryTransactionsDataService.cs`, SQL in `Database\Migrations\inventory\*.sql`).

---

## The business flow, end to end

**Trigger.** A department raises a **Purchase Requisition (PR)** — an internal ask ("we need 5 LED displays") with no vendor or price attached yet. A PR only becomes usable downstream once someone sets its status to `approved` — every reference-picker query that feeds the next stage (`inventory.sp_get_purchase_docs_for_ref`) filters PRs on `status = 'approved'`. There is no dedicated approval workflow engine behind this: "approval" is just the PR's own `status` field being set to `approved` through the same save call used for everything else (`inventory.sp_save_purchase_requisition`) — the config's own checklist admits this ("Approval Workflow Master: Pending Setup").

**PR -> RFQ.** Procurement picks one or more approved PRs and raises a **Request for Quotation** to one or more vendors, to compare price/lead-time before committing. RFQ is optional in practice — `requestForQuotationConfig`'s `prReference` field is a plain text field, and `inv_request_for_quotations.pr_id`/`pr_number` are nullable, so a "direct" RFQ with no PR at all is a normal, supported case (mirrors GRN/PI's own "Direct" pattern). Once a vendor's quote is accepted, the RFQ's `status` is set to `accepted`, which is the single gate `sp_get_purchase_docs_for_ref`'s `WHEN 'RFQ'` branch uses to decide whether that RFQ is offered as a reference when raising a PO.

**RFQ -> PO.** A **Purchase Order** is raised against an accepted RFQ (`rfq_id`/`rfq_number` carried on `inv_purchase_orders`), or directly with no RFQ — `inv_purchase_orders.rfq_id` is nullable and the PO screen's own onboarding checklist doesn't require one. `inv_purchase_orders` has no status gate of its own worth mentioning: any PO with `status <> 'cancelled'` is considered a valid document (confirmed live in `055_grn_po_reference.sql`'s `WHEN 'PO'` branch), because — per that migration's own comment — "`inv_purchase_orders` has no meaningful approval-status workflow of its own... a trivial pass-through component with no approve action."

**PO -> GRN, and the "direct GRN" path.** A **Goods Receipt Note** records what physically arrived at a warehouse/branch, with separate Received Qty and Accepted Qty per line (the difference is a rejection — captured in a `rejected_qty` column, but there is no actual quality-hold record, status, or workflow behind it; it is stored data only, despite the config text's claim that "Rejected qty triggers quality hold"). A GRN can be raised against a PO, or entered directly with no PO reference at all (`inv_goods_receipts.po_id`/`po_number` are nullable) — this is the normal "direct GRN" path for walk-in / non-PO purchases.
**Known, currently-live gap in this exact chain:** the GRN screen's "PO Reference" picker is wired to call `inventory.sp_get_purchase_docs_for_ref` with `doc_type = 'PO'` (see `purchaseReferenceType()` in `inventory-screen-shell.ts`, which maps `goodsReceipt -> 'PO'`), and the C# `GetRefDocsAsync` routes any type other than `SO/SI/DC/SALESRETURN` to that same purchase-side procedure. A `WHEN 'PO'` branch was added to `sp_get_purchase_docs_for_ref` in `055_grn_po_reference.sql` — but every later full-procedure `CREATE OR REPLACE` of that same procedure (`067`, `069`, `086`, `113`, `114`, `119` — the last of which is the current live definition) rewrote the whole `CASE` statement and **silently dropped the `WHEN 'PO'` branch**, with no later migration ever restoring it. Today, opening the "PO Reference" dropdown on GRN always returns `[]` — a GRN can only be raised as fully direct (or by a PO number typed as free text, which the frontend/DB will still happily store in `po_id`/`po_number`, but there is no live picker UI path to select one). This is a real, confirmed regression, not a guess — verified by grepping every `CREATE OR REPLACE PROCEDURE inventory.sp_get_purchase_docs_for_ref` across the migration history for `WHEN 'PO'`.
Posting a GRN (`status = 'posted'`) calls `inventory.fn_post_grn_stock`, which increments `inv_stock_balance` at the GRN's warehouse/branch. GRN captures no rate at all on its own items in a way that feeds costing — no stock cost layer is created at GRN-post time; that only happens once a Purchase Invoice with a rate exists (see below).

**GRN -> PI, and the "direct PI" path (yes, PI can skip GRN).** A **Purchase Invoice** books the vendor's financial bill. It can be raised **with** a GRN reference (`inv_purchase_invoices.grn_id` set) or entirely **without** one (`grn_id IS NULL`) — both are first-class, fully supported paths, and this is the single most important branch point in the whole flow:
- **GRN-linked PI**: stock was already moved at GRN-post time, so posting this PI does **not** call the stock-posting function again — it only flips the linked GRN's status to `invoiced` (blocking that GRN from being offered as a reference to any other PI — see `sp_get_purchase_docs_for_ref`'s `WHEN 'GRN'` branch, which explicitly excludes any GRN already linked to a non-cancelled PI) and creates the stock cost layer for costing purposes (the GRN itself had no rate to build a layer from).
- **Direct PI (no GRN)**: posting this PI calls `inventory.fn_post_pi_stock` directly, which both increments `inv_stock_balance` **and** adds the stock cost layer in the same step, at the PI's own rate.
Only a **posted** PI is eligible to be referenced downstream (`sp_get_purchase_docs_for_ref`'s `WHEN 'PI'` branch filters on `status = 'posted'`, and further hides any PI line whose full quantity has already been returned via a Purchase Return, converting UOMs to base units first so an alternate-UOM return line — e.g. returning in "Numbers" against a line invoiced in "Boxes" — is compared correctly).

**PI -> Purchase Return, or a direct return.** A **Purchase Return** reverses stock for goods rejected/returned to the vendor. It can reference a posted PI (`pi_id`), or be entered fully direct with no PI at all. Posting it calls `inventory.fn_post_purchase_return_stock`, which decrements `inv_stock_balance` and consumes stock cost layers (FIFO/LIFO/Weighted-Avg per the item's valuation method) at the same warehouse/branch the original receipt used.

**Purchase Return -> Debit Note, or a direct debit note.** A **Debit Note** is the pure paperwork/financial-settlement record for a Purchase Return (or a standalone vendor price adjustment with no return at all) — it moves **zero stock** and, as of today, posts **nothing to Accounts** either (see its own section below). It exists purely so the return's monetary value has a document trail vendors and accounts teams can point to.

**Settling it all: Vendor Payment.** Vendor Payment (and its sibling, Customer Receipt) is **not** part of the generic Purchase-transaction pipeline the other seven screens share — it is a separate, bespoke screen/component (`payment-receipt-voucher.ts`, routed at `/inventory/.../vendor-payment`) with its own service (`payments.service.ts`) and its own backend procedures (`inventory.sp_save_payment_voucher`, posting to `accounts.sp_post_payment_voucher`). It lets a user allocate a payment across any mix of open Purchase Invoices **and** Debit Notes (allocation types: `purchase_invoice`, `sales_invoice`, `debit_note`, `credit_note`), re-validates every allocation against the invoice's live outstanding balance server-side, and enforces a flat ₹20,000 cash-mode cap per transaction plus optional TDS/TCS capture. It does **not** write anything back onto the Purchase Invoice's own `status` column — a fully paid PI still shows `status = 'posted'` forever (see Known Gaps below).

### Reference-chaining logic (the real rules, from `inventory.sp_get_purchase_docs_for_ref`)

Every "pick a reference document" dropdown on the purchase side calls this one procedure (`Database\Migrations\inventory\119_ref_picker_returned_qty_uom_conversion.sql` holds the current live `CREATE OR REPLACE` — it has been redefined ten times since `015_purchase_transactions_procedures.sql`; 119 is the latest and the one actually running). `purchaseReferenceType(key)` in `inventory-screen-shell.ts` maps each screen to the `doc_type` it asks for:

| Screen | Asks for `doc_type` | Real filter applied |
|---|---|---|
| Request for Quotation | `PR` | `status = 'approved'` |
| Purchase Order | `RFQ` | `status = 'accepted'` |
| Goods Receipt | `PO` | **broken — no branch exists in the live procedure, always returns `[]`** (see above) |
| Purchase Invoice | `GRN` | `status = 'posted'` AND not already linked to a non-cancelled PI |
| Purchase Return | `PI` | `status = 'posted'` AND has unreturned quantity remaining (UOM-normalized to base units before comparing) |
| Debit Note | `PURCHASERETURN` | `status IN ('draft','posted')` |

The C# side (`InventoryTransactionsDataService.GetRefDocsAsync`) routes `SO`/`SI`/`DC`/`SALESRETURN` to the sales-side sibling `sp_get_sales_docs_for_ref` and everything else (including the broken `PO`) to this purchase-side procedure.

### What's optional vs. mandatory, at a glance

| Step | Can be skipped? | Consequence of skipping |
|---|---|---|
| Purchase Requisition | Yes | RFQ/PO simply has no PR reference; no downstream effect |
| RFQ | Yes | PO raised directly; no vendor-comparison trail |
| Purchase Order | Yes | GRN/PI raised direct — but see the PO reference-picker bug above, which means GRN effectively **cannot** reference a PO through the UI today regardless of intent |
| GRN | Yes | PI raised direct — stock posts at PI time instead of GRN time |
| Purchase Invoice | **No** — every purchase eventually needs one to book the payable | — |
| Purchase Return | Yes | Only needed when goods are actually returned |
| Debit Note | Yes | Only needed to give the return/adjustment a financial-document trail; has no stock or GL effect either way |
| Vendor Payment | Effectively required to actually clear the payable, but nothing else in the chain depends on it existing |

---

## Purchase Requisition (PR)

**Business purpose:** Lets a department (Production, Kitchen, IT, Maintenance, etc.) formally request items/services be procured, before any vendor or price is known, so procurement has a documented, approvable ask to act on.

**Predecessor / successor documents:** No predecessor. Successor: an approved PR can be picked as the `PR` reference on a Request for Quotation (`sp_get_purchase_docs_for_ref`, `WHEN 'PR'`, filtered to `status = 'approved'`).

**Status lifecycle:** `draft` -> `approved` (unlocks it for RFQ reference) / `rejected` / `cancelled`. There is no dedicated approve/reject stored procedure — status is just one more field written by `inventory.sp_save_purchase_requisition` on every save, so "approval" is really just editing the record's status. `sp_cancel_purchase_doc`'s `WHEN 'PR'` branch refuses to cancel a PR whose status is already `approved` or `closed`.

**Key business rules:** Header requires branch, department, requested-by, priority, required date. Items require product + UOM + requested qty (no rate validation — PR is a request, not a commitment). No stock or accounting impact of any kind — it is purely a request record. Branch/Warehouse independence: PR's `branch` field is a plain `global.branches` picker used only to record *which organizational branch is asking* — it is not part of the "Full Warehouse/Branch Independence" merged Warehouse/Branch stock-location picker family (`goodsReceipt`, `purchaseInvoice`, `deliveryChallan`, `purchaseReturn`, `salesInvoice`, `salesReturn`, `openingStockEntry`, `stockAdjustment` — confirmed via `mergedLocationScreenKeys`/`stockLocationScreenKeys` in `inventory-screen-shell.ts`). PR never posts stock, so the whole branch-vs-warehouse stock-posting question doesn't apply to it.

**Accounting/GL impact:** None. No call into the `accounts` schema anywhere in `SavePurchaseRequisitionAsync`.

**Frontend:** config key `purchaseRequisition` (`purchaseRequisitionConfig`, `inventory-screen.model.ts:1664`); rendered by the generic `Inventory_Shared\inventory-screen-shell\inventory-screen-shell.ts` (no bespoke component — `isPurchaseTransactionKey()` includes it).

**Backend — tables:**
- `inventory.inv_purchase_requisitions` — header: `pr_number`, `pr_date`, `segment_id`, `branch_id`, `department`, `requested_by`, `priority`, `required_by`, `status`, `remarks`.
- `inventory.inv_pr_items` — lines: `product_id/name/code`, `variant_id/name`, `attribute_id/name/value`, `uom_id/name`, `required_qty`, `estimated_rate`, `remarks`.

**Backend — stored procedures:**
- `inventory.sp_save_purchase_requisition` (latest body: `026_attribute_transaction_stock_tracking.sql`) — upsert header + items, generates `PR-<segment>-<YY>-#####` numbering.
- `inventory.sp_get_purchase_requisitions` — list/filter by status + segment.
- `inventory.sp_get_purchase_docs_for_ref` `WHEN 'PR'` — feeds the RFQ reference picker.
- `inventory.sp_cancel_purchase_doc` `WHEN 'PR'` — status-only cancel, blocked once approved/closed.

**Known gaps or flags:** No real approval workflow (the config's own checklist admits "Approval Workflow Master: Pending Setup") — approval is indistinguishable from any other field edit. Fully wired end-to-end otherwise (real C# method + SP, present in `isApiWired()`/`loadApiRecords()`/the payload-build switch) — **not** a stub.

---

## Request for Quotation (RFQ)

**Business purpose:** Solicits and records competing vendor quotes for the same requirement so procurement can compare price/lead-time/payment-terms before committing to a Purchase Order.

**Predecessor / successor documents:** Optionally created from an approved PR (`pr_id`/`pr_number`, nullable — a direct RFQ with no PR is normal). Successor: an accepted RFQ can be picked as the `RFQ` reference when raising a Purchase Order (`sp_get_purchase_docs_for_ref`, `WHEN 'RFQ'`, filtered to `status = 'accepted'`).

**Status lifecycle:** `draft` -> `Sent` -> `Response Received` -> `Accepted` -> `Closed` (per the config's own status options), with `cancelled` available via `sp_cancel_purchase_doc`. Only `accepted` unlocks the RFQ as a PO reference; `sp_cancel_purchase_doc`'s `WHEN 'RFQ'` branch refuses to cancel an already-`accepted` RFQ.

**Key business rules:** Supports a vendor-comparison workflow — `inv_request_for_quotations` carries `quality_score`, `price_weight`, `quality_weight`, `lead_time_weight`, `payment_terms_weight`, `negotiation_notes`, `selected_for_po` (added in `036_rfq_lifecycle_evaluation_po_flow.sql`) for scoring multiple vendor responses against the same requirement (grouped by `rfq_group_number`). Items carry both `target_rate` (what we hoped to pay) and `vendor_rate` (what the vendor quoted), plus a GST breakdown (`gst_inclusive`, `cgst_rate`/`sgst_rate`/`igst_rate`). No stock or inventory impact — RFQ never moves stock. Not part of the merged Warehouse/Branch picker family; its `deliveryLocation` field is a plain Warehouse-only picker (`INVENTORY_OPTIONS.locations`), so a branch-only pick (no linked warehouse) is not a concept this screen supports.

**Accounting/GL impact:** None.

**Frontend:** config key `requestForQuotation` (`requestForQuotationConfig`, `inventory-screen.model.ts:1699`); generic shell, `isPurchaseTransactionKey()`.

**Backend — tables:**
- `inventory.inv_request_for_quotations` — header incl. `rfq_number`, `rfq_group_number`, `rfq_date`, `valid_till`, `estd_delivery_date`, `source_type`, `pr_id`/`pr_number`, `vendor_id/name/gstin`, `delivery_location`, `payment_terms`, `currency`, `send_channel`, `vendor_response_link`, scoring/weight columns above, `status`.
- `inventory.inv_rfq_items` — lines: product/variant/attribute/UOM, `required_qty`, `target_rate`, `vendor_rate`, `gst_rate` (+ `gst_inclusive`/`cgst_rate`/`sgst_rate`/`igst_rate`/`taxable_amount`/`tax_amount`/`line_total`), `lead_time`.

**Backend — stored procedures:**
- `inventory.sp_save_rfq` (latest body: `036_rfq_lifecycle_evaluation_po_flow.sql`) — upsert header + items, `RFQ-<segment>-<YY>-#####` numbering.
- `inventory.sp_get_rfqs` (latest: `036`) — list/filter.
- `inventory.sp_get_purchase_docs_for_ref` `WHEN 'RFQ'` — feeds the PO reference picker.
- `inventory.sp_cancel_purchase_doc` `WHEN 'RFQ'` — status-only cancel, blocked once accepted.

**Known gaps or flags:** No dedicated "send to vendor" integration — `send_channel`/`vendor_response_link` are just captured fields, not an actual email/portal integration. Otherwise fully wired end-to-end (real C# method + SP, present in `isApiWired()`/`loadApiRecords()`/payload switch) — **not** a stub.

---

## Purchase Order (PO)

**Business purpose:** The formal, vendor-facing order to buy specific items/services at agreed rates, terms, and delivery — the document a GRN is received against.

**Predecessor / successor documents:** Optionally created from an accepted RFQ (`rfq_id`/`rfq_number`, nullable — a direct PO is normal). Successor: intended to be the reference a GRN receives against — but see Known Gaps: this reference chain is currently broken at the picker-UI level.

**Status lifecycle:** No enforced workflow — `inv_purchase_orders` has "no meaningful approval-status workflow of its own" (confirmed by this codebase's own migration comment in `055_grn_po_reference.sql`, after inspecting the PO component itself as "a trivial pass-through component with no approve action"). Practically: `draft` -> `Approved` (config's own display statuses) -> `cancelled`. Any PO with `status <> 'cancelled'` is treated as valid/receivable-against by the reference-picker logic (when that logic worked — see below).

**Key business rules:** Header requires vendor, receiving warehouse, currency, payment terms. Line items carry qty/rate/discount/GST **and their own per-line Warehouse** column (`lineColumns` includes `Warehouse` — a real, independently-editable per-line field, unlike Sales Invoice's cosmetic warehouse column). No stock impact — a PO alone never touches `inv_stock_balance`; only the GRN/PI that eventually receives against it does. Branch/Warehouse independence: **not implemented for PO** — `inv_purchase_orders` has a `warehouse_id`/`warehouse_name` column but **no `branch_id` column at all** (confirmed via the latest `sp_save_purchase_order` insert list in `109_gst_inclusive_transaction_totals.sql`), and `purchaseOrder` is absent from both `mergedLocationScreenKeys` and `stockLocationScreenKeys`. A branch-only pick (no linked warehouse) is simply not a supported concept on this screen today — Purchase Order was never brought into the "Full Warehouse/Branch Independence" work that GRN/PI/Purchase Return/Delivery Challan/Sales Invoice/Sales Return/Stock Adjustment/Opening Stock Entry all received (migrations 157/159/160/162/163/165/166/172).

**Accounting/GL impact:** None. A PO never books a liability — that only happens at Purchase Invoice.

**Frontend:** config key `purchaseOrder` (`purchaseOrderConfig`, `inventory-screen.model.ts:1270`); generic shell, `isPurchaseTransactionKey()`.

**Backend — tables:**
- `inventory.inv_purchase_orders` — header: `po_number`, `po_date`, `expected_delivery`, `segment_id`, `rfq_id/rfq_number`, `vendor_id/name/gstin`, `warehouse_id/name`, `currency`, `payment_terms`, `reference_no`, `terms_conditions`, `status`.
- `inventory.inv_po_items` — lines: product/variant/attribute/UOM, `qty`, `rate`, `discount_pct`, `gst_rate` (+ `gst_inclusive`/`taxable_amount`/`tax_amount`), per-line `warehouse_name`, `amount`.

**Backend — stored procedures:**
- `inventory.sp_save_purchase_order` (latest body: `109_gst_inclusive_transaction_totals.sql`) — upsert header + items, `PO-<segment>-<YY>-#####` numbering.
- `inventory.sp_get_purchase_orders` — list/filter.
- `inventory.sp_get_purchase_docs_for_ref` `WHEN 'RFQ'` (consumed by PO) and the (broken) `WHEN 'PO'` branch that GRN was meant to consume.

**Known gaps or flags:** **Confirmed regression** — the GRN screen's "PO Reference" picker calls `sp_get_purchase_docs_for_ref` with `doc_type='PO'`; a working `WHEN 'PO'` branch existed once (`055_grn_po_reference.sql`) but was silently dropped by every subsequent full-procedure rewrite of that same SP (last touched `119`, currently live) and never restored. The PO -> GRN reference link is effectively dead in the UI today even though `inv_goods_receipts.po_id`/`po_number` and `sp_save_grn`'s handling of them still work fine if populated by any other means. Otherwise fully wired (real C# method + SP, present in `isApiWired()`/`loadApiRecords()`/payload switch) — **not** a stub.

---

## Goods Receipt Note (GRN)

**Business purpose:** Records physical inward receipt of goods at a warehouse/branch — the point stock actually enters the system for a GRN-led flow — with separate Received vs. Accepted quantity and batch/serial capture.

**Predecessor / successor documents:** Meant to reference a Purchase Order (see the confirmed picker bug above — this link does not work through the UI today) or be entered fully direct. Successor: a posted, not-yet-invoiced GRN can be picked as the `GRN` reference on a Purchase Invoice.

**Status lifecycle:** `draft` -> `posted` (stock moves) -> `invoiced` (once a PI references it — set by `sp_save_purchase_invoice`, not by the GRN screen itself) -> `cancelled` (blocked once `invoiced`, and blocked if any of its receipted serials have already moved on).

**Key business rules:** Requires vendor, receiving location, and at least one line with accepted qty > 0 for posting to do anything. Serial-tracked products require serial numbers whose count matches the accepted quantity (base-UOM-converted) and rejects duplicates unless the product's Serial Number Policy explicitly allows them. Rejected qty (`received_qty - accepted_qty`) is captured as a plain number only — **no actual quality-hold record, status, or workflow exists**, despite the config's own description claiming "Rejected qty triggers quality hold." Stock/inventory impact: posting calls `inventory.fn_post_grn_stock` (latest body `163_grn_branch_stock_posting.sql`), which increments `inv_stock_balance` and inserts `inv_serial_units` rows — but creates **no stock cost layer** (GRN carries no rate; the cost layer is deferred to whichever PI eventually references it). Branch/Warehouse independence: **fully implemented** — GRN is in both `mergedLocationScreenKeys` and `stockLocationScreenKeys`; `inv_goods_receipts` carries `branch_id`/`branch_name` alongside `warehouse_id`/`warehouse_name` (since migration `056`), `fn_post_grn_stock` was rewired in `163` to call `inventory.fn_upsert_stock_balance` with both, and a branch-only pick (zero linked warehouses) is unconditionally accepted as a valid posting location by `singleLocationValidationMessage()` — no longer resolved to "the one warehouse it's linked to."

**Accounting/GL impact:** **None.** `SaveGrnAsync` in `InventoryTransactionsDataService.cs` never calls into the `accounts` schema — GRN is purely an inventory-side document (the config's line "Purchase Invoice stores supplier bill details in Inventory only. Accounts posting is intentionally not touched here" actually describes GRN's real behavior, not PI's — see the Purchase Invoice section below, where that same sentence is factually stale).

**Frontend:** config key `goodsReceipt` (`goodsReceiptConfig`, `inventory-screen.model.ts:1311`); generic shell, `isPurchaseTransactionKey()`.

**Backend — tables:**
- `inventory.inv_goods_receipts` — header: `grn_number`, `grn_date`, `segment_id`, `branch_id/name`, `warehouse_id/name`, `vendor_id/name/gstin`, `po_id/po_number`, `rfq_id/rfq_number`, `vendor_invoice_no/dt`, `transport_details`, `status`, `remarks`.
- `inventory.inv_grn_items` — lines: product/variant/attribute/UOM, `received_qty`, `accepted_qty`, `rejected_qty`, `rate`, `discount_pct`, `gst_rate` (+ `taxable_amount`/`tax_amount`), `batch_no`, `serial_no`/`serial_numbers`, `expiry_date`, `amount`, `remarks`.
- `inventory.inv_serial_units` — one row per received serial (status `in_stock`, `source_doc_type='grn'`).
- `inventory.inv_stock_balance` — the aggregate on-hand quantity this GRN increments.

**Backend — stored procedures:**
- `inventory.sp_save_grn` (latest body: `130_grn_gst_accepted_qty.sql`) — upsert + `GRN-<segment>-<YY>-#####` numbering; calls `fn_post_grn_stock` on the draft->posted transition.
- `inventory.fn_post_grn_stock` (latest body: `163_grn_branch_stock_posting.sql`, a **guarded object** — see Known Gaps in the Stock Movement doc for what that means) — the actual stock/serial posting.
- `inventory.sp_get_grns` — list/filter, branch/warehouse-scoped via `active_branch_id`/`active_warehouse_id`.
- `inventory.sp_get_purchase_docs_for_ref` `WHEN 'GRN'` — feeds the PI reference picker (excludes GRNs already linked to a live PI).
- `inventory.sp_cancel_purchase_doc` `WHEN 'GRN'` — reverses `inv_stock_balance`/deletes in-stock serials, blocked once `invoiced` or once any serial has moved past `in_stock`.

**Known gaps or flags:** (1) The PO-reference picker bug described above. (2) "Rejected qty triggers quality hold" is aspirational copy — no such workflow exists. (3) `sp_cancel_purchase_doc`'s GRN-reversal `UPDATE` matches `inv_stock_balance` rows on `COALESCE(sb.warehouse_id,0) = COALESCE(g.warehouse_id,0)` **only** — it has no `branch_id` equality check at all, unlike the forward-posting `fn_upsert_stock_balance` path, which keys a stock row on warehouse_id **or** branch_id (mutually exclusive; a branch-only row has `warehouse_id IS NULL`). For a GRN posted against a Branch with no linked warehouse, cancelling it matches `COALESCE(NULL,0)=COALESCE(NULL,0)` — i.e. **any** branch-only stock row for that product, not necessarily the right branch's row, if more than one branch holds branch-only stock of the same product. This gap predates the branch-stock-posting work (`sp_cancel_purchase_doc` was last touched in migration `120`, before `157`/`159`/`163`/`165` introduced branch-only posting) and has never been revisited. Otherwise fully wired end-to-end (real C# method + SP, present in `isApiWired()`/`loadApiRecords()`/payload switch) — **not** a stub.

---

## Purchase Invoice (PI)

**Business purpose:** Books the vendor's financial bill — the point the payable to Sundry Creditors is actually recognized — either against a GRN's already-received goods or as a fully direct invoice with its own inline stock receipt.

**Predecessor / successor documents:** Optionally references a posted GRN (`grn_id`/`grn_number`, nullable — direct PI is a normal, common path, e.g. for service invoices or vendors who never route through a GRN). Successor: a posted PI with unreturned quantity remaining can be picked as the `PI` reference on a Purchase Return; it is also the thing Vendor Payment allocates against.

**Status lifecycle:** `draft` -> `posted` -> `cancelled`. A `paid` status value exists in the schema's guard logic (`sp_cancel_purchase_doc`'s `WHEN 'PI'` branch refuses to cancel a `paid` invoice) but **nothing in this codebase ever writes it** — Vendor Payment allocations never update `inv_purchase_invoices.status`, so a fully paid PI still shows `posted` forever; the `paid` branch is dead code protecting against a state that can't currently occur.

**Key business rules:** Header requires vendor and a Warehouse/Branch. Line items: when GRN-linked, the "Accepted Qty" column is a read-only echo of the GRN's own accepted quantity (PI always bills on Accepted Qty, never Received Qty, once GRN-linked); when direct, a plain "Qty" is entered instead. Stock/inventory impact — **this is the key branch point**:
  - **GRN-linked PI**: does **not** call any stock-posting function (stock already moved at GRN-post time). It only flips the linked GRN's status to `invoiced` and — since a GRN carries no rate — creates the stock cost layer here for the first time, at this PI's rate.
  - **Direct PI (no GRN)**: calls `inventory.fn_post_pi_stock` (latest body `159_purchase_invoice_branch_stock_posting.sql`), which both increments `inv_stock_balance` and adds the stock cost layer in the same step.
  Branch/Warehouse independence: **fully implemented** — PI was the **first** screen migrated to the merged picker (`159`), it's in both `mergedLocationScreenKeys`/`stockLocationScreenKeys`, `inv_purchase_invoices` carries `branch_id`/`branch_name` since migration `073`, and a branch-only pick is unconditionally valid. One residual gap: the **separate** cost-layer-creation call inside `sp_save_purchase_invoice` itself (used only for the GRN-linked case, added in `139_stock_valuation_engine.sql`) calls `fn_add_stock_cost_layer(...)` with only 11 positional arguments and never passes the PI's `branch_id` (its 12th, trailing parameter, added in `157`) — unlike `fn_post_pi_stock`'s own direct-invoice call, which `159` explicitly updated to pass `v_pi.branch_id`. A GRN-linked PI posted against a Branch-only location therefore creates its stock cost layer with no branch association, while a direct PI posted the same way does not have this problem.

**Accounting/GL impact:** **Yes** — and this directly contradicts the config's own description text ("Accounts posting is intentionally not touched here," which is stale/incorrect for this screen — see the GRN section, where that description actually applies). Posting a PI (`status` transitioning to `posted`) calls `accounts.sp_post_purchase_invoice` (`SavePurchaseInvoiceAsync` in `InventoryTransactionsDataService.cs`), which inserts real rows into `accounts.tbl_trans_total_transactions`:
  - Debit: category-wise expense accounts (dynamically created per product category under parent `4`/EXPENSES via `accounts.fn_ensure_party_subledger`, added in `093_category_ledger_posting.sql`) for the taxable value.
  - Debit: **P-CGST (1181)** + **P-SGST (1182)** split 50/50 for an intrastate purchase, **or P-IGST (1183)** for an interstate one (interstate/intrastate determined by comparing the company's own branch GSTIN/state against the vendor's, added in `135_gst_interstate_posting.sql`).
  - Credit: the vendor's own **Sundry Creditors (2151)** sub-ledger, for the full invoice total.
  It also writes a `taxation.tbl_trans_gst` row for the GST return workflow.
  **Confirmed still not branch-aware**: `accounts.sp_post_purchase_invoice` (latest body `135_gst_interstate_posting.sql`) hardcodes `v_company_code := 'COMP1'; v_branch_code := 'BNCH1'` regardless of the invoice's real `branch_id`/`warehouse_id` — every company/branch in the system posts its purchase-invoice GL entries into the same COMP1/BNCH1 ledger bucket.
  **Reversal path has a worse, additional gap than the forward posting** — exactly the same shape of issue this project previously found on the Sales Return side: a Purchase Return's accounts reversal (`accounts.sp_reverse_purchase_invoice_posting`, called from `SavePurchaseReturnAsync`, latest body `094_taxation_schema_posting.sql`) still does an **unconditional 50/50 CGST+SGST split with no interstate check at all** — the `135` migration that added the interstate/IGST branch to the *forward* `sp_post_purchase_invoice` never touched this reverse procedure. Returning any portion of an interstate Purchase Invoice today reverses CGST+SGST ledger entries that were never actually posted (the original posting used IGST), leaving those four accounts permanently unbalanced for any interstate purchase return. It also still hardcodes `COMP1`/`BNCH1`.

**Frontend:** config key `purchaseInvoice` (`purchaseInvoiceConfig`, `inventory-screen.model.ts:1352`); generic shell, `isPurchaseTransactionKey()`.

**Backend — tables:**
- `inventory.inv_purchase_invoices` — header: `pi_number`, `pi_date`, `segment_id`, `vendor_id/name/gstin`, `grn_id/grn_number`, `branch_id/name`, `warehouse_id/name`, `vendor_invoice_no/dt`, `due_date`, `payment_terms`, `status`, `subtotal`/`tax_amount`/`total_amount`.
- `inventory.inv_pi_items` — lines: product/variant/attribute/UOM, `qty`, `rate`, `mrp`, `selling_price`, `discount_pct`, `gst_rate`/`cgst_rate`/`sgst_rate`/`igst_rate`, `taxable_amount`/`tax_amount`, `batch_no`, `serial_no`/`serial_numbers`, `expiry_date`, `amount`, `remarks`.
- `inventory.inv_stock_cost_layers` — FIFO/LIFO/Weighted-Avg cost layers created here (direct PI) or here-but-deferred (GRN-linked PI).
- `accounts.tbl_trans_total_transactions` / `accounts.tbl_mst_account` / `taxation.tbl_trans_gst` — the GL side.

**Backend — stored procedures:**
- `inventory.sp_save_purchase_invoice` (latest body: `139_stock_valuation_engine.sql`) — upsert + `PI-<segment>-<YY>-#####` numbering; branches on `grn_id IS NULL` for stock/cost-layer handling as described above.
- `inventory.fn_post_pi_stock` (latest body: `159_purchase_invoice_branch_stock_posting.sql`, **guarded object**) — direct-PI stock + serial posting.
- `inventory.sp_get_purchase_invoices` — list/filter, branch/warehouse-scoped.
- `inventory.sp_get_purchase_docs_for_ref` `WHEN 'PI'` — feeds the Purchase Return reference picker.
- `inventory.sp_cancel_purchase_doc` `WHEN 'PI'` — reverses stock only for the direct-PI case (`grn_id IS NULL`); blocked once `paid` (dead branch, see above) and once any of its serials have moved.
- `accounts.sp_post_purchase_invoice` (latest body: `135_gst_interstate_posting.sql`) — the GL posting described above.

**Known gaps or flags:** (1) The config's own description text is stale/wrong about accounts posting (it does post, and hardcodes company/branch). (2) The Purchase Return reversal of this posting (`sp_reverse_purchase_invoice_posting`) never received the interstate/IGST fix `135` gave the forward posting — a real, live GL-imbalance risk on any interstate purchase return. (3) The GRN-linked cost-layer call's missing `branch_id` argument (above). Otherwise fully wired end-to-end (real C# method + SP, present in `isApiWired()`/`loadApiRecords()`/payload switch) — **not** a stub.

---

## Purchase Return / Debit Note

### Purchase Return

**Business purpose:** Reverses stock for goods rejected, damaged, or in excess, sent back to the vendor — against a posted PI or entered fully direct.

**Predecessor / successor documents:** Optionally references a posted Purchase Invoice (`pi_id`/`pi_number`, nullable) with a remaining unreturned quantity; a direct return with no PI is a normal, supported case. Successor: any Purchase Return (`draft` or `posted`) can be picked as the `PURCHASERETURN` reference on a Debit Note.

**Status lifecycle:** `draft` -> `posted` (stock reverses) -> `cancelled` (stock re-reverses back in, blocked if the underlying serials have moved further).

**Key business rules:** Requires vendor and a Warehouse/Branch; items require a return qty and, for serial-tracked products, the specific serial numbers being returned (validated to actually be `in_stock` at that exact warehouse/branch/source-document before flipping them to `returned` — tightened in `169_serial_outward_location_scope.sql`). Stock/inventory impact: posting calls `inventory.fn_post_purchase_return_stock` (latest body `169_serial_outward_location_scope.sql`), which decrements `inv_stock_balance` and consumes stock cost layers (`fn_consume_stock_cost_layers`, respecting the item's FIFO/LIFO/Weighted-Avg valuation method) at the same location the goods were originally received into. Branch/Warehouse independence: **fully implemented** — `inv_purchase_returns` gained `branch_id`/`branch_name` in `162_purchase_return_branch_columns.sql` (schema/save-plumbing only), and `fn_post_purchase_return_stock` was rewired for branch-only posting in `165_purchase_return_branch_stock_posting.sql`; a branch-only pick (zero linked warehouses) is unconditionally accepted, same as GRN/PI.

**Accounting/GL impact:** **Yes** — posting a Purchase Return (`SavePurchaseReturnAsync`) calls `accounts.sp_reverse_purchase_invoice_posting`, the exact debit/credit mirror of `sp_post_purchase_invoice` (credits the category expense accounts and CGST/SGST, debits Sundry Creditors) for the *returned* subtotal/tax/total only. **As detailed in the Purchase Invoice section above, this reversal procedure never received the `135` interstate/IGST fix** — it still unconditionally splits CGST/SGST 50/50 regardless of whether the original invoice was interstate, and still hardcodes `company_code='COMP1', branch_code='BNCH1'`. This is a strictly worse gap than the forward PI posting has (which at least got the interstate fix), mirroring the exact class of gap previously found in this project on the Sales Return / `sp_reverse_sales_invoice_posting` side.

**Frontend:** config key `purchaseReturn` (`purchaseReturnConfig`, `inventory-screen.model.ts:1739`); generic shell, `isPurchaseTransactionKey()`.

**Backend — tables:**
- `inventory.inv_purchase_returns` — header: `return_number`, `return_date`, `segment_id/name`, `vendor_id/name/gstin`, `pi_id/pi_number`, `debit_note_ref`, `branch_id/name`, `warehouse_id/name`, `return_reason`, `status`, `subtotal`/`tax_amount`/`total_amount`.
- `inventory.inv_purchase_return_items` — lines: product/variant/attribute/UOM, `grn_qty`, `return_qty`, `rate`, `gst_rate`, `taxable_amount`/`tax_amount`, `return_amount`, `return_reason`, `serial_numbers`.
- `inventory.inv_stock_cost_layers` — consumed here on posting.
- `accounts.tbl_trans_total_transactions` — the reversal GL entries.

**Backend — stored procedures:**
- `inventory.sp_save_purchase_return` (latest body: `162_purchase_return_branch_columns.sql`) — upsert + `PRET-<segment>-<YY>-#####` numbering; calls `fn_post_purchase_return_stock` on the draft->posted transition.
- `inventory.fn_post_purchase_return_stock` (latest body: `169_serial_outward_location_scope.sql`, **not** a guarded object) — the stock/serial reversal.
- `inventory.sp_get_purchase_returns` — list/filter, branch/warehouse-scoped.
- `inventory.sp_get_purchase_docs_for_ref` `WHEN 'PURCHASERETURN'` — feeds the Debit Note reference picker.
- `inventory.sp_cancel_purchase_doc` `WHEN 'PURCHASERETURN'` — re-increments stock, un-returns serials, scoped to the same source GRN/PI the return itself referenced.
- `accounts.sp_reverse_purchase_invoice_posting` (latest body: `094_taxation_schema_posting.sql`, **never received the `135` interstate fix**) — the GL reversal.

**Known gaps or flags:** The interstate-GST gap in the accounts reversal, detailed above — the single most important finding in this document. Otherwise fully wired end-to-end (real C# method + SP, present in `isApiWired()`/`loadApiRecords()`/payload switch) — **not** a stub.

### Debit Note

**Business purpose:** The pure financial-settlement/documentary record for a Purchase Return (or a standalone vendor price/quality/freight adjustment with no return at all) — the paper trail accounts and the vendor use to agree on the payable reduction, independent of any stock movement.

**Predecessor / successor documents:** Optionally references a Purchase Return (`purchase_return_id`/`purchase_return_number`) or a Purchase Invoice directly (`purchase_invoice_id`/`purchase_invoice_number`) — both nullable; a fully direct debit note ("Direct Vendor Adjustment" reason) is normal. Successor: can be selected as an allocation target (`invoice_type = 'debit_note'`) on a Vendor Payment voucher.

**Status lifecycle:** `draft` -> `posted` -> `cancelled` (per the table's own `CHECK (status IN ('draft','posted','cancelled'))`). "Posted" here has no stock or GL side-effect at all (see below) — it is purely a status flag on the document itself.

**Key business rules:** Header: vendor, reason (dropdown: Purchase Return Settlement / Price Difference / Short Supply / Quality Deduction / Freight Overcharge / Direct Vendor Adjustment), optional GST Adjustment flag. Lines are free-form settlement/adjustment rows (description, reference, amount, GST%, GST amount, total) rather than product/UOM lines — there is no inventory item linkage on a debit note's own line items. **Moves zero stock, by explicit design** — per its own originating migration's comment: "Debit Note had zero wiring at any layer... Per user decision: documentary only — no stock movement (the linked Purchase Return already owns that)." Branch/Warehouse independence: not applicable — Debit Note has no warehouse or branch field at all, since it never touches stock.

**Accounting/GL impact:** **Confirmed: none.** `SaveDebitNoteAsync` in `InventoryTransactionsDataService.cs` calls only `inventory.sp_save_debit_note` — no `accounts.*` call anywhere in that method, and no accounts procedure named anything like `sp_post_debit_note` exists in the migration history. This matches (and this document independently re-confirms) the finding from the prior partial run of this research: Debit Note is purely inventory-side, with no accounts posting call at all, even after the general Purchase/Sales-Invoice accounts-posting work (`091`/`093`/`094`/`135`) shipped for every other invoice-adjacent document in this flow.

**Frontend:** config key `debitNote` (`debitNoteConfig`, `inventory-screen.model.ts:2372`); generic shell, `isPurchaseTransactionKey()`.

**Backend — tables:**
- `inventory.inv_debit_notes` — header: `debit_note_number`, `debit_note_date`, `segment_id/name`, `vendor_id/name`, `purchase_return_id/number`, `purchase_invoice_id/number`, `reason`, `gst_adjustment`, `remarks`, `subtotal`/`tax_amount`/`total_amount`, `status`.
- `inventory.inv_debit_note_items` (created alongside the header table in the same migration) — free-form lines: `description`, `reference`, `amount`, `gst_pct`, `gst_amount`, `total_amount`.

**Backend — stored procedures:**
- `inventory.sp_save_debit_note` (single definition, never redefined since `051_debit_note.sql`) — upsert + numbering, no downstream stock/GL calls at all.
- `inventory.sp_get_debit_notes` — list/filter.
- `inventory.sp_get_purchase_docs_for_ref` `WHEN 'PURCHASERETURN'` — feeds this screen's own reference picker (Debit Note itself is not offered as a reference source to anything further downstream in the purchase-doc picker).
- `inventory.sp_cancel_purchase_doc` `WHEN 'DN'` — status-only cancel (no stock or GL to reverse).

**Known gaps or flags:** None beyond the by-design absence of stock/GL posting (which is a deliberate scope decision recorded in `051_debit_note.sql`, not an oversight). Fully wired for what it is (real C# method + SP, present in `isApiWired()`/`loadApiRecords()`/payload switch) — **not** a stub.

---

## Vendor Payment

**Business purpose:** Settles one or more posted Purchase Invoices (and/or Debit Notes) against a vendor, full or partial, with TDS auto-apply and a vendor-level TCS threshold check, recording the actual cash/bank movement.

**Predecessor / successor documents:** Allocates against posted Purchase Invoices and/or Debit Notes (`invoice_type` = `purchase_invoice` / `debit_note`, re-validated server-side against live outstanding on every save). Nothing downstream references a Vendor Payment voucher itself.

**Status lifecycle:** Vouchers are created directly in `posted` status (`sp_save_payment_voucher` hardcodes `status = 'posted'` on insert — there is no draft stage for a payment voucher) -> `cancelled` via a separate cancel call. Cancelling only flips `inv_payment_vouchers.status` to `cancelled` (see Known Gaps — this does not reverse the GL postings).

**Key business rules:** This is **not** part of the generic Purchase-transaction pipeline the other seven screens share — it is a dedicated, bespoke Angular component (`Inventory_Transactions\payment-receipt-voucher\payment-receipt-voucher.ts`, routed at `.../vendor-payment`, mode `'pay'`) with its own service (`Inventory_Shared\payments.service.ts`), sharing its backend with the Customer Receipt screen (mode `'receive'`) via a single generic voucher shape (`voucher_type: 'payment' | 'receipt'`). It is entirely absent from `inventory-screen-shell.ts`'s `isApiWired()`/`isPurchaseTransactionKey()`/`loadApiRecords()`/payload-build switches — **that absence does not mean it is unwired**, it means it is wired somewhere else. Real, live business rules enforced server-side in `sp_save_payment_voucher`: (1) every allocation is re-validated against the invoice/note's actual current outstanding (never trusts the client's own figure); (2) a flat **₹20,000 cap** on any single Cash-mode row (item 20); (3) optional TDS (section-rate driven from `taxation.tds_codes`, gated to invoices carrying a Service-natured line item, item 21); (4) optional TCS — a **manually typed percentage**, gated on the vendor having crossed ₹50 lakh in cumulative posted-PI purchases for the current financial year (April-March), computed live by `inventory.sp_get_vendor_fy_purchase_summary` (item 22). Branch/Warehouse independence: **not applicable** — `inv_payment_vouchers` has no warehouse or branch column of any kind; a payment voucher is a pure financial document with no stock-location concept.

**Accounting/GL impact:** **Yes.** Posting a payment voucher (`voucher_type = 'payment'`) calls `accounts.sp_post_payment_voucher` (latest body `094_taxation_schema_posting.sql`), which:
  - Debits the vendor's own **Sundry Creditors (2151)** sub-ledger for the full amount (cash/bank total + TDS).
  - Credits **Cash on Hand (18)** for a `cash` mode row, or **Bank (1438)** for any other mode.
  - If TDS was applied, credits a **section-specific TDS-payable account** (e.g. `194C -> 1235`, `194J -> 1239`, `194I -> 1233`, falling back to a generic `1318` for unlisted sections) and writes a `taxation.tbl_trans_tds` row.
  - TCS (`tcs_amount`/`tcs_percentage`) is captured on the voucher record and reduces the net cash/bank total the same way TDS does, but **posts to no ledger account at all** — by explicit, documented decision (`150_tcs_vendor_threshold.sql`: "No GL/ledger posting for TCS... no 'TCS Payable'/'TCS Receivable' account mapping exists anywhere in this codebase to model this on"), unlike TDS which had a live precedent to follow.
  **Confirmed still not branch-aware, same pattern as PI/Purchase Return**: `accounts.sp_post_payment_voucher` hardcodes `v_company_code := 'COMP1'; v_branch_code := 'BNCH1'`.
  **Cancellation gap, worse than PI/Purchase Return's**: `inventory.sp_cancel_payment_voucher` (single definition, never redefined since `090_payment_receipt_vouchers.sql`) only flips `inv_payment_vouchers.status` to `cancelled` — it makes **no call at all** into `accounts` to reverse the Sundry Creditors debit / Cash-Bank credit / TDS-payable credit that were posted. A cancelled Vendor Payment leaves its full GL footprint permanently in place, which is a materially worse gap than either the PI or Purchase Return reversal issues documented above (those at least attempt a reversal, just an inaccurate one on interstate cases — this one attempts no reversal whatsoever).

**Frontend:** routed component `Inventory_Transactions\payment-receipt-voucher\payment-receipt-voucher.ts` / `.html` (mode `'pay'`); service `Inventory_Shared\payments.service.ts`; `vendorPaymentConfig` (`inventory-screen.model.ts:1610`) is used by this component only for its onboarding/guide-panel copy (`guideConfig()`), **not** for data loading or saving.

**Backend — tables:**
- `inventory.inv_payment_vouchers` — `voucher_number`, `voucher_type`, `voucher_date`, `segment_id/name`, `party_type`/`party_id`/`party_name`/`party_gstin`, `total_allocated`, `tds_amount`, `tcs_amount`, `tcs_percentage`, `net_amount`, `narration`, `status`.
- `inventory.inv_payment_voucher_allocations` — one row per invoice/note allocated against (`invoice_type`, `invoice_id`, `invoice_number`, `allocated_amount`).
- `inventory.inv_payment_voucher_modes` — one row per payment mode used (`mode_key`, `amount`, `ref_json` for cheque/UPI/bank-transfer reference details).
- `accounts.tbl_trans_total_transactions` / `taxation.tbl_trans_tds` — the GL side.

**Backend — stored procedures:**
- `inventory.sp_save_payment_voucher` (latest body: `150_tcs_vendor_threshold.sql`) — validates allocations against live outstanding, enforces the ₹20,000 cash cap, generates `PAY-<segment>-<YY>-#####` / `RCT-...` numbering.
- `inventory.sp_get_payment_vouchers` (latest body: `150`) — list/filter by voucher type + segment.
- `inventory.sp_get_outstanding_invoices` — feeds the "which invoices can this be allocated against" picker.
- `inventory.sp_get_vendor_fy_purchase_summary` (added `150`) — the TCS ₹50L threshold check.
- `taxation.sp_get_tds_codes` — the TDS section/rate master.
- `inventory.sp_get_available_notes` — feeds the Debit/Credit Note allocation picker.
- `inventory.sp_cancel_payment_voucher` (single definition, `090_payment_receipt_vouchers.sql`, never updated) — status-only cancel, **no GL reversal**.
- `accounts.sp_post_payment_voucher` (latest body: `094_taxation_schema_posting.sql`) — the GL posting described above.

**Known gaps or flags:** (1) Cancelling a posted Vendor Payment does not reverse any of its GL entries — the most serious accounting gap found across all 8 screens in this document. (2) Hardcoded `COMP1`/`BNCH1`, same as every other accounts-posting procedure in this flow. (3) TCS is captured but never posted to a ledger account, by explicit documented decision rather than oversight. This screen is **fully wired with real backend logic** — it is emphatically not a stub — but it lives entirely outside the generic `inventory-screen-shell.ts` pipeline that the other seven Procure-to-Pay screens share, so anyone auditing this flow purely by grepping that shell's `isApiWired()`/`isPurchaseTransactionKey()` lists (as this document's own methodology otherwise relies on) would incorrectly conclude it is unwired. It is not.

---

## Summary table

| Screen | Config key | API-wired? | Stock impact | Accounts/GL impact | Branch-only posting supported? |
|---|---|---|---|---|---|
| Purchase Requisition | `purchaseRequisition` | Yes (generic shell) | None | None | N/A (no stock document) |
| Request for Quotation | `requestForQuotation` | Yes (generic shell) | None | None | N/A |
| Purchase Order | `purchaseOrder` | Yes (generic shell) | None | None | No — Warehouse-only, no `branch_id` column |
| Goods Receipt Note | `goodsReceipt` | Yes (generic shell) | Yes, at post | None | Yes (since `163`) |
| Purchase Invoice | `purchaseInvoice` | Yes (generic shell) | Yes, direct-PI only | Yes — hardcoded COMP1/BNCH1 | Yes (since `159`) |
| Purchase Return | `purchaseReturn` | Yes (generic shell) | Yes, at post | Yes (reversal) — hardcoded, missing interstate fix | Yes (since `165`) |
| Debit Note | `debitNote` | Yes (generic shell) | None (by design) | None (by design) | N/A |
| Vendor Payment | n/a (bespoke component) | Yes (bespoke, not generic shell) | None | Yes — hardcoded, cancel doesn't reverse | N/A (no location field) |

No screen in this flow is an unwired frontend-only stub — the closest candidate, Vendor Payment, only *looks* unwired if you check exclusively against the generic shell's switches instead of its own dedicated component and service.
