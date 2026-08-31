# Inventory Module — Masters & Setup

Author's note: produced by walking the live frontend config (`inventory-screen.model.ts`), the live shell logic (`inventory-screen-shell.ts`), the two real controllers (`InventoryConfigController`, `InventoryMastersController`), `InventoryDataService.cs`, and the actual latest `CREATE OR REPLACE` of every stored procedure in `Database/Migrations/inventory/`. Where a screen looks wired but isn't, or a validation is UI-only, that is called out explicitly — this document is for planning migrations, not for presenting a polished facade.

Cross-cutting note used throughout this file: **Full Warehouse/Branch Independence.** As of migration 167 (`167_warehouse_upsert_branch_freeze.sql`), a warehouse's `branch_id` column is legacy/frozen — `sp_upsert_warehouse`'s UPDATE path deliberately never touches `branch_id` again (only INSERT still accepts it, harmlessly). Branch and Warehouse are independent peer location types; nothing in the current write path resolves "the branch a warehouse belongs to," and no screen should be described as if Warehouse is a child of Branch. Both are still linked at the *read* layer only by whatever `branch_id` value already existed before the freeze.

---

## Business Segments

**Business purpose:** A Business Segment (e.g. Electronics, Agro Product, Co-working Space, Hotel/Restaurant) is the top-level business-line dimension the whole Inventory module scopes itself by. Without it, a single company running multiple, operationally-unrelated business lines (a common Kapil Group pattern) would have one undifferentiated pool of categories, UOMs, brands, vendors, customers and products — a "KG" of rice and a "KG" of steel would collide in the same UOM list, and every report would mix unrelated businesses together.

**Where it's used:** Segment is a foreign key/filter on almost every other master in this document — UOM, Category (via mapping), Brand, Attribute, Product Group, Variant, Serial/Batch Policy, Consumption Type, Vendor, Customer, Product/Service, Branch config, Warehouse. It is the first field on nearly every master form and on most transaction screens.

**Key fields & business rules:**
- `segmentName` (maps to `segment_code`/`segment_name`), `category`/`relatedHsnSac`/`typicalUoms` (multiselect, illustrative/reference only), `usageNote`.
- Segment code is unique per company (`UNIQUE (company_id, segment_code)`); no cross-company sharing.
- Most segment-scoped masters (Brand, Product Group, Variant, Serial/Batch Policy, Consumption Type, Vendor, Customer, Product) enforce **name/code uniqueness per segment, not per company** (migration 024): the same code can exist in two different segments of the same company, but not twice in the same segment. Category, UOM, Payment Terms and Product Type/Item Type are deliberately **company-wide**, not segment-scoped (UOM later became segment-aware in migration 039 as an added dimension, layered on top — see UOM Master below).
- Uniqueness checks are **active-status only** (`WHERE status = 'active'`) — a soft-deleted/inactive record's code or name never blocks re-creating a new active one with the same value.

**Frontend:** config key `businessSegments`; component `Inventory_Config/business-segments/business-segments.ts`.

**Backend — tables:**
- `inventory.inv_segments` — `id`, `company_id`, `segment_code`, `segment_name`, `usage_note`, `status`. Core segment record.
- `inventory.inv_segment_categories`, `inventory.inv_segment_hsn_sac`, `inventory.inv_segment_uom` — pure join tables mapping a segment to allowed categories/HSN-SAC codes/UOMs. These are curation lists only; they don't block a save if empty (see UOM/Category fallback chain below).

**Backend — stored procedures:**
- `sp_get_segments` — lists segments for a company (`002...`/`005_inventory_phase2_procedures.sql`).
- `sp_upsert_segment` — insert/update a single segment (`005_inventory_phase2_procedures.sql`).
- `sp_batch_save_segments` — bulk insert/update, used by the batch-save grid pattern shared with Branch Master.

**Known gaps or flags:** The `category`/`relatedHsnSac`/`typicalUoms` fields on the config's illustrative "Segment-wise Configuration Examples" table are documentation/reference rows only (`INVENTORY_SEGMENTS`, hardcoded in the frontend model) — they are not what the real save payload persists; the actual saved record is just code/name/usage note.

---

## Branch Master

**Business purpose:** Represents a physical or logical place of business (Head Office, a store, a project yard, a restaurant outlet) for GST/legal and access-control purposes. It exists so GSTIN, activity type and default location can be attached to "the place this document belongs to," and so per-user branch access control has something to scope against.

**Where it's used:** Access control (which users can see which branch's data), branch-wise reporting, and as one side of the merged Warehouse/Branch picker on GRN, Purchase Invoice, Delivery Challan, Purchase Return, Sales Invoice, Sales Return, Opening Stock Entry and Stock Adjustment. Branch is **not** a parent of Warehouse (see the Full Warehouse/Branch Independence note above) — a transaction can post directly against a Branch with no warehouse involved at all.

**Key fields & business rules:**
- The frontend doesn't create a branch from scratch inside Inventory — it **reuses branches already registered in Settings** (`AccessControlService.getBranches()`, backed by `global.branches`), merged with the current session's tenant/registration branch list, and lets the user attach a Business Segment + status to that branch for Inventory purposes. A "quick add" popup can create a brand-new Settings branch inline (auto-generating a `branch_code` like `TWO-001` from initials + a sequence number) if the wanted branch doesn't exist yet.
- Branch **code uniqueness** is enforced at save time in `sp_upsert_branch_inv`: if no code is supplied, one is auto-generated from the branch name and de-duplicated with a numeric suffix loop, scoped to `company_id`.
- Segment selection is required once any segments exist (`this.segments().length && !this.segmentId()` blocks adding to the pending grid) — no segments means no forced requirement.
- Saves are staged into a "pending" grid client-side and committed in one batch call (`saveAll()` → `batchSaveBranchesInv`) — matches the same batch-grid UX as several other config screens.
- There is **no single "one default branch per company" enforcement** for `is_head_office` — unlike Warehouse's `is_default` (which the backend explicitly unsets on every other row when a new default is saved), Branch's `is_head_office` flag is stored as-is with no such reset logic in `sp_upsert_branch_inv`. Multiple branches could end up flagged head office with no procedure blocking it.

**Frontend:** config key `branchMaster`; component `Inventory_Config/branch-master/branch-master.ts` (extends nothing — hand-written form, does not use the generic `InventoryScreenShell` fields loop the way most masters do).

**Backend — tables:**
- `global.branches` — the real, company-wide branch registry (created in the Settings/Access-Control module, not Inventory). Columns: `id`, `company_id`, `branch_code`, `branch_name`, `email`, `mobile`, `address`, `city`, `state`, `country`, `pincode`, `is_head_office`, `status`.
- `inventory.inv_branch_config` — the Inventory-specific wrapper: `id`, `company_id`, `branch_id` (FK to `global.branches`), `segment_id`, `branch_name`/`branch_code` (denormalized copies), `gstin`, `pan`, address fields, `contact_name`/`contact_mobile`/`contact_email`, `activity_types` (JSONB array), `is_head_office`, `status`. `UNIQUE (company_id, branch_code)`.

**Backend — stored procedures:**
- `sp_get_branches_inv` — joined list of branch config rows (`111_branch_inv_global_schema_fix.sql`, latest).
- `sp_upsert_branch_inv` — creates/updates **both** `global.branches` and `inventory.inv_branch_config` in one call: if no `branch_id` is given it looks up an existing `global.branches` row by code first (to avoid a unique-violation on retry), otherwise inserts a new one, then upserts the `inv_branch_config` row pointing at it (`111_branch_inv_global_schema_fix.sql`).
- `sp_batch_save_branches_inv` — bulk version used by the pending-grid Save All action (`005_inventory_phase2_procedures.sql`).

**Known gaps or flags:** Migration 111 exists specifically because an earlier version of `sp_upsert_branch_inv` hardcoded `public.branches` after the table was relocated to the `global` schema, breaking every branch save with `relation "public.branches" does not exist` until fixed. `defaultWarehouse` is a frontend-config field (`branchMasterConfig.fields`) but Branch Master's actual hand-written component/template does not render the generic fields loop at all, so this field is dead in this screen specifically — it exists in the config object but not in the rendered form.

---

## Warehouse/Location Master

**Business purpose:** Represents a physical stock-holding location (a warehouse, a project yard, a manufacturing store, a kitchen store) — the place inventory quantity actually lives, distinct from the legal/organizational Branch concept.

**Where it's used:** One side of the merged Warehouse/Branch picker on nearly every stock-moving transaction (GRN, Purchase Invoice, Delivery Challan, Purchase Return, Sales Invoice, Sales Return, Stock Transfer, Stock Adjustment, Opening Stock Entry), plus stock reports (Stock Availability, Stock Ledger, Stock Valuation). As of Full Warehouse/Branch Independence, it is a **peer** of Branch, not scoped under it.

**Key fields & business rules:**
- `warehouse_code` auto-generates from the name (uppercased, alphanumeric-only, truncated to 8 chars, de-duplicated with a numeric suffix) if left blank — same pattern as Branch.
- `is_default` **is** exclusively enforced: saving a warehouse with `is_default = true` explicitly unsets `is_default` on every other warehouse for that company in the same procedure call, before the insert/update — a real "one default warehouse per company" rule (unlike Branch's `is_head_office`).
- **Branch field is frozen legacy** on the UPDATE path (see cross-cutting note above): the frontend's Warehouse Setup screen sends no `branch_id` at all (Phase 3 of the independence project removed that control), and the backend deliberately no longer overwrites `branch_id` on UPDATE, specifically to avoid silently nulling out a pre-167 warehouse's real historical link. INSERT still accepts `branch_id` harmlessly if ever supplied by another caller.

**Frontend:** config key `warehouseMaster`; component `Inventory_Config/warehouse-location-master/warehouse-location-master.ts`.

**Backend — tables:**
- `inventory.inv_warehouses` — `id`, `company_id`, `branch_id` (legacy/frozen), `segment_id`, `warehouse_code`, `warehouse_name`, address/city/state/district/country/pincode, `capacity`, `capacity_unit`, `is_default`, `status`. `UNIQUE (company_id, warehouse_code)`.
- `inventory.inv_locations` — sub-locations/bins within a warehouse (`location_code`, `location_name`, `location_type` in `storage`/`receiving`/`dispatch`/`quarantine`/`return`) — exists in the schema and has a real `sp_get_locations`/`sp_upsert_location` pair, but is **not** surfaced as a distinct screen in the frontend's master-screen list; it's dormant infrastructure for a bin-level feature that hasn't been built into the UI.

**Backend — stored procedures:**
- `sp_get_warehouses` — list (`002_inventory_config_procedures.sql`).
- `sp_upsert_warehouse` — insert/update; **latest is `167_warehouse_upsert_branch_freeze.sql`**, which removed `branch_id` from the UPDATE's SET list (previously an unconditional overwrite going back to migration 005, confirmed live and unconditional right up until this fix landed).
- `sp_batch_save_warehouses` — bulk save (`005_inventory_phase2_procedures.sql`).
- `sp_get_locations` / `sp_upsert_location` — for the dormant sub-location feature (`002_inventory_config_procedures.sql`).

**Known gaps or flags:** This is the screen with the single most consequential historical landmine in the whole masters set: any pre-migration-167 warehouse's `branch_id` reflects whatever was last written *before the freeze* and can no longer be changed through the UI at all (INSERT-only). Any code, report, or future migration that still assumes "a warehouse belongs to exactly one current branch" via this column is working from stale/frozen data, not a live relationship. `inv_locations` (bin-level) exists in the DB and API but has no corresponding master screen — a "looks buildable, isn't built" gap in the other direction.

---

## UOM Master

**Business purpose:** Defines the units products are measured, purchased, stocked and sold in (KG, Bag, Box, Litre, Nos), including whether decimals are allowed. Without it, purchase/sales lines would have no controlled vocabulary for quantity, and Product Master's base/purchase/sale UOM and conversion-factor logic would have nothing to reference.

**Where it's used:** Product/Service Master's Base UOM, Purchase UOM, Alternate UOM and Saleable UOM fields; every transaction line item's UOM column; UOM conversion (`fn_convert_uom`) used across purchase/sales transactions.

**Key fields & business rules:**
- `uomName`, `uomCode`, `uomSymbol`, `decimalAllowed` (Yes/No), `status`.
- UOM became **segment-scoped** in migration 039 (`inv_uom.segment_id`, with a real FK), on top of being company-wide: duplicate-code/name checks are scoped to `COALESCE(segment_id, 0)` per migration 024's segment-scoping pattern, so the same UOM code can legitimately exist once per segment.
- **Base UOM selection on Product Master follows a documented fallback chain** (migration 040's own comment): a Category's curated UOM list (`inv_category_uom`) is preferred first, then the segment's UOM list (`inv_segment_uom`), then the full company UOM list — Segment/Category scoping is designed to *never* block a save, only to narrow the dropdown; only "doesn't exist anywhere yet" forces a quick-add.
- Product-wise purchase/sale conversion factors (e.g. "1 Bag = 25 KG") are **not** configured here — the subtitle explicitly says so; that lives in Product/Service Master's UOM mapping section (`inventory.inv_product_uom_conversions`).

**Frontend:** config key `uomMaster`; component `Inventory_Masters/uom-master/uom-master.ts`.

**Backend — tables:**
- `inventory.inv_uom` — `id`, `company_id`, `segment_id`, `uom_code`, `uom_name`, `uom_symbol`, `is_system`, `decimal_allowed`, `is_base_uom`, `status`.
- `inventory.inv_segment_uom` — legacy segment↔UOM join table, superseded in practice by the direct `segment_id` column added in migration 039 but not dropped (kept as a "real-data fallback layer" per that migration's own comment).
- `inventory.inv_category_uom` — Category-level curated UOM list (migration 040), consulted before segment/company UOMs on Product Master's Base UOM field.

**Backend — stored procedures:**
- `sp_get_uoms` — list, segment-filterable (`039_uom_segment_scoped_master.sql`, latest).
- `sp_upsert_uom` — insert/update, segment-scoped duplicate checks (`039_uom_segment_scoped_master.sql`, latest).

**Known gaps or flags:** Two parallel segment-mapping mechanisms exist for UOM (`inv_segment_uom` join table from migration 004, and the direct `inv_uom.segment_id` column from migration 039) — migration 039's own comment confirms this is intentional layering, not a cleanup-pending duplication, but a future engineer unaware of that history could easily "fix" one without realizing the other is also live.

---

## HSN/SAC Mapping

**Business purpose:** Defines each HSN (goods) or SAC (services) tax classification code with its GST/CGST/SGST/IGST/Cess rates and links it to a Product Category, so that picking a Category on Product Master can auto-bind the correct tax code and rate instead of a user having to know and re-type it on every product.

**Where it's used:** Product/Service Master's "HSN/SAC (Auto Bind)" and "GST % (Auto from HSN/SAC)" fields; Sales/Purchase invoice tax calculation; HSN/SAC compliance reporting.

**Key fields & business rules:**
- `code`, `description`, `category` (Product Category — **free-text `VARCHAR(200)`, not an FK** to `inventory.inv_categories`), `gstRate`, `cgstRate`, `sgstRate`, `igstRate`, `cessRate`, `effectiveDate`, `status`.
- Code uniqueness is **global-vs-company split**: a unique index exists for `(code, hsn_type)` where `company_id IS NULL` (the shared/global tax-code library, populated by Tax Code Import) and a separate one for `(company_id, code, hsn_type)` where `company_id IS NOT NULL` (a company's own manually-entered/overridden codes) — so a company can define its own `8471` alongside the global one without collision.

**Frontend:** config key `hsnSacMapping` (screen titled "Tax Classification Master" in the UI); component `Inventory_Masters/hsn-sac-mapping/hsn-sac-mapping.ts`.

**Backend — tables:**
- `taxation.hsn_sac` — the actual master table (lives in the `taxation` schema, not `inventory`, despite being reached via the `/inventory/config/hsnsac` endpoint). Columns: `id`, `company_id` (nullable = global), `code`, `description`, `hsn_type` (enum `HSN`/`SAC`), `gst_rate`, `cgst_rate`, `sgst_rate`, `igst_rate`, `cess_rate`, `chapter`, **`category` (denormalized free text, not FK-linked to `inv_categories`)**, `remarks`, `source`, `source_updated_at`, `keywords`, `search_vector` (full-text search), `status`.
- `inventory.inv_segment_hsn_sac` — segment↔HSN/SAC curation join table (migration 004), analogous to `inv_segment_uom`.
- `inventory.inv_tax_code_map` — a product/service-level override table (`hsn_sac_id`, `override_gst_rate`, `review_status`, `notes`) defined in `taxation/001_taxation_core.sql`; exists in schema but not confirmed wired to a frontend screen in this master list.

**Backend — stored procedures:**
- `sp_get_hsn_sac` — search/list, with a `search` query param (`005_inventory_phase2_procedures.sql`).
- `sp_upsert_hsn_sac` — insert/update, including the `category` free-text field (`013_hsn_sac_category_upsert.sql`, latest).
- `quickAddHsnSac` (controller `/hsnsac/quick`) → `QuickAddHsnSacAsync` for the inline "+Add HSN/SAC" flow used from Product Master.

**Known gaps or flags:** `category` on `taxation.hsn_sac` is a plain string column, **not** a foreign key to `inventory.inv_categories` — renaming or deleting a Category does not cascade here, and a typo'd category name on an HSN/SAC row will simply fail to match anything rather than erroring. This is a real normalization gap worth fixing in a future migration if Category-driven auto-bind is expected to be reliable.

---

## Tax Code Import

**Business purpose:** Bulk-loads official GST/CBIC HSN and SAC code files (CSV/XLSX) into the shared tax-code library, so a company doesn't have to hand-enter thousands of HSN/SAC rows one at a time via HSN/SAC Mapping.

**Where it's used:** Populates the same `taxation.hsn_sac` table that HSN/SAC Mapping reads from and that Product Master's HSN/SAC picker searches (`searchTaxCodes` → `/tax-codes/search`).

**Key fields & business rules:**
- `sourceName`, `sourceUpdatedAt`, `taxCodeFile` (CSV/XLSX upload).
- Import is parsed entirely in C# (`TaxCodeService.ImportAsync`) — reads CSV or unzips/parses XLSX manually, infers HSN vs SAC from headers/context, de-duplicates by `(type, code)` within the file (later duplicate rows are merged into the first, counted as `DuplicatesRemoved`), then does a single-row-at-a-time parameterized `INSERT ... ON CONFLICT (code, hsn_type) WHERE company_id IS NULL DO UPDATE`.
- Every imported row is written with **`company_id = NULL`** — i.e. it always lands in the shared/global tax-code pool, never scoped to the importing company. This matches the "global HSN library" unique index described above, but means Tax Code Import cannot be used to seed a *company-specific* override list — only HSN/SAC Mapping's manual entry can do that.
- Rows failing validation (missing/invalid code, missing description, invalid type) are skipped and reported in the response summary rather than failing the whole import.

**Frontend:** config key `taxCodeImport`; component `Inventory_Config/tax-code-import/tax-code-import.ts`.

**Backend — tables:** `taxation.hsn_sac` (writes directly; company_id always NULL), `taxation.gst_rate_slabs` and `taxation.gst_rate_guide_notes` (also populated from the same import file if it contains GST-guide sheets, via `ImportGstGuideAsync`).

**Backend — stored procedures:** **None** — this is the one screen in this document whose persistence is a raw parameterized SQL statement executed directly from C# (`TaxCodeService.cs`), not a `sp_save_*`/`sp_get_*` stored procedure. `TaxCodesController` (`api/tax-codes/*`) is a separate controller from the two Inventory controllers, backed by `ITaxCodeService`/`TaxCodeService`, not `IInventoryDataService`.

**Known gaps or flags:** The screen's own `outputImpact` text says "Users must still verify GST classification before filing" — an honest, self-flagged caveat that this is unaudited bulk data, not an automatic compliance guarantee. Because every import lands with `company_id = NULL`, there's no import history/audit trail scoped per company — only the shared `source`/`source_updated_at` columns on each row, which get overwritten on every re-import of the same code.

---

## Vendor Master

**Business purpose:** The record of a supplier or service provider a company buys from — supplier identity, tax IDs, payment terms, credit limit and bank details, needed before any Purchase Order/GRN/Purchase Invoice can reference "who this was bought from."

**Where it's used:** Purchase Order, GRN, Purchase Invoice, Purchase Return, Vendor Payment, procurement reports, and Vehicle Master's "Owner/Vendor" field for hired-vehicle logistics.

**Key fields & business rules:**
- Name/Company Name (sourced from a Global Contact picker), Vendor Code, Business Segment, GSTIN, PAN, Contact Person, Mobile/Email (from Global Contact), Address, Payment Terms, Credit Limit, Bank Details (structured — see below), Status.
- Vendor name is **unique per segment** (`UNIQUE (company_id, segment_id, vendor_name)`), vendor code unique per company.
- **Multiple GSTINs per vendor are supported** (migration 140): `inventory.inv_vendor_gstins` holds one row per (vendor, state, GSTIN) with one flagged `is_primary`. The legacy flat `inv_vendors.gstin` column is kept in sync with whichever row is primary (or the first row, or NULL if empty) specifically so every existing consumer (PO/GRN/PI header auto-fill, the interstate-GST function, reports) keeps working unchanged without being rewritten.
- **Bank Details is a structured field set** (Payee Name, Account No., IFSC, Bank, Branch — migration 127), not the free-text field the original `partyMaster()` config comment describes; IFSC-driven bank/branch auto-populate happens client-side via a live external IFSC lookup API, no local IFSC table. The old free-text `bank_details` column is left in the table, untouched, holding only pre-migration-127 data — it is dead going forward.
- The "Global Contact" picker is **not** the hardcoded 5-entry static list the UI text used to imply — as of migration 047 it's backed by a real `inventory.inv_contacts` table, and as of migration 066 it additionally merges in **read-only, live results from the legacy Accounts module's `global.tbl_mst_contact`** table (a completely different schema/table, string-keyed by `company_code`/`branch_code` rather than the numeric IDs Inventory otherwise uses). A saved vendor's `contact_id` is paired with a `contact_source` column (`'inv_contacts'` vs `'global_contact'`) specifically so it's possible to tell which of the two tables the ID actually points into.

**Frontend:** config key `vendorMaster` (built by the shared `partyMaster()` factory function); component `Inventory_Masters/vendor-master/vendor-master.ts`.

**Backend — tables:**
- `inventory.inv_vendors` — `id`, `company_id`, `segment_id`, `payment_term_id`, `vendor_code`, `vendor_name`, `vendor_type` (Company/Individual), `gstin` (legacy flat, kept in sync), `pan`, mobile/email/address, `credit_limit`, `bank_payee_name`/`bank_account_no`/`bank_ifsc_code`/`bank_name`/`bank_branch_name` (structured, migration 127), `bank_details` (legacy free-text, dead), `contact_id`, `contact_source`, `status`.
- `inventory.inv_vendor_gstins` — multi-GSTIN child table (migration 140): `vendor_id`, `state_name`, `state_code`, `gstin`, `is_primary`, `status`.
- `inventory.inv_contacts` — the real Global Contact store added in migration 047 (used for the "+Add Global Contact" quick-add).

**Backend — stored procedures:**
- `sp_get_vendors` — list with joined GSTIN rows (`140_vendor_customer_multi_gstin.sql`, latest).
- `sp_upsert_vendor` — insert/update; accepts an optional `gstins` JSONB array and does a full delete+reinsert sync of `inv_vendor_gstins` **only when the payload actually includes the `gstins` key**, so an older/partial caller omitting it never wipes existing GSTIN rows (`140_vendor_customer_multi_gstin.sql`, latest).
- `sp_get_contacts` / `sp_upsert_contact` — Global Contact CRUD (`047_contacts_master.sql`).
- `sp_get_global_contacts` — the read-only legacy-Accounts-contact lookup, degrading to an empty list if the legacy `global` schema/table isn't present in an environment (`066_vendor_global_contacts.sql`).

**Known gaps or flags:** The dormant `bank_details` free-text column is a real landmine for anyone querying vendor bank info directly — post-migration-127 data lives in the structured columns, but any vendor untouched since before that migration still has its (now-invisible-to-the-UI) bank info only in the old column. The dual global-contact-source design (`inv_contacts` + legacy `tbl_mst_contact`) means a naive `JOIN inventory.inv_contacts ON contact_id` will silently miss any vendor whose `contact_source = 'global_contact'`.

---

## Customer Master

**Business purpose:** The record of a customer, tenant, buyer or client a company sells to — mirrors Vendor Master's structure for the sell-side, needed before Estimation/Sales Order/Sales Invoice/POS can reference "who this was sold to."

**Where it's used:** Estimation, Proforma Invoice, Sales Invoice, POS billing, Customer Receipt, receivables and customer reports; also referenced by Price List Master's "Applicable Branch"-style customer-type default rate selection.

**Key fields & business rules:** Same shared `partyMaster()` structure as Vendor Master, with two customer-only additions:
- **Shipping Address** — a genuinely separate field from Billing Address, added in migration 145 with real backing storage. The migration's own comment is a notable honesty flag: this field existed in the frontend config from day one but was "never actually rendered" because Customer Master hand-writes its own form rather than using the generic fields loop, and had **no backing storage at all** until this migration.
- **Price List** selector (Retail/Dealer/Corporate) — customer-only, vendor doesn't get this field.
- Same multi-GSTIN pattern as Vendor (`inv_customer_gstins`, migration 140) and the same structured Bank Details fields (migration 127) — Customer Master reached backend parity with Vendor Master by migration 145, including its own `contact_id`/`contact_source` Global-Contact wiring.
- Customer name unique per segment; customer code unique per company (`UNIQUE (company_id, segment_id, customer_name)`, `UNIQUE (company_id, customer_code)`).

**Frontend:** config key `customerMaster` (also built by `partyMaster()`); component `Inventory_Masters/customer-master/customer-master.ts`.

**Backend — tables:**
- `inventory.inv_customers` — mirrors `inv_vendors` column-for-column, plus `shipping_address TEXT` (migration 145). `payment_term_id`, `credit_limit`, structured bank columns, `contact_id`/`contact_source`.
- `inventory.inv_customer_gstins` — multi-GSTIN child table, same shape as the vendor version.

**Backend — stored procedures:**
- `sp_get_customers` / `sp_upsert_customer` — latest full redefinition in `145_customer_shipping_address.sql` (which explicitly matches the shape of `140_vendor_customer_multi_gstin.sql`'s bodies, adding only `shipping_address`).

**Known gaps or flags:** Same bank-details dead-column caveat as Vendor Master applies here too. The Shipping Address history is worth remembering specifically because it's a textbook example of this codebase's "config claims a field exists, frontend never rendered it, no backend ever backed it" pattern called out in the cross-cutting instructions for this document set — it was real, in writing, for an unknown period before anyone noticed it was fully inert.

---

## Product Group Master

**Business purpose:** A sub-grouping below Category (e.g. "Mobile Devices" under the "Mobile & Accessories" category) used for browsing, reporting and rule mapping — a finer classification than Category without going all the way to individual Attributes/Variants.

**Where it's used:** Product/Service Master (product group assignment), product search/filtering, stock summaries and MIS reporting.

**Key fields & business rules:**
- `groupName`, `groupCode`, `linkedCategory` (select, addMaster-enabled), `description`, `status`.
- Segment- and category-scoped: `inv_product_groups.category_id` FKs to `inv_categories`, `segment_id` FKs to `inv_segments`.
- Group name unique per segment (`UNIQUE (company_id, segment_id, group_name)`), group code unique per company, both active-status-only per the migration-024 pattern.

**Frontend:** config key `productGroupMaster`; component `Inventory_Masters/product-group-master/product-group-master.ts`.

**Backend — tables:** `inventory.inv_product_groups` — `id`, `company_id`, `segment_id`, `category_id`, `group_code`, `group_name`, `description`, `status`.

**Backend — stored procedures:**
- `sp_get_product_groups` — list, filterable by segment/category (`009_inventory_masters_dto_alignment.sql`).
- `sp_upsert_product_group` — insert/update with segment-scoped duplicate checks (`021_fix_all_duplicate_checks_product_type_master.sql`, latest).

**Known gaps or flags:** None found beyond the general segment-scoping caveats already noted; this is a genuinely simple, fully-wired master.

---

## Barcode Configuration

**Business purpose:** Defines the rule for how barcodes are generated (type, auto-generate on/off, prefix, starting number, length) and which products/categories they apply to — so labels, inward scanning and POS billing have a consistent, predictable barcode format instead of ad hoc values.

**Where it's used:** Product labels, GRN/inward scanning, POS billing scan-to-add, stock verification/cycle-count scanning.

**Key fields & business rules:**
- `categoryName` (Product Category), `barcodeType` (EAN-13 / Code 128 / QR Code / Internal SKU), `autoGenerate` (Yes/No), `prefix`, `startingNumber`, `length`, `applicableProducts` (multiselect).
- Uniqueness is `UNIQUE (company_id, barcode_type, prefix)` — two rules for the same barcode type can coexist only if they use different prefixes.
- `applicable_products` is stored as a plain Postgres `TEXT[]` array (product names/codes), **not** a normalized join table to `inv_products` — no referential integrity between this list and actual product records.

**Frontend:** config key `barcodeConfiguration`; component `Inventory_Masters/barcode-configuration/barcode-configuration.ts`.

**Backend — tables:** `inventory.inv_barcode_configurations` — `id`, `company_id`, `barcode_type`, `auto_generate`, `prefix`, `starting_number`, `barcode_length`, `applicable_products` (`TEXT[]`), `status`.

**Backend — stored procedures:**
- `sp_get_barcode_configurations` — list (`010_inventory_barcode_substitute_masters.sql`).
- `sp_upsert_barcode_configuration` — insert/update, duplicate-check fix applied in `021_fix_all_duplicate_checks_product_type_master.sql` (latest).

**Known gaps or flags:** Because `applicable_products` is a free-form text array rather than an FK-backed join table, renaming or deleting a product does not clean up or warn about any barcode rule that names it — a silent dangling reference, not a hard error, if a referenced product is later renamed.

---

## Vehicle Master

**Business purpose (as designed):** Intended to track owned, hired and third-party logistics vehicles (registration, capacity, driver, permit/insurance expiry) used for purchase delivery, dispatch and stock transfer.

**Where it's used (as designed):** Purchase receipt, dispatch, stock transfer, and logistics reports would reference a vehicle record, per the config's stated `outputImpact`.

**Key fields & business rules:** `vehicleNo`, `vehicleType` (Own/Hired/Transport Partner/Two Wheeler/Mini Truck/Container/Refrigerated), `ownerVendor` (linked to Vendor Master for hired vehicles), `assignedBranch`, `capacity`, `driverName`/`driverMobile`, `permitNo`, `insuranceExpiry`, `status`, `remarks`. None of this is enforced anywhere — see below.

**Frontend:** config key `vehicleMaster`; component `Inventory_Masters/vehicle-master/vehicle-master.ts` — a 19-line component that only sets `override readonly config = vehicleMasterConfig` on top of `InventoryScreenShell`, with no save/load overrides.

**Backend — tables:** **None.** No `inv_vehicles` (or equivalent) table exists anywhere in the migrations.

**Backend — stored procedures:** **None.** There is no `sp_get_vehicles`/`sp_upsert_vehicle` in `InventoryDataService.cs`, and no route for it in either `InventoryConfigController` or `InventoryMastersController`.

**Known gaps or flags:** This is a **fully static/mock screen** — confirmed absent from `isApiWired()` in `inventory-screen-shell.ts` (the shell's own explicit allowlist of which screen keys actually save to a real backend). The rows shown on screen are the hardcoded example rows baked into `vehicleMasterConfig.rows` in the frontend model; nothing typed into the form is ever persisted. Its `dependsOn` list even claims "Vendor Master for hired vehicles: Ready" and "Branch / Store Setup: Ready" — both real, wired masters — giving the misleading impression this screen is equally real. It is not.

---

## Substitute Products

**Business purpose:** Maps one product to an approved alternative product that sales, procurement or stock-issue staff can suggest/substitute when the original is out of stock (e.g. "if LED Display is unavailable, offer Smart Sensor").

**Where it's used:** Referenced conceptually by sales, procurement and stock-issue workflows as a picker fallback; both `product` and `substituteProduct` are drawn from Product/Service Master's product list.

**Key fields & business rules:**
- `product`, `substituteProduct`, `priority` (number, lower likely = first choice), `remarks`.
- Hard DB constraint: `CHECK (product_id <> substitute_product_id)` — a product cannot be its own substitute.
- Uniqueness: `UNIQUE (company_id, product_id, substitute_product_id)` — the same pair can't be mapped twice, but the same product can have many different substitutes (one row per pair, `priority` breaks ties).
- Cascade: both FKs are `ON DELETE CASCADE` — deleting a product hard-deletes any substitute mapping row that references it either as the original or the substitute.

**Frontend:** config key `substituteProducts`; component `Inventory_Masters/substitute-products/substitute-products.ts`.

**Backend — tables:** `inventory.inv_substitute_products` — `id`, `company_id`, `product_id`, `substitute_product_id`, `priority`, `remarks`, `status`.

**Backend — stored procedures:**
- `sp_get_substitute_products` — list (`010_inventory_barcode_substitute_masters.sql`).
- `sp_upsert_substitute_product` — insert/update (`010_inventory_barcode_substitute_masters.sql`).

**Known gaps or flags:** No transaction screen documented elsewhere in this project's history actually surfaces "suggest a substitute" at line-entry time — the master is real and saveable, but whether any Sales/Purchase screen actually reads from it at the point of stock-out is unconfirmed from this research; treat the "used in sales/procurement/issue" claim in `outputImpact` as aspirational unless verified against those screens' own documentation.

---

## Payment Terms Master

**Business purpose:** Defines standard credit terms (Immediate, 30 Days, Advance with Discount) — credit days and discount percentage — used to calculate due dates and default into vendor/customer records and purchase/sales documents.

**Where it's used:** Defaults into Vendor Master and Customer Master's `paymentTerms` field (both via `payment_term_id` FK), and referenced by name on Purchase Order/Sales Invoice for due-date and receivable/payable-ageing calculation.

**Key fields & business rules:**
- `termName`, `termCode`, `creditDays`, `discountPercent`, `description`, `status`.
- **Company-wide, not segment-scoped** — migration 024 explicitly lists `inv_payment_terms` as one of the tables deliberately left out of segment-scoping ("shared across segments"), unlike most of the other masters in this file.
- Both `term_code` and `term_name` are unique per company (`UNIQUE (company_id, term_code)`, `UNIQUE (company_id, term_name)`).

**Frontend:** config key `paymentTermsMaster`; component `Inventory_Masters/payment-terms-master/payment-terms-master.ts`.

**Backend — tables:** `inventory.inv_payment_terms` — `id`, `company_id`, `term_code`, `term_name`, `credit_days`, `discount_pct`, `description`, `status`.

**Backend — stored procedures:**
- `sp_get_payment_terms` — list (`008_inventory_masters_procedures.sql`).
- `sp_upsert_payment_term` — insert/update, duplicate-check fix applied in `021_fix_all_duplicate_checks_product_type_master.sql` (latest).

**Known gaps or flags:** None found; this is a simple, fully-wired, genuinely company-wide master with no landmines identified.

---

## Price List Master

**Business purpose (as designed):** Intended to maintain branch-wise product rates with effective date ranges (e.g. Retail vs Dealer vs Corporate pricing), so Estimation/Proforma/Sales Invoice/POS could auto-fill a rate from the customer's assigned price list instead of manual entry every time.

**Where it's used (as designed):** Sales Invoice, POS billing, Estimation/Proforma rate auto-fill, and is referenced by name from Vendor/Customer Master's "Price List" dropdown (customer-only field) as a hardcoded three-option list (`Retail Price List`, `Dealer Price List`, `Corporate Price List`) rather than a live lookup into this master.

**Key fields & business rules:** `priceListName`, `applicableBranch`, `product`, `rate`, `effectiveFrom`/`effectiveTo`, `status`. None of it is persisted — see below.

**Frontend:** config key `priceListMaster`; component `Inventory_Masters/price-list-master/price-list-master.ts` — a 19-line stub identical in shape to Vehicle Master's.

**Backend — tables:** **None.** No `inv_price_lists`/`inv_price_list_items` table exists in any migration.

**Backend — stored procedures:** **None.**

**Known gaps or flags:** Also absent from `isApiWired()`. This screen and Vehicle Master, BOM Master, Work Center Master, Approval Workflow Master and Transporter Master are the six masters in this document's scope that are **entirely static/mock** — real-looking UI, real-looking `dependsOn`/`outputImpact` copy, zero backend. Notably, the Customer Master's "Price List" *field* is even more disconnected than this screen itself: it's a hardcoded 3-value dropdown that doesn't query this master at all, so even if Price List Master were built out, Customer Master would still need separate work to actually consume it.

---

## Category Master

**Business purpose:** The primary product classification hierarchy (parent/child categories, e.g. Electronics → Mobiles) used to group products for browsing, defaulting, and rule application — the single most load-bearing master in the whole product-setup chain, because Category is where several other masters' default behavior actually attaches.

**Where it's used:** Product/Service Master (category selection, with several real defaulting behaviors — see below); Product Group Master (linked category); Brand Master (category association); HSN/SAC Mapping (free-text category name); Barcode Configuration (applicability); stock reports and MIS grouping.

**Key fields & business rules:**
- `categoryName`, `categoryCode`, `parentCategory` (self-referencing hierarchy via `parent_id`), `description`, `status`.
- Category is **company-wide**, not segment-scoped (migration 024 explicitly excludes it — segments map to categories only through the `inv_segment_categories` join table).
- **Category can carry a real default Serial Number Policy and Batch/Lot Policy** (migration 019): `inv_categories.serial_applicable`/`serial_policy_id` and `batch_applicable`/`batch_policy_id`, both real FKs (`ON DELETE SET NULL`) to `inv_serial_policies`/`inv_batch_policies`. This is what lets Product Master "inherit" tracking defaults from Category, per the config's own `outputImpact` text.
- **Category curates which UOMs are valid Base UOM choices** for products in it (migration 040): `inventory.inv_category_uom`, a join table, mirrors the segment-level UOM curation but at Category granularity and is checked *first* in the Base UOM fallback chain described under UOM Master.

**Frontend:** config key `categoryMaster`; component `Inventory_Masters/category-master/category-master.ts`.

**Backend — tables:**
- `inventory.inv_categories` — `id`, `company_id`, `category_code`, `category_name`, `parent_id` (self-FK), `description`, `serial_applicable`, `serial_policy_id`, `batch_applicable`, `batch_policy_id`, `status`. `UNIQUE (company_id, category_code)`.
- `inventory.inv_category_uom` — Category↔UOM curation join table.
- `inventory.inv_segment_categories` — Segment↔Category join table.

**Backend — stored procedures:**
- `sp_get_categories` — returns the resolved serial/batch policy names and curated UOM list alongside the category row (`040_category_uom_binding.sql`, latest).
- `sp_upsert_category` — insert/update, resolving policy names to IDs if only a name was supplied, with segment-scoped duplicate checks (`110_segment_scoped_category_upsert.sql`, latest).

**Known gaps or flags:** None found — this is a genuinely well-built master with real cross-master defaulting logic, not just a name/code list. The one thing worth flagging for future work: HSN/SAC Mapping's `category` field is a free-text string, not an FK to this table (see the HSN/SAC section above), so a rename here does not propagate there.

---

## Brand Master

**Business purpose:** Maintains brand names (Dell, Samsung, Own Brand) used to identify and search products by manufacturer/brand rather than just category — supports purchase analysis, sales reporting and item identification.

**Where it's used:** Product/Service Master's Brand field; purchase analysis and sales reports; stock search.

**Key fields & business rules:**
- `brandName`, `brandCode`, `categoryName` (hidden field in the config — `hidden: true` — present in the data model but not shown on the form), `manufacturer` (free-text, allows custom values), `brandLogo` (file upload), `description`, `status`.
- Brand name unique per segment (`UNIQUE (company_id, segment_id, brand_name)`), brand code unique per company; both scoped active-only per migration 024's pattern.

**Frontend:** config key `brandMaster`; component `Inventory_Masters/brand-master/brand-master.ts`.

**Backend — tables:** `inventory.inv_brands` — `id`, `company_id`, `segment_id`, `brand_code`, `brand_name`, `manufacturer`, `description`, `status`.

**Backend — stored procedures:**
- `sp_get_brands` — list (`008_inventory_masters_procedures.sql`).
- `sp_upsert_brand` — insert/update, duplicate-check fix in `021_fix_all_duplicate_checks_product_type_master.sql` (latest).

**Known gaps or flags:** The `categoryName` field is marked `hidden: true` in the frontend config, meaning it's defined in the data model (and would theoretically be part of a category-scoped brand list) but is not actually rendered/collectible on the form — `inv_brands` also has no `category_id` column at all, so there is nothing for that hidden field to bind to even if it were un-hidden. `brandLogo` (file upload) has no corresponding file-storage column on `inv_brands` — treat logo upload as unconfirmed/likely non-functional without further verification against a file-storage service.

---

## Attribute Master

**Business purpose:** Defines reusable product properties (Color, Storage Capacity, Grade, Spice Level) with a data type (List/Text/Number/Date/Dropdown/Multi-Select/Yes-No) and a mandatory flag, so Variant Master and Product Master can build structured variations instead of free-text SKU differentiation.

**Where it's used:** Variant Master (an attribute + one of its values = one variant); Product/Service Master (variant/attribute selection for a specific SKU).

**Key fields & business rules:**
- `attributeName`, `possibleValues` (tags input — array of strings, stored as JSONB, used when type is Dropdown/Multi Select), `attributeCode`, `attributeType`, `mandatoryFlag`, `status`.
- Attribute name unique per segment (`UNIQUE (company_id, segment_id, attribute_name)`).
- Migration 061 extended `sp_get_attributes`/`sp_upsert_attribute` to return per-value usage counts and support the normalized `inv_attribute_values`/product-linked `inv_variants` schema added (dormant) in migration 059 — additively, so nothing existing broke. Duplicate-name checks on attributes stay **active-status-only** by deliberate choice in migration 061 (it explicitly chose not to adopt migration 059's stricter any-status check, to stay compatible with what was live).

**Frontend:** config key `attributeMaster`; component `Inventory_Masters/attribute-master/attribute-master.ts`.

**Backend — tables:** `inventory.inv_attributes` — `id`, `company_id`, `segment_id`, `attribute_name`, `attribute_type` (CHECK-constrained to the 6 supported types), `possible_values` (JSONB array), `is_mandatory`, `status`. `UNIQUE (company_id, segment_id, attribute_name)`.

**Backend — stored procedures:**
- `sp_get_attributes` — list with values[]/usage_count/display_order (`061_attribute_variant_master_id_wiring.sql`, latest).
- `sp_upsert_attribute` — insert/update; a brand-new attribute-value text with no matching existing row is **auto-created inline** rather than raising an error (a deliberate behavioral choice, migration 061).

**Known gaps or flags:** None beyond the segment-scoping caveat already covered.

---

## Variant Master

**Business purpose:** Defines a specific, reusable variant value (e.g. "Black Color", "128GB Storage", "Grade A") tied to one Attribute, so Product/Service Master can attach a clean, structured set of variant values to a specific SKU rather than typing free text.

**Where it's used:** Product/Service Master's variant mapping section (an "Applicable Variants" picker, per `product-service-master.ts`'s `pickedVariantId`/`selectedApplicableVariants` logic).

**Key fields & business rules:**
- `variantName`, `variantCode`, `description`, `status`; `attribute_id` FK links a variant to exactly one Attribute, with `attribute_value` as the specific value under that attribute.
- Variant name unique per segment; variant code unique per company.
- `attribute_id` is `ON DELETE SET NULL` — deleting an Attribute doesn't cascade-delete its Variants, it just orphans the link.
- `inv_variants` schema was extended (dormant, migration 059) with SKU, barcode, price, cost, stock and image columns, and migration 061 explicitly documents that these were **wired for future use but never requested/activated** — the columns exist and are populated in the schema shape but not used by any live business logic today.

**Frontend:** config key `variantMaster`; component `Inventory_Masters/variant-master/variant-master.ts`.

**Backend — tables:** `inventory.inv_variants` — `id`, `company_id`, `segment_id`, `attribute_id` (FK, `ON DELETE SET NULL`), `variant_code`, `variant_name`, `attribute_value`, `description`, `status`, plus dormant `sku`/`barcode`/`price`/`cost`/`stock`/`images`/`sku_pattern` columns from migration 059.

**Backend — stored procedures:**
- `sp_get_variants` — list, filterable by segment/attribute/product (`061_attribute_variant_master_id_wiring.sql`, latest).
- `sp_upsert_variant` — insert/update (`061_attribute_variant_master_id_wiring.sql`, latest).
- `variants/generate-combinations` and `attribute-variants/bulk-import` endpoints exist on `InventoryMastersController` for multi-attribute combination generation and bulk import — confirm real usage against the Variant Master UI if depended on for planning, as this research did not trace their SP bodies in depth.

**Known gaps or flags:** The dormant SKU/barcode/price/cost/stock/image columns are a genuine "looks real but isn't" trap — a query or report author browsing the table schema would reasonably assume Variant Master tracks its own price/stock, but migration 061's own comment confirms none of that is populated by any live save path.

---

## Serial Number Policy

**Business purpose:** Defines category-level default rules for serial/IMEI tracking (whether required, at what stage it's captured — purchase inward, sales invoice, both, or warranty registration — and whether duplicates are allowed), so Product Master doesn't need every single warranty-tracked SKU configured by hand.

**Where it's used:** Bound to Category Master (`inv_categories.serial_policy_id`) so a category's products can inherit the default; overridable per-product on Product/Service Master; consulted at actual stock-posting time by `fn_post_grn_stock`/`fn_post_pi_stock` when deciding whether to allow a duplicate serial number.

**Key fields & business rules:**
- `policyName`, `policyCode`, `applicableCategory`, `serialFormat` (free-text notes only, not enforced), `captureStage` (Purchase Inward / Sales Invoice / Both / Warranty Registration), `allowDuplicate` (Yes/No), `status`.
- **`allow_duplicate` is a real, enforced flag** (migration 106) — not cosmetic. The old blanket `UNIQUE(company_id, product_id, serial_no)` constraint on the serial-units table was **dropped** because uniqueness can no longer be a flat DB constraint once it depends on a per-policy choice; the enforcement moved into application logic inside `fn_post_grn_stock`/`fn_post_pi_stock` (the only two functions that ever insert a brand-new serial unit), which now consult the product's serial policy before deciding whether to block a repeat, and raise a friendly, specific message instead of a raw constraint-violation exception.
- Policy code unique per segment (`UNIQUE (company_id, segment_id, policy_name)`), scoped active-only.

**Frontend:** config key `serialNumberPolicy`; component `Inventory_Masters/serial-number-policy/serial-number-policy.ts`.

**Backend — tables:** `inventory.inv_serial_policies` — `id`, `company_id`, `segment_id`, `category_id` (`ON DELETE SET NULL`), `policy_code`, `policy_name`, `serial_format`, `capture_stage` (CHECK-constrained), `allow_duplicate` (migration 106), `description`, `status`.

**Backend — stored procedures:**
- `sp_get_serial_policies` — list (`106_serial_policy_duplicates_and_return_binding.sql`, latest, carries `allow_duplicate`).
- `sp_upsert_serial_policy` — insert/update (`106_serial_policy_duplicates_and_return_binding.sql`, latest).
- Same migration also added `sp_get_instock_serials_for_source` — a Purchase-Return-scoped serial lookup mirroring the sales-return side, so Purchase Return can auto-bind serials from the referenced GRN/PI (relevant here because it depends on this policy's data, though the screen itself is a transaction, not a master, and out of this document's scope).

**Known gaps or flags:** `serialFormat` is genuinely just a free-text note field — there is no format-mask validation/enforcement anywhere in the save path; a policy claiming "15 digit IMEI" does not actually reject a 14-digit entry at transaction time. This is a UI-suggestion-only field, not an enforced business rule, despite reading like one.

---

## Batch/Lot Policy

**Business purpose:** Defines category-level default rules for batch/lot tracking (format, whether expiry tracking is required, whether QC hold is required), supporting food/agro traceability and manufacturing raw-material lot tracking without configuring every SKU by hand.

**Where it's used:** Bound to Category Master (`inv_categories.batch_policy_id`) for inheritance; overridable per-product on Product/Service Master.

**Key fields & business rules:**
- `policyName`, `policyCode`, `applicableCategory`, `batchFormat` (free-text notes, not enforced — same caveat as Serial Policy's format field), `expiryRequired` (Yes/No), `qcRequired` (Yes/No), `status`.
- Policy code uniqueness went through the same segment-scoping correction as everything else, but had its **own dedicated fix migration (025)** specifically because migration 023's fix might not have been applied everywhere, and even where applied, the inline quick-add's own `WHILE EXISTS` de-dup loop inside `sp_upsert_batch_policy`/`sp_upsert_serial_policy` still needed correcting separately from the table-level constraint — i.e. two independent layers (constraint + procedural loop) both had to be fixed, and were fixed in two different migrations (023, then 025).

**Frontend:** config key `batchLotPolicy`; component `Inventory_Masters/batch-lot-policy/batch-lot-policy.ts`.

**Backend — tables:** `inventory.inv_batch_policies` — `id`, `company_id`, `segment_id`, `category_id` (`ON DELETE SET NULL`), `policy_code`, `policy_name`, `batch_format`, `expiry_required`, `qc_required`, `description`, `status`.

**Backend — stored procedures:**
- `sp_get_batch_policies` — list (`009_inventory_masters_dto_alignment.sql`).
- `sp_upsert_batch_policy` — insert/update, segment-scoped uniqueness fix in `025_fix_batch_serial_policy_scope_unique.sql` (latest).

**Known gaps or flags:** Same "format is a note, not an enforced mask" caveat as Serial Number Policy.

---

## BOM Master

**Business purpose (as designed):** Intended to define the raw-material requirements, wastage percentage and production cost per unit for manufacturing a finished product, so production issue/consumption and manufacturing costing could be driven from real data rather than manual calculation.

**Where it's used (as designed):** Manufacturing issue, consumption, costing and production planning, per the config's `outputImpact`. Product/Service Master's "allows_production" nature flag (`inv_product_types.allows_production`) and the "Service Bundle" nature's Bundle Composition feature (a *different*, actually-real mechanism — see Product/Service Master below) are conceptually adjacent but are **not** the same thing as this screen.

**Key fields & business rules:** `bomCode`, `finishedProduct` (drawn from finished-goods products), `version`, `rawMaterials` (multiselect from raw-material products), `quantity`, `wastagePercent`, `productionCost`, `status`. None of it is persisted.

**Frontend:** config key `bomMaster`; component `Inventory_Masters/bom-master/bom-master.ts` — a 19-line stub, same shape as Vehicle Master and Price List Master.

**Backend — tables:** **None.** No `inv_bom`/`inv_bom_lines` table exists in any migration.

**Backend — stored procedures:** **None.**

**Known gaps or flags:** Absent from `isApiWired()`. A fully mock/static screen. Do not confuse this with the real, wired "Service Bundle" composition feature on Product/Service Master (`inventory.inv_product_bundle_items`, migration 038) — that is a different, narrower mechanism (mapping Fixed Asset/Service/Consumable products into a sellable bundle) and is not a substitute for a real manufacturing BOM.

---

## Work Center Master

**Business purpose (as designed):** Intended to define manufacturing work centers (Assembly Line, Quality Check) with department, capacity and cost-per-hour, to support production routing, capacity planning and manufacturing costing.

**Where it's used (as designed):** Production routing/capacity planning per the config's `outputImpact`; would conceptually pair with BOM Master and a Production Entry transaction.

**Key fields & business rules:** `workCenterCode`, `workCenterName`, `department`, `capacity`, `costPerHour`, `status`. None of it is persisted.

**Frontend:** config key `workCenterMaster`; component `Inventory_Masters/work-center-master/work-center-master.ts` — 19-line stub.

**Backend — tables:** **None.**

**Backend — stored procedures:** **None.**

**Known gaps or flags:** Absent from `isApiWired()`. Fully mock/static, same as BOM Master, Vehicle Master and Price List Master. Its `dependsOn` claims "Branch / Store Setup: Ready" — true of Branch Master itself, but irrelevant/misleading here since nothing on this screen actually reads or writes anything, branch-related or otherwise.

---

## Consumption Type Master

**Business purpose:** Defines the reason/type for internal stock usage (Internal Maintenance, Production Issue, Kitchen Consumption) and whether that type requires approval, plus which Approval Workflow governs it — so internal stock-issue transactions route to the right approver and internal usage gets reported by department/reason.

**Where it's used:** Referenced by internal stock-issue/consumption transactions for workflow routing and department-usage reporting.

**Key fields & business rules:**
- `consumptionType`, `typeCode`, `department`, `approvalRequired` (Yes/No), `approvalWorkflow` (select, addMaster-enabled — points at Approval Workflow Master by name), `remarks`, `status`.
- Type name unique per segment (`UNIQUE (company_id, segment_id, type_name)`), type code unique per company, both active-status-only.
- The table has an `approval_workflow_id BIGINT` column whose own inline comment in the migration reads **"FK to future workflow master"** — i.e. it was designed from day one with the explicit expectation that Approval Workflow Master would eventually be a real table with real IDs to reference. As documented under Approval Workflow Master below, that table was never built, so this column has never had anything real to point at.

**Frontend:** config key `consumptionTypeMaster`; component `Inventory_Masters/consumption-type-master/consumption-type-master.ts`.

**Backend — tables:** `inventory.inv_consumption_types` — `id`, `company_id`, `segment_id`, `type_code`, `type_name`, `department`, `approval_required`, `approval_workflow_id` (unenforced, no FK constraint, no real table to reference), `remarks`, `status`.

**Backend — stored procedures:**
- `sp_get_consumption_types` — list (`008_inventory_masters_procedures.sql`).
- `sp_upsert_consumption_type` — insert/update, duplicate-check fix in `021_fix_all_duplicate_checks_product_type_master.sql` (latest).

**Known gaps or flags:** This screen's `dependsOn` entry `{ name: 'Approval Workflow Master', status: 'Required' }` is accurate about the *dependency direction* but should not be read as "and that dependency is satisfied" — Approval Workflow Master is entirely mock (see below), so `approvalWorkflow`/`approval_workflow_id` on every Consumption Type row is, in practice, a label with nothing real behind it; no actual approval routing engine consumes this column today.

---

## Product Type Master

**Business purpose:** Titled "Product Nature Master" in the actual UI — defines the fundamental nature of a product (Physical Stock, Raw Material, Consumable, Fixed Asset, Service, Service Bundle, Digital/Subscription) and the behavior flags that follow from it: whether it can be purchased/sold, whether it tracks inventory/cost, whether it's a service, whether it defaults to serial/batch/expiry tracking, and whether it requires an HSN/SAC code. This is the single control point that keeps a manufacturing raw material from accidentally being sellable, or a service from accidentally needing warehouse stock.

**Where it's used:** Product/Service Master's Product Nature selection drives which sections of that form even show (e.g. Pricing Type/Rental Unit only shows for Service/Service Bundle/Digital-Subscription natures; Bundle Composition only shows for Service Bundle) and which transactions the resulting product is eligible for (`allows_purchase`, `allows_sale`, `allows_production`).

**Key fields & business rules:**
- `typeName`, `typeCode`, `description`, `status`, plus the behavior-flag columns described above.
- `company_id NULL` rows are **system types** — the 7 seeded natures (Physical Stock, Service, Fixed Asset, Consumable, Semi-Finished Goods, Finished Goods, Raw Material originally; reconciled down to 6 canonical natures by migration 037, then a 7th — Service Bundle — added by migration 038) are shared across every company and flagged `is_system = true`, meaning they cannot be deleted (enforced at the delete endpoint, `DeleteProductTypeAsync`).
- Company-wide, not segment-scoped (migration 024 explicitly excludes `inv_item_types`/`inv_product_types`).
- **Uniqueness bug found and fixed twice**: `UNIQUE (company_id, type_code)` had no status filter, so a soft-deleted (inactive) row's code still blocked reusing that code for a new active row — hit in practice via the client-side auto-generated `type_code` counter (based on currently-*visible/active* rows) regenerating a code a prior soft-deleted attempt already held. Migration 158's fix: `sp_upsert_product_type` now always resolves to a guaranteed-unique code by auto-suffixing on collision, so a code clash can never block a save — the real business rule (no two *active* Product Natures sharing a name) is preserved; only the incidental code collision is silently auto-resolved.

**Frontend:** config key `productTypeMaster` (screen titled "Product Nature Master"); component `Inventory_Masters/product-type-master/product-type-master.ts`.

**Backend — tables:** `inventory.inv_product_types` — `id`, `company_id` (nullable = system type), `type_code`, `type_name`, `description`, `tracks_inventory`, `tracks_cost`, `is_service`, `is_asset`, `allows_purchase`, `allows_sale`, `allows_production`, `default_serial_required`, `default_batch_required`, `default_expiry_required`, `requires_hsn_sac`, `is_system`, `sort_order`, `status`. `UNIQUE (company_id, type_code)` (no status filter — see landmine above).

**Backend — stored procedures:**
- `sp_get_product_types` — list, `includeSystem` toggle (`021_fix_all_duplicate_checks_product_type_master.sql`, then extended by `037_product_nature.sql` to return the resolved nature's behavior flags for `inv_products` too).
- `sp_upsert_product_type` — insert/update, with the auto-suffixing collision fix (`158_product_type_code_collision_autofix.sql`, latest).
- `DeleteProductTypeAsync` (controller-level `DELETE /product-types/{id}`) — soft-deletes a non-system Product Nature; system natures are protected.

**Known gaps or flags:** The `UNIQUE (company_id, type_code)` constraint still has no status filter even after migration 158 — the fix works around the symptom (auto-suffix instead of raw exception) rather than adding a partial `WHERE status = 'active'` index the way most of the other masters in this document eventually got. A future engineer relying on `type_code` as a stable, human-meaningful identifier should know it can silently pick up a numeric suffix it didn't ask for.

---

## Approval Workflow Master

**Business purpose (as designed):** Intended to be a shared, reusable approval-rule engine — single/two/multi-level approval, approver type (User/Role/Department Head/Branch Manager/Reporting Manager), auto-approve-below-amount thresholds, and escalation rules — usable by Consumption Type, Stock Adjustment, Purchase Order, Goods Receipt, Sales Invoice and Payment Voucher.

**Where it's used (as designed):** Referenced by name from Consumption Type Master's `approvalWorkflow` field (see above) and, per its own config, intended to be applicable to several transaction screens' approval routing. In practice, **nothing consumes it**, because nothing persists it.

**Key fields & business rules:** `workflowCode`, `workflowName`, `applicableScreen` (multiselect), `approvalLevel`, `approverType`, `approver`, `autoApproveBelow`, `escalationTo`, `escalationHours`, `status`. None of it is persisted.

**Frontend:** config key `approvalWorkflowMaster`; component `Inventory_Masters/approval-workflow-master/approval-workflow-master.ts` — 19-line stub.

**Backend — tables:** **None.**

**Backend — stored procedures:** **None.**

**Known gaps or flags:** Absent from `isApiWired()`. This is the most consequential of the six mock screens, because **Consumption Type Master's real, saved `approval_workflow_id` column has literally nothing behind it** — its own migration comment says "FK to future workflow master," and that future table was never built. Any actual approval-routing logic implemented elsewhere in the system (e.g. inside Stock Adjustment's own pending-approval status flow) is a separate, screen-specific mechanism, not powered by this master. Treat "Approval Workflow Master" as a naming placeholder for a feature that does not exist yet, not as infrastructure other screens can be assumed to share.

---

## Transporter Master

**Business purpose (as designed):** Intended to maintain logistics/transport partner details (GSTIN, contact person, mobile, default vehicle type) sourced from Global Contact, for use in purchase delivery, dispatch, stock transfer and logistics reporting.

**Where it's used (as designed):** Would pair with Vehicle Master's "Hired Vehicle"/"Transport Partner" vehicle types and with dispatch/GRN transport-detail fields, per its `outputImpact`.

**Key fields & business rules:** `transporterCode`, `transporterName`, `gstin`, `contactPerson` (Global Contact), `mobile`, `vehicleType`, `status`. None of it is persisted.

**Frontend:** config key `transporterMaster`; component `Inventory_Masters/transporter-master/transporter-master.ts` — 19-line stub.

**Backend — tables:** **None.**

**Backend — stored procedures:** **None.**

**Known gaps or flags:** Absent from `isApiWired()`. Fully mock/static — the sixth and last of the six non-wired masters in this scope. Note there **is** a real, separate `InventoryTransportDetails` shared component (`Inventory_Shared/inventory-transport-details/`) used on actual dispatch/logistics transaction screens (out of this document's scope — covered by the Stock Movement/Manufacturing doc) — do not assume that component reads from this master; based on this master having zero backend, it cannot.

---

## Product/Service Master

**Business purpose:** The single most important master in the entire Inventory module — one specific, sellable/purchasable SKU (a physical item or a service), mapped to its Product Nature, Category, Brand, UOM(s), HSN/SAC, tracking policies (serial/batch/expiry), valuation method and stock control thresholds. Every purchase and sales line item, every stock movement, and every report is ultimately about a row in this table.

**Where it's used:** Every transaction screen's line-item product picker (Purchase Order, GRN, Purchase Invoice, Sales Order, Delivery Challan, Sales Invoice, POS, Stock Transfer, Stock Adjustment, Opening Stock Entry) and every stock/valuation report.

**Key fields & business rules:**
- Identity: `segment`, `sku`, `name`, `category`, `brand`, `description`. `sku` and `product_code` are both auto-generated on first save if left blank and are each unique per company; `product_name` is unique per segment.
- Tax: `hsnSac` (auto-bind from Category selection, per HSN/SAC Mapping's own `outputImpact`), `gstRate` (denormalized, auto-derived from the HSN/SAC row).
- UOM: `baseUom`, `alternateUom` + `conversionFactor`, `purchaseUom`, `saleUom` — actual product-specific purchase/sale conversion factors (e.g. "1 Bag = 25 KG") live here, in `inventory.inv_product_uom_conversions`, one row per `(product, from_uom, to_uom)` pair, each flaggable as the default-for-purchase or default-for-sale conversion.
- Tracking: `tracking` (method — None/Batch/Serial-IMEI/etc.), `hasExpiry`, `valuationMethod` (FIFO/FEFO/LIFO/Weighted Average/Specific Identification/Batch Cost) — plus real `serial_policy_id`/`batch_policy_id` FKs.
- Stock control: `openingQty`, `limit` (reorder/booking level), plus `reorder_qty`/`max_stock_level`/`min_stock_level` columns.
- **Product Nature drives conditional form sections** (frontend logic in `product-service-master.ts`): "Pricing Type"/"Rental Unit" fields only show for natures `Service`, `Service Bundle`, `Digital / Subscription`; "Bundle Composition" only shows for `Service Bundle`, letting a bundle map in child products whose nature is `Fixed Asset`, `Service`, or `Consumable` (`inventory.inv_product_bundle_items`, migration 038) — a real, working feature distinct from (and not a substitute for) the mock BOM Master.
- Product Nature's behavior flags (`allows_sale`, `allows_production`, `tracks_inventory`) are surfaced back to the frontend as UI hints (e.g. "Not directly sellable — excluded from Sales product pickers") — confirm the actual *enforcement* of these flags lives in the relevant transaction screens' own product-picker filtering logic (out of this document's scope to verify in depth).

**Frontend:** config key `productServiceMaster`; component `Inventory_Masters/product-service-master/product-service-master.ts` (231 lines — by far the largest of the thin master wrapper components, with real tab/section-scroll UI logic, Product Nature guide text, and bundle-composition picker logic layered on top of the shared `InventoryScreenShell`).

**Backend — tables:**
- `inventory.inv_products` — `id`, `company_id`, `segment_id`, `category_id`, `base_uom_id`, `brand_id`, `variant_id`, `hsn_sac_id` (FK into `taxation.hsn_sac`), `serial_policy_id`, `batch_policy_id`, `product_code`, `sku`, `product_name`, `product_type` (legacy 3-value derived field — Product/Service/Both, now driven by the resolved nature's `is_service` flag rather than user input directly), `product_nature_id` (FK to `inv_product_types`, migration 037), `item_status`, `valuation_method`, denormalized `hsn_sac_code`/`gst_rate`/`tax_category`, `reorder_level`/`reorder_qty`/`max_stock_level`/`min_stock_level`, `batch_applicable`/`serial_applicable`/`expiry_applicable`/`qc_required`, `pricing_type`/`rental_unit` (migration 038), `status`.
- `inventory.inv_product_uom_conversions` — per-product alternate-UOM conversion factors, `UNIQUE (product_id, from_uom_id, to_uom_id)`, with `is_default_purchase`/`is_default_sale` flags.
- `inventory.inv_product_bundle_items` — Service Bundle composition child table (migration 038).

**Backend — stored procedures:**
- `sp_get_products` — list, filterable by segment/category, returns the resolved Product Nature and its behavior flags plus (as of migration 038) `pricing_type`/`rental_unit`/`bundle_composition` (`088_product_cost_price.sql`, latest for the base list; extended by `037_product_nature.sql` and `038_product_pricing_bundle.sql` for nature/bundle fields).
- `sp_upsert_product` — insert/update, resolves and stores `product_nature_id`, derives the legacy `product_type` from it, persists bundle composition when the nature is Service Bundle (`043_variant_attribute_combination_stock.sql`, latest full redefinition found; also touched by `037`/`038` for nature/pricing/bundle fields — confirm against the live DB which of these is truly the last-applied version if planning a further change here, as several large migrations rewrite this same procedure body).
- `fn_convert_uom` — a real Postgres function (not a procedure) used at transaction time to convert a quantity between two UOMs for a given product, reading from `inv_product_uom_conversions`.

**Known gaps or flags:** `sp_upsert_product` has been fully `CREATE OR REPLACE`'d by at least four different migrations found in this research (037, 038, 041–043-series variant/attribute stock-control migrations, plus 088 for cost/price) — this is the single most frequently-redefined procedure in the whole masters set, meaning any future change here carries real risk of silently reverting an intervening fix if the wrong "latest" version is edited from. Treat `product_type` (the legacy 3-value column) as effectively deprecated/derived-only — migration 037 explicitly changed it from user-set to nature-derived, but the column and its old CHECK constraint are both still physically present.
