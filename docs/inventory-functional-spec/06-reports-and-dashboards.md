# Inventory Module -- Reports and Dashboards

Author's note: this document was produced 2026-08-30 by walking the actual live frontend (Inventory_Shared/inventory-screen.model.ts, the Inventory_Reports folder, and the routing table) against the actual live backend (ReportsController.cs, InventoryTransactionsController.cs, InventoryTransactionsDataService.cs, and the numbered SQL migrations under Database/Migrations/inventory/) -- not from a spec. Where a report is mock, unrouted, or has a known arithmetic quirk, that is reported plainly rather than smoothed over.

## 1. What business questions this suite answers

The Inventory reporting suite exists to answer, in roughly this order of how often a business owner asks them:

- **"What do I have, right now, and where?"** -- Stock Summary, Warehouse-wise Stock, and the Dashboard's "Stock by Product" panel answer this from the live inventory.inv_stock_balance table (opening/inward/outward/closing quantity and value per product, or per product-per-location).
- **"What is my stock actually worth, and what would a different valuation method say?"** -- Stock Summary values closing stock at the product's current rolling cost (whatever FIFO/LIFO/Weighted-Average has converged it to); the Stock Valuation Comparison report goes one level deeper and shows what FIFO, LIFO, and Weighted-Average would each individually charge for a hypothetical quantity of one product, computed from that product's real open cost layers.
- **"What's moving, and what's the audit trail of that movement?"** -- Stock Ledger derives a chronological, running-balance ledger from the actual source documents (GRN, Purchase Invoice, Sales Invoice, Delivery Challan, Stock Transfer, Sales/Purchase Returns) -- there is no physical stock-ledger table in this schema; the "ledger" is computed fresh from those documents on every request.
- **"What's dead, slow, low, or about to expire?"** -- Low Stock Alert (below reorder level), Batch/Serial/Expiry (near-expiry lots), and Loss Sales (sold below cost) are the closest things this suite has to exception/health reporting. There is currently no dedicated slow-moving/dead-stock or ageing-of-stock report, despite INVENTORY_KPIS/dashboard summary cards elsewhere in the app implying one (see section 7, Known Gaps).
- **"How is each business segment performing?"** -- Segment is a first-class filter/breakout dimension on almost every report and on the MIS Report's per-segment table, reflecting the multi-vertical (Electronics / Agro / Hospitality / Real Estate / Manufacturing / ...) nature of this ERP.
- **"Are we tax-compliant?"** -- the HSN/SAC Summary report aggregates posted Sales Invoice lines by HSN/SAC code with taxable value, CGST/SGST/IGST and net value.
- **"Give the owner/admin one cross-cutting view across everything, including money."** -- the MIS Report (Admin-only) is the one report that spans stock, sales, purchases, and payables/receivables (with ageing) in a single screen, company-wide and per-segment side by side.

## 2. How these reports source their data: live, not materialized

There is no materialized or precomputed summary table anywhere in this reporting stack. Every report -- the Dashboard included -- is backed by a PostgreSQL stored procedure (inventory.sp_get_*) that queries the live transactional tables (inv_purchase_orders, inv_goods_receipts, inv_purchase_invoices, inv_sales_orders, inv_delivery_challans, inv_sales_invoices, inv_stock_balance, inv_stock_cost_layers, ...) or a light computed view over one of them (inventory.vw_stock_location_balance, a view -- not a materialized view -- over inv_stock_balance) and re-aggregates on every single request. There is no refresh/rebuild job, no snapshot table, no cron. This means:

- Numbers are always current as of the moment the report is opened -- no "as of last night's batch" staleness.
- It also means every report pays the full cost of its aggregation on every page load; there is no caching layer observed anywhere in InventoryReportsService, InventoryDashboardService, or the stored procedures themselves.
- The one exception that is snapshot-like rather than fully live is the "Sales Without PI" dashboard flag, which is written at Sales-Invoice-posting time into a small tracking table (101_sales_pi_pending_tracking.sql) rather than recomputed from a join on every dashboard load -- everything else on the dashboard (including "Dispatched Without SI" and "Loss Sales", despite superficially looking similar) is computed fresh on every call.

The backend call path for every "flat table" report (Stock Summary, both registers, HSN Summary, etc.) is: Angular InventoryReportPageComponent -> InventoryReportsService.getReport() -> GET /api/reports/{endpoint} (ReportsController.cs) -> IInventoryTransactionsDataService.GetXxxAsync(...) -> CallReportSpAsync("inventory.sp_get_xxx", ...), which does a raw CALL sp_get_xxx(@p_data, @o_result) over Npgsql and returns the JSON o_result straight through, un-transformed, because each procedure already builds its response in the exact { success, message, data, summary, totalRecords } camelCase envelope the frontend expects. Two reports (Stock Valuation Comparison, MIS Report) don't fit that flat-table shape and go through CallSpSingleAsync<T> instead, deserializing into a typed DTO (StockValuationComparisonResponse, MisReportResponse).

## 3. Two frontend implementations exist for four of these reports -- and only one is actually reachable

Inventory_Shared/inventory-screen.model.ts defines four report(...)-factory screen configs -- stockAvailabilityReportConfig, stockLedgerConfig, segmentSummaryConfig, hsnSacReportConfig -- each wrapped by its own thin component under Inventory_Reports/ (stock-availability-report, stock-ledger, segment-summary, hsn-sac-report). These four components are dead code: inventory_routs.ts never routes to any of them (a search across the whole routing table found zero references to their component classes). They render via InventoryInteractiveReportComponent, whose entire dataset is a compile-time-hardcoded, 12-row, 100%-fabricated in-memory array with no HTTP call at all -- not even an attempt to reach the backend, unlike the redesigned report page's honest "API failed -> empty table + error message" behavior.

The actual, routed reporting UI is the redesigned engine: reports/:reportKey -> InventoryReportPageComponent, driven by the report registry in Inventory_Reports/shared/inventory-report.registry.ts (19 report definitions, INVENTORY_PHASE_1_REPORTS). findInventoryReport() maps the old slugs onto their real equivalents so old bookmarks/links still resolve somewhere sensible:

| Old/legacy slug | Resolves to |
|---|---|
| stock-availability-report | stock-summary |
| segment-summary | inventory-summary (redirects again, to the Inventory Dashboard) |
| hsn-sac-report | hsn-summary |

Two reports are bespoke, not rendered by InventoryReportPageComponent at all, and have their own static routes registered above the :reportKey catch-all: Stock Valuation Comparison and MIS Report (both product-picker/KPI-panel/chart layouts rather than a flat filterable grid).

Of the 19 report entries in the registry: 17 have a real backend stored procedure; 1 (inventorySummary / "Inventory Summary Dashboard") is a pure route redirect to the live Inventory Dashboard component rather than its own report; 1 (auditTrail / "Inventory Audit Trail Report") has no backend at all and permanently shows its hardcoded sampleRows -- explicitly documented in ReportsController.cs's own file header as "no field-level change-history table exists anywhere in this schema to query."

## 4. The Inventory Dashboard -- landing page and drill-down hub

inventory-dashboard/dashboard (component InventoryDashboard, src/app/inventory/inventory-dashboard/) is the module's default landing route (/dashboard/inventory/inventory-dashboard/dashboard, and also what reports/inventory-summary redirects to). It is a fully live, real-data dashboard -- explicitly rebuilt from "100%-hardcoded mock arrays" per its own migration's header comment (095_inventory_dashboard_summary.sql) -- with a user-configurable, drag/resize/hide, localStorage-persisted section layout (inv-dashboard-section-layout-v3).

Sections: Key Metrics (10 KPI tiles), Payables & Receivables, Purchase/Sales/Returns (period-scoped), Ageing (4 buckets: 0-30/31-60/61-90/90+), Movement (inward GRN qty vs. outward Sales Invoice qty by day), Warehouse Stock, Sales & Returns trend, Payables-vs-Receivables donut, Top Selling & Returned Products, Product Sales Funnel, Procurement-vs-Sales pipeline funnel (PO to GRN to PI and SO to DC to SI, by count and value), Stock by Product (every tracked product, real qty/value, CSV-exportable), and Recent Transactions (latest 12 across GRN/PI/SI/PO/SO/DC).

Drill-downs: every KPI/financial tile is clickable (openCard()) and opens a modal grid. Stock Value and Out of Stock are derived client-side from the already-fetched stock_by_product list (no separate backend call). Payables/Receivables drill into the aged outstanding-invoice rows from sp_get_dashboard_summary's drilldowns object (097_dashboard_drilldowns.sql). Three tiles have their own dedicated, independently-refreshed endpoints, fetched on load and again on manual refresh (not re-fetched when the KPI period selector changes, since they are "most recent flags" rather than period-scoped):
- Sales Without PI (/inventory/dashboard/sales-without-pi, backed by a small snapshot table written at Sales Invoice posting time -- 101_sales_pi_pending_tracking.sql)
- Dispatched Without SI (/inventory/dashboard/dc-pending-invoice, live/derived -- 103_dc_pending_invoice_dashboard.sql)
- Loss Sales (/inventory/dashboard/loss-sales, live/derived, current cost joined against historical sale rate -- 155_loss_sales_report.sql)

Data source: inventory.sp_get_dashboard_summary (built up across 095/096_dashboard_payables_receivables.sql/097_dashboard_drilldowns.sql/098_dashboard_sales_charts.sql/099_dashboard_pipeline_funnel.sql), reading inv_stock_balance, inv_products, inv_purchase_orders, inv_sales_orders, inv_delivery_challans, inv_goods_receipts, inv_purchase_invoices, inv_sales_invoices (+ items), and payment-voucher-allocation tables for the payables/receivables and ageing math -- all queried live, no snapshotting.

Known gap (dashboard, branch independence): the Warehouse Stock panel INNER JOINs inv_warehouses, and the KPI/Stock-by-Product queries read inv_stock_balance without going through the location-generic vw_stock_location_balance view or exposing a branch_name. Any stock genuinely held against a branch (once Round 2+ of the Warehouse/Branch Independence work actually posts against one, per 157_stock_location_branch_columns.sql) would either be silently excluded from "Warehouse Stock" or show a blank/NULL location in "Stock by Product" -- the Dashboard was not revisited as part of that later branch-independence work, unlike the five stock-report procedures in 158_stock_reports_location_generic.sql.

Frontend: inventory-dashboard.ts / .html / .scss; service Inventory_Shared/inventory-dashboard.service.ts (InventoryDashboardService).

---

## 5. Report catalog (registry order, grouped)

| Report | Group | Slug | Backend | Audience |
|---|---|---|---|---|
| Inventory Summary Dashboard | Dashboard Reports | inventory-summary | Redirects to live Dashboard (section 4) | Owner, Admin, Warehouse, Purchase, Sales |
| MIS Report | Dashboard Reports | mis-report | sp_get_mis_report (bespoke) | Admin only |
| Stock Summary Report | Stock Reports | stock-summary | sp_get_stock_summary_report | Owner, Accountant, Warehouse |
| Stock Ledger Report | Stock Reports | stock-ledger | sp_get_stock_ledger_report | Accountant, Warehouse, Admin |
| Warehouse-wise Stock Report | Stock Reports | warehouse-wise-stock | sp_get_warehouse_wise_stock | Warehouse, Admin, Owner |
| Low Stock Alert Report | Alert & Exception Reports | low-stock-alert | sp_get_low_stock_alert | Purchase, Warehouse, Owner |
| Pending Document Report | Alert & Exception Reports | pending-document | sp_get_pending_document_report | Owner, Admin, Purchase, Sales, Warehouse |
| Purchase Order Register | Purchase Reports | purchase-order-register | sp_get_purchase_order_register | Purchase, Accountant, Admin |
| GRN Register | Purchase Reports | grn-register | sp_get_grn_register | Warehouse, Purchase, Accountant |
| Purchase Invoice Register | Purchase Reports | purchase-invoice-register | sp_get_purchase_invoice_register | Accountant, Purchase, Admin |
| Sales Order Register | Sales Reports | sales-order-register | sp_get_sales_order_register | Sales, Warehouse, Owner |
| Delivery Challan Register | Sales Reports | delivery-challan-register | sp_get_delivery_challan_register | Warehouse, Sales, Admin |
| Sale Invoice Register | Sales Reports | sales-invoice-register | sp_get_sales_invoice_register | Accountant, Sales, Owner |
| HSN/SAC Summary Report | GST & Compliance Reports | hsn-summary | sp_get_hsn_summary | Accountant, Admin, Compliance |
| Batch / Serial / Expiry Report | Batch/Serial/Expiry Reports | batch-serial-expiry | sp_get_batch_serial_expiry_report | Warehouse, Quality, Admin, Owner |
| Product Profitability Report | Costing & Profitability Reports | product-profitability | sp_get_product_profitability | Owner, Accountant, Sales |
| Loss Sales Report | Costing & Profitability Reports | loss-sales | sp_get_loss_sales_report (+ dashboard flag variant) | Owner, Accountant, Sales |
| Stock Valuation Comparison Report | Costing & Profitability Reports | stock-valuation-comparison | sp_get_stock_valuation_comparison (bespoke) | Owner, Accountant |
| Inventory Audit Trail Report | Audit & Control Reports | inventory-audit-trail | None -- sampleRows only | Admin, Accountant, Owner |

Six of the 15 report groups defined in INVENTORY_REPORT_GROUPS (Stock Movement, UOM, Customer & Supplier, Self Consumption, Manufacturing/Assembly, Branch/Warehouse) currently have zero reports assigned -- the group taxonomy was built out ahead of a Phase 2/3 that has not shipped yet.

---

## Inventory Summary Dashboard

Business purpose: intended as the "Phase 1 dashboard report" entry in the report registry, but it does no independent work -- its route (reports/inventory-summary) is a hard redirect to /dashboard/inventory/inventory-dashboard/dashboard, i.e. it is the Inventory Dashboard described in section 4. Used by Business Owner, Admin, Warehouse, Purchase, Sales per the registry's audience list.
Key filters/dimensions: none of its own -- see the Dashboard's own period selector (today/week/month/quarter) in section 4. Not warehouse/branch filterable at the report level.
Frontend: registry key inventorySummary, slug inventory-summary; route redirect defined in inventory_routs.ts (reports children, path: 'inventory-summary').
Backend -- data source: none directly; see section 4 (sp_get_dashboard_summary).
Known gaps or flags: the registry still carries a full mock definition for this report (12 summary cards with hardcoded fallback values, 8 sample rows with an "Owner Action" narrative column) that a user would only ever see for a split second before the redirect fires, or if InventoryReportPageComponent were ever reached directly by URL race -- effectively vestigial.

## MIS Report

Business purpose: the one Admin-only, cross-cutting executive snapshot -- combined company-wide Sales, Purchases, Stock Value, Payables/Receivables (with 4-bucket ageing) and Top 8 Selling Products for the selected date range (defaults to current financial year, Apr 1 to Mar 31), plus the identical KPI set broken out per Business Segment, ordered by sales descending, in the same view.
Key filters/dimensions: From Date / To Date only. No branch filter, and the segment breakdown itself is Segment-only, not branch-wise -- this is an explicit, documented scope decision in the migration, not an oversight: inv_purchase_invoices carries both segment_id and branch_id, but inv_sales_invoices carries segment_id only (no branch_id column at all, confirmed live), so a symmetric branch-wise cut isn't queryable today without an approximate warehouse-to-branch join on the sales side. The report explicitly does not attempt that.
Frontend: bespoke route reports/mis-report, component MisReportComponent (Inventory_Reports/mis-report/mis-report.ts), not using the generic InventoryReportPageComponent shell -- its own product/date picker, app-stat-card panels, bar/donut charts.
Backend -- data source: inventory.sp_get_mis_report (153_mis_report.sql), reading inv_sales_invoices/inv_sales_invoice_items, inv_purchase_invoices, inv_stock_balance (company-wide total, not location-scoped), inv_payment_voucher_allocations/inv_payment_vouchers for payables/receivables net-of-allocation, and inv_segments for the segment name join. Screen access code INV_R_MIS, granted only to COMPANY_ADMIN (154_mis_report_screen.sql).
Known gaps or flags:
- Access control is enforced entirely client-side. screenPermissionGuard('INV_R_MIS') on the route is non-blocking by this app's own design (it only shows a toast); the actual gate is MisReportComponent's own canView = authService.can('INV_R_MIS','view') check before it calls generate(). The backend endpoint (GET /api/reports/mis-report) itself has no server-side role check beyond normal tenant scoping -- a non-Admin user who called the endpoint directly (bypassing the SPA) would get a valid response. This mirrors the pattern used everywhere else in this app (all screenPermissionGuards are non-blocking), so it is consistent with the rest of the system rather than a one-off oversight, but it means MIS Report's "Admin only" boundary is a UI convention, not an API-enforced one.
- No branch-wise breakdown (see above) -- a real limitation if segment and branch don't align 1:1 for a tenant.
- Segment name resolution is correct (an explicit JOIN inventory.inv_segments seg ON seg.id = seg_ids.segment_id for segment_name, not a naive denormalized column) -- no join bug found here despite the brief for this document flagging one to look for.

## Stock Summary Report

Business purpose: the primary "what do I have" report -- opening, inward, outward, closing quantity and value per product, aggregated across whichever locations match the filter. Used by Business Owner, Accountant, Warehouse.
Key filters/dimensions: Segment, Warehouse, Branch (added as an optional filter to the stored procedure in 158_stock_reports_location_generic.sql), Product, From/To Date, Product Category, Brand, HSN/SAC, UOM, Batch/Serial.
Frontend: slug stock-summary (alias target of the legacy stock-availability-report), rendered by InventoryReportPageComponent.
Backend -- data source: inventory.sp_get_stock_summary_report (104_stock_summary_report.sql, UOM/status fix in 133_stock_reports_invoiced_grn_and_dc_uom_fix.sql, location-generic rebase in 158_stock_reports_location_generic.sql). Closing stock reads inventory.vw_stock_location_balance (a plain view over inv_stock_balance, not materialized); inward/outward are summed live from inv_grn_items/inv_pi_items/inv_sales_return_items (inward) and inv_delivery_challan_items/inv_sales_invoice_items/inv_purchase_return_items (outward), each correctly converted to base UOM via fn_product_uom_base_qty() where the source line isn't already in base UOM.
Known gaps or flags:
- Branch filtering is real at the SP layer but not reachable through the API. 158's procedure accepts an optional branch_id, but ReportsController.GetStockSummaryReport and InventoryTransactionsDataService.GetStockSummaryReportAsync only declare/forward segmentId, warehouseId, productId, fromDate, toDate -- there is no branchId parameter anywhere in the C# signature. The Angular report page's combined "Warehouse / Branch" multiselect does send a branchId query param generically (via InventoryReportsService.buildParams()), but ASP.NET Core simply ignores unbound query parameters, so picking a Branch in this report's filter UI has no effect on the result set today, even though the underlying SP is fully ready for it.
- Sales Return inward and Sales Invoice/Purchase Return outward are entirely excluded whenever a branch filter is applied (AND v_branch_id IS NULL guards on those UNION branches in the SP), because those three tables have no branch_id column at all -- a real, deliberate, documented limitation of a branch-scoped run of this report (moot today since branch can't actually be selected per the point above, but will matter once the API gap is closed).
- Historical note (now fixed, not a live bug): before 133, GRNs that had already progressed to 'invoiced' status were excluded from inward, and DC outward wasn't UOM-converted -- both understated real stock movement. Both are corrected as of 133.

## Stock Ledger Report

Business purpose: transaction-level audit trail of every stock movement for a product -- running balance quantity and value, oldest-to-newest math applied but displayed newest-first. Used by Accountant, Warehouse, Admin.
Key filters/dimensions: Product, Warehouse, Branch (SP-level, see below), From/To Date, Customer, Supplier, Created By.
Frontend: slug stock-ledger, InventoryReportPageComponent.
Backend -- data source: inventory.sp_get_stock_ledger_report (105_remaining_reports_real_data.sql, UOM fix in 133, running-balance columns added in 134_stock_ledger_debit_credit_total.sql, location-generic rebase in 158). This report has no backing balance table at all -- it is derived as a UNION ALL directly over the source documents (inv_grn_items/inv_goods_receipts, inv_pi_items/inv_purchase_invoices where grn_id IS NULL, inv_sales_return_items, inv_delivery_challan_items, inv_sales_invoice_items where dc_item_id IS NULL, inv_purchase_return_items, and both legs of inv_stock_transfer_items), with a windowed running SUM(...) OVER (PARTITION BY product_id ORDER BY txn_date, sort_id) computing balanceQty/balanceValue at query time.
Known gaps or flags:
- Same API-layer branch gap as Stock Summary: the SP accepts branch_id, but GetStockLedgerReportAsync/ReportsController.GetStockLedgerReport only forward productId, warehouseId, fromDate, toDate -- no branchId. The UI's combined location picker again sends it, and it's again silently dropped server-side.
- Because Sales Return, direct Sales Invoice, and Purchase Return carry no branch_id column, a branch-scoped run of this report (once reachable) would omit those three document types entirely, by the same v_branch_id IS NULL guard pattern as Stock Summary.
- Stock Transfer rows deliberately record rate = NULL (a transfer moves value between locations without creating or destroying it), so a transfer never perturbs balanceValue -- correct by design, but worth knowing if a reconciliation expects every row to carry a rate.

## Warehouse-wise Stock Report

Business purpose: current quantity and value broken out by physical location, one row per product per location. Used by Warehouse, Admin, Business Owner.
Key filters/dimensions: Segment, Warehouse, Product; no From/To date (this is a point-in-time snapshot report, not a movement report).
Frontend: slug warehouse-wise-stock, InventoryReportPageComponent.
Backend -- data source: inventory.sp_get_warehouse_wise_stock (105, location-generic rebase in 158), reading inventory.vw_stock_location_balance joined to inv_products/inv_uom for unit cost and UOM display. This is the one stock report in this suite that is already fully branch-aware at the SP signature: it takes an optional branch_id, and its warehouse output field is location_name (COALESCE of warehouse or branch name).
Known gaps or flags: same API-layer gap as the other two stock reports -- GetWarehouseWiseStockAsync and its controller action only accept segmentId, warehouseId, productId; branch_id is not forwarded from the API despite the SP being ready for it.

## Low Stock Alert Report

Business purpose: products currently below their configured reorder level, with a computed shortage quantity and a Critical/Watch status (Critical = at or below half of reorder level -- a fixed split, not a configurable threshold). Used by Purchase, Warehouse, Business Owner.
Key filters/dimensions: Segment, Warehouse (+ Branch at SP level), Product filters, Created By.
Frontend: slug low-stock-alert, InventoryReportPageComponent.
Backend -- data source: inventory.sp_get_low_stock_alert (105, location-generic rebase in 158), reading vw_stock_location_balance joined to inv_products.reorder_level.
Known gaps or flags: same branchId-not-forwarded API gap as the other location-scoped stock reports. Critical/Watch threshold (50% of reorder level) is hardcoded in SQL, not a stored per-product or per-tenant setting.

## Pending Document Report

Business purpose: three concrete "still open" buckets in one list -- GRNs posted but not yet vendor-invoiced, Delivery Challans dispatched but not yet sales-invoiced, and Sales Order lines not yet fully delivered. Used by Business Owner, Admin, Purchase, Sales, Warehouse.
Key filters/dimensions: Segment only (plus client-side Customer/Supplier/Product/Status/Created By/Approved By matching against whatever fields the rows happen to carry). No Warehouse or Branch filter at all -- not offered by the SP, and the report's own filters array in the registry does include branchId/warehouseId in the UI, but neither is passed to the backend nor present on the returned rows, so picking one is a complete no-op both server- and client-side.
Frontend: slug pending-document, InventoryReportPageComponent.
Backend -- data source: inventory.sp_get_pending_document_report (105), a 3-way UNION ALL over inv_goods_receipts (no posted/paid PI exists for it), inv_delivery_challans (dispatch qty exceeds invoiced qty), and inv_sales_orders (order qty exceeds delivered qty).
Known gaps or flags: "PO pending GRN" -- the most intuitive fourth bucket -- is explicitly not included, documented in the migration itself: inv_goods_receipts has no po_id column anywhere in this schema (GRN only links back to rfq_id), so that linkage genuinely cannot be queried without a schema change.

## Purchase Order Register

Business purpose: PO-level register -- supplier, product count, gross/tax/net amount, approval status. Used by Purchase, Accountant, Admin.
Key filters/dimensions: Segment and date range only, server-side. The report's filters definition also exposes Warehouse/Branch, Supplier, Product, Status, Created By, Approved By in the UI, but only segmentId/fromDate/toDate actually reach the backend (GetPurchaseOrderRegisterAsync(ctx, segmentId, fromDate, toDate)), and the returned rows (poDate, poNo, supplier, productCount, grossAmount, taxAmount, netAmount, status) carry no warehouse/branch/product field for the client-side fallback filter to match against either -- so Warehouse/Branch/Product filters are pure UI decoration on this report today.
Frontend: slug purchase-order-register, InventoryReportPageComponent.
Backend -- data source: inventory.sp_get_purchase_order_register (105), reading inv_purchase_orders directly (with a SELECT COUNT(*) FROM inv_po_items subquery for product count).
Known gaps or flags: filter/backend mismatch described above applies identically to the next five register reports (GRN, PI, SO, DC, SI) -- noted once here in full, referenced briefly below.

## GRN Register

Business purpose: goods-receipt register -- received/accepted/rejected quantity and status per GRN. Used by Warehouse, Purchase, Accountant.
Key filters/dimensions: Segment + date range effective server-side (same UI/backend filter mismatch as Purchase Order Register above -- Warehouse/Branch/Supplier/Product/UOM/Status filters shown in the UI are not applied server-side and the rows carry no matching fields client-side).
Frontend: slug grn-register, InventoryReportPageComponent.
Backend -- data source: inventory.sp_get_grn_register (105), reading inv_goods_receipts with inv_grn_items subqueries for received/accepted/rejected sums.
Known gaps or flags: same filter/backend gap as Purchase Order Register.

## Purchase Invoice Register

Business purpose: purchase-invoice register for accounts/tax/supplier reconciliation -- taxable amount, CGST/SGST/IGST split, net amount. Used by Accountant, Purchase, Admin.
Key filters/dimensions: Segment + date range effective server-side; Supplier/HSN-SAC/Status/Created By/Approved By shown in UI but not enforced server-side (no matching row fields for client-side fallback either).
Frontend: slug purchase-invoice-register, InventoryReportPageComponent.
Backend -- data source: inventory.sp_get_purchase_invoice_register (105), reading inv_purchase_invoices directly.
Known gaps or flags: same filter/backend gap pattern.

## Sales Order Register

Business purpose: SO register -- order value, tax, fulfilment status. Used by Sales, Warehouse, Business Owner.
Key filters/dimensions: Segment + date range effective server-side; Customer/Product/Status/Created By/Approved By shown in UI but not enforced server-side.
Frontend: slug sales-order-register, InventoryReportPageComponent.
Backend -- data source: inventory.sp_get_sales_order_register (105), reading inv_sales_orders directly.
Known gaps or flags: same filter/backend gap pattern.

## Delivery Challan Register

Business purpose: dispatch/delivery register with logistics detail (vehicle, transporter). Used by Warehouse, Sales, Admin.
Key filters/dimensions: Segment + date range effective server-side; Customer/Product/Status/Created By/Approved By shown in UI but not enforced server-side.
Frontend: slug delivery-challan-register, InventoryReportPageComponent.
Backend -- data source: inventory.sp_get_delivery_challan_register (105), reading inv_delivery_challans directly.
Known gaps or flags: same filter/backend gap pattern.

## Sale Invoice Register

Business purpose: sales-invoice register with taxable amount, GST split, net value. Used by Accountant, Sales, Business Owner.
Key filters/dimensions: Segment + date range effective server-side; Customer/Product/HSN-SAC/Status/Created By/Approved By shown in UI but not enforced server-side.
Frontend: slug sales-invoice-register, InventoryReportPageComponent.
Backend -- data source: inventory.sp_get_sales_invoice_register (105), reading inv_sales_invoices directly.
Known gaps or flags: same filter/backend gap pattern as the other five register reports.

## HSN/SAC Summary Report

Business purpose: GST compliance report -- quantity, taxable value, tax, and net value grouped by HSN/SAC code, from posted Sales Invoices. Used by Accountant, Admin, Compliance.
Key filters/dimensions: Segment + date range server-side; HSN/SAC, Product Category, Customer, Supplier, Status shown in UI but not enforced server-side or matchable client-side (rows carry only hsnSacCode, no category/customer field).
Frontend: slug hsn-summary (alias target of the legacy hsn-sac-report), InventoryReportPageComponent.
Backend -- data source: inventory.sp_get_hsn_summary (105), reading inv_sales_invoice_items/inv_sales_invoices/inv_products.hsn_sac_code.
Known gaps or flags:
- The description column is populated with the HSN/SAC code itself repeated, not an actual tariff description ('description', x.hsn_sac_code in the SQL) -- there is no HSN/SAC master/description table joined in. A user reading this report sees the code twice, not a human-readable description.
- CGST/SGST are always split 50/50 of total tax, and IGST is hardcoded to 0 ('igst', 0) regardless of whether a sale was actually interstate. For any tenant doing interstate sales (which should be IGST-only, not CGST+SGST), this report's tax split is simply wrong for those invoices -- a real compliance-reporting gap, not just a display nuance.
- No Purchase-side HSN/SAC reporting exists (this report is Sales-only).

## Batch / Serial / Expiry Report

Business purpose: operational batch/serial/expiry tracking in one view -- manufacturing date, expiry date, days-to-expire, quantity, value, status (Near Expiry / In Stock / etc.). Used by Warehouse, Quality, Admin, Business Owner.
Key filters/dimensions: Product only, server-side (GetBatchSerialExpiryReportAsync(ctx, productId)); every other filter shown in the UI (Segment, Warehouse, Branch, Category, dates, Batch/Serial number text, Customer, Supplier, Status) is not applied server-side.
Frontend: slug batch-serial-expiry, InventoryReportPageComponent.
Backend -- data source: inventory.sp_get_batch_serial_expiry_report (105).
Known gaps or flags: the narrowest server-side filter set of any report in this suite (product only) -- Warehouse/Branch/Date-range filtering is entirely a UI affordance with no backend or client-side effect for this one.

## Product Profitability Report

Business purpose: per-product sales value, purchase cost, gross profit, and margin %. Used by Business Owner, Accountant, Sales.
Key filters/dimensions: Segment, Product, and date range server-side; Category/Brand/Customer/Status shown in UI but not enforced server-side.
Frontend: slug product-profitability, InventoryReportPageComponent.
Backend -- data source: inventory.sp_get_product_profitability (105).
Known gaps or flags: uses the product's current rolling cost_price against each sale's historical rate, not a true point-in-time cost-of-goods-sold -- accurate for recent sales, approximate for older ones (an explicit, accepted tradeoff documented in the SQL, and the same pattern reused by Loss Sales below -- there is no per-line cost-at-time-of-sale persisted anywhere in this schema).

## Loss Sales Report

Business purpose: flags posted Sales Invoice lines where the selling rate fell below the product's current cost price -- a floor check (loss on sale), unrelated to and independent of MRP ceiling checks. Used by Business Owner, Accountant, Sales.
Key filters/dimensions: Segment, Product, date range server-side; Category/Brand/Customer/Status shown in UI but not enforced server-side.
Frontend: slug loss-sales, InventoryReportPageComponent. A second, unfiltered/limited variant of the same underlying logic also feeds the Inventory Dashboard's "Loss Sales" KPI tile drill-down (section 4).
Backend -- data source: two procedures from 155_loss_sales_report.sql: inventory.sp_get_loss_sales_report (full filtered/paginated report shape) and inventory.sp_get_loss_sales_flags (bare capped array, dashboard drill-down, no date filter -- most-recent flagged lines regardless of the dashboard's period selector). Both join inv_sales_invoice_items/inv_sales_invoices against inv_products.cost_price where rate < cost_price.
Known gaps or flags: same current-cost-vs-historical-rate tradeoff as Product Profitability, explicitly documented as intentional in the migration (not a bug, and explicitly called out as not to be "fixed" by adding cost-at-time-of-sale tracking, which is out of scope).

## Stock Valuation Comparison Report

Business purpose: for one product and a hypothetical quantity, shows side-by-side what FIFO, LIFO, and Weighted-Average would each charge, computed from that product's real, currently-open cost layers -- a "what would each method say" tool, not a filtered list report. Used by Business Owner, Accountant.
Key filters/dimensions: Product (required) + hypothetical quantity picker only. Explicitly not warehouse/branch/variant-scoped -- the report pools every open cost layer for the product across all locations, matching how cost_price itself is treated as one company-wide figure per product elsewhere in this system, not a per-location one.
Frontend: bespoke route reports/stock-valuation-comparison, component StockValuationComparisonComponent (Inventory_Reports/stock-valuation-comparison/) -- product/qty picker, three app-stat-card panels (one per method), a bar chart, and the underlying open cost-layer table. Not rendered by InventoryReportPageComponent.
Backend -- data source: inventory.sp_get_stock_valuation_comparison (151_stock_valuation_comparison_report.sql), reading inventory.inv_stock_cost_layers (open layers only, remaining_qty > 0) and inv_products for the fallback cost price. Read-only and non-destructive -- it never writes remaining_qty, unlike the real consumption function it mirrors.
Known gaps or flags: the Weighted-Average branch of this report deliberately, faithfully reproduces a real double-charge bug that exists in the live posting engine (fn_consume_stock_cost_layers, 139_stock_valuation_engine.sql): when the hypothetical quantity exceeds total open layer quantity, the real posting function charges the entire hypothetical quantity at the blended average rate and then unconditionally adds the shortfall portion again at the product's fallback cost price -- a genuine double-charge on that edge case. The report's own migration comment is explicit that this is reproduced on purpose (so this report shows what a REAL Weighted-Average posting would actually charge today, bug included, rather than a "corrected" number that would mislead the business owner) and flags it for the dev team to fix in the live engine -- not in this report. Anyone reading a Weighted-Average comparison number for a shortfall scenario should be aware it currently overstates cost.

## Inventory Audit Trail Report

Business purpose: intended as a chronological trail of create/update/approve/delete actions across inventory masters and transactions, for compliance review. Used by Admin, Accountant, Business Owner.
Key filters/dimensions: as defined in the registry (Segment, Warehouse/Branch, dates, Created By, Approved By) -- entirely moot, see below.
Frontend: slug inventory-audit-trail, rendered by InventoryReportPageComponent, which will call GET /api/reports/inventory-audit-trail on generate -- but that endpoint does not exist on ReportsController, so every real attempt to generate this report returns a 404/failure and the page falls back to its own honest empty-table-plus-error-message state (see section 3's note on the redesigned page's error handling). Before the user clicks Generate, the page shows the registry's static sampleRows (3 fabricated audit entries) as a preview only.
Backend -- data source: none. ReportsController.cs's own file-level comment states this plainly: "Inventory Audit Trail is not here -- no field-level change-history table exists anywhere in this schema to query, so it's left on sampleRows rather than fabricating one."
Known gaps or flags: this is the one report in the entire suite that is fully unimplemented rather than partially filtered -- there is no audit/change-history table anywhere in the inventory schema for it to read from. Building it for real would require either a generic audit-log table fed by triggers/application code across every inventory master and transaction table, or a narrower, purpose-built log for specific high-value actions (e.g. approvals, cancellations) -- neither exists today.

---

## 6. Legacy dead-code report screens (documented for completeness, not reachable)

Four screen configs in Inventory_Shared/inventory-screen.model.ts -- stockAvailabilityReportConfig, stockLedgerConfig, segmentSummaryConfig, hsnSacReportConfig -- and their wrapping components (Inventory_Reports/stock-availability-report/, stock-ledger/, segment-summary/, hsn-sac-report/) are not referenced by any route in inventory_routs.ts. They render through InventoryInteractiveReportComponent, whose entire 12-row dataset is a compile-time-hardcoded array (readonly rows: ReportRow[] = [...]) with client-side filter/sort/group/CSV-export built entirely on top of that static array -- there is no HttpClient usage anywhere in that component. These predate the redesigned Inventory_Reports/report-page engine and appear to have been left in the tree rather than deleted once their slugs were superseded by the alias table in section 3. They are not part of the live user-facing surface and require no further action beyond this note unless someone re-links them.

## 7. Summary of systemic, cross-report gaps

For a maintainer scanning this file for "what to fix next" rather than reading every section:

1. Branch filtering is a UI-only affordance for almost every report. Only four stored procedures (Stock Summary, Stock Ledger, Warehouse-wise Stock, Low Stock Alert) were updated for branch-awareness in 158_stock_reports_location_generic.sql, and even for those, the .NET controller/service layer never forwards a branchId parameter -- so branch filtering doesn't work end-to-end for any report today, despite the frontend's combined Warehouse/Branch picker being shown (and functional-looking) on nearly every report. For the remaining reports (both registers, Pending Document, HSN Summary, Batch/Serial/Expiry, Product Profitability, Loss Sales), Warehouse/Branch was never a real filter to begin with, and the rows those reports return carry no warehouse/branch field for the client-side fallback filter to catch either -- picking Branch or Warehouse on those reports is pure decoration.
2. The client-side filter fallback in InventoryReportPageComponent silently no-ops whenever a row lacks the matching field, rather than surfacing that the filter had no effect -- worth knowing before trusting a filtered result count on any report beyond Stock Summary/Stock Ledger/Warehouse-wise Stock/Low Stock Alert.
3. HSN/SAC Summary's tax split is wrong for interstate sales (hardcoded IGST = 0, CGST/SGST always 50/50 of total tax) -- a real compliance-reporting defect, not a display quirk.
4. Stock Valuation Comparison's Weighted-Average shortfall math intentionally reproduces a double-charge bug that also exists in the live posting engine (fn_consume_stock_cost_layers) -- flagged in the migration for a future fix to the engine, not the report.
5. Inventory Audit Trail Report has no backend at all -- always shows fabricated sample rows in preview, then an honest empty/error state on generate.
6. The Inventory Dashboard was not revisited for the Warehouse/Branch Independence project -- its Warehouse Stock panel and Stock-by-Product location field only understand warehouses, not branches, unlike the five stock-report procedures.
7. MIS Report's Admin-only restriction is enforced client-side only -- the backend endpoint has no server-side role check beyond ordinary tenant scoping, consistent with (not an exception to) this app's broader non-blocking-guard pattern.
8. No dedicated dead-stock/slow-moving/stock-ageing report exists yet, despite several UI copy fragments elsewhere in the module (e.g. INVENTORY_KPIS's "Slow moving products" summary card fallback value) implying one is expected.
