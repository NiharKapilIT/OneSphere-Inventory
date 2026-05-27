# Inventory Business Segment - Simple Scope And Changes

Date: 2026-05-25

## Scope

Inventory business segments are common for every industry type:

- Electronics
- Agro
- Food
- Restaurant
- Manufacturing
- Any other segment created by the user

Each business segment can map multiple categories, multiple HSN/SAC codes, and multiple typical UOMs.

## What The Screen Does

1. User enters one Business Segment name.
2. User selects multiple Categories.
3. User selects multiple Related HSN/SAC Codes.
4. User selects multiple Typical UOMs.
5. User can click the plus button beside Category, HSN/SAC, or UOM to quickly add a missing value.
6. User clicks Save.
7. The saved segment is fetched again from Inventory API and shown in the saved list.

## Data Rule

The segment stores only Inventory mappings:

- `inventory.inv_segments`
- `inventory.inv_segment_categories`
- `inventory.inv_segment_hsn_sac`
- `inventory.inv_segment_uom`
- `inventory.inv_categories`
- `inventory.inv_hsn_sac`
- `inventory.inv_uom`

No Accounts, HRMS, or other schema table is touched by this change.

## API Used

Base URL:

```text
/api/inventory/config
```

Endpoints:

```text
GET  /segments?includeInactive=true
POST /segments
PUT  /segments/{id}
GET  /categories
POST /categories/quick
GET  /hsnsac
POST /hsnsac/quick
GET  /uom
POST /uom/quick
```

## Files Changed

```text
src/app/features/inventory/Inventory_Config/business-segments/business-segments.ts
src/app/features/inventory/Inventory_Config/business-segments/business-segments.html
src/app/features/inventory/Inventory_Shared/inventory-config.service.ts
src/styles.scss
docs/inventory-business-segment-change-log.md
```

## Important Note

The Angular UI keeps simple snake_case names like `segment_name` and `category_ids`.
The Inventory service converts those names to the camelCase DTO names expected by the .NET API, then converts API responses back for the existing Inventory screens.
