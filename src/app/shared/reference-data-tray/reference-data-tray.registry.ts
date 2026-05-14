import { ReferenceDataTrayConfig } from './reference-data-tray.models';

const dependentReferenceTray = (
  key: string,
  path: string,
  title: string,
  sourceType: string,
  rows: Array<{ ref: string; party: string; item: string; qty: string; uom: string; rate: string; status: string }>
): ReferenceDataTrayConfig => ({
  id: `inventory-${path}-dependent-reference`,
  title: `${title} Reference`,
  subtitle: 'This screen can use a previous document, but direct entry is still allowed.',
  icon: 'pi pi-link',
  routes: [{ path: `/dashboard/inventory/transactions/${path}` }],
  sections: [
    {
      title: 'Pending References',
      subtitle: 'Select a reference to auto-fill this document, or close the tray and continue direct entry.',
      icon: 'pi pi-clock',
      table: {
        title: `${sourceType} Pending`,
        bindable: true,
        columns: [
          { field: 'sourceType', header: 'Source' },
          { field: 'ref', header: 'Reference' },
          { field: 'party', header: 'Party / Department' },
          { field: 'item', header: 'Primary Item' },
          { field: 'qty', header: 'Pending Qty' },
          { field: 'status', header: 'Status' }
        ],
        rows: rows.map(row => ({
          sourceType,
          ...row,
          bindKey: row.ref,
          bindTarget: key,
          bindLabel: `${row.ref} - ${row.party}`,
          bindFields: {
            referenceNo: row.ref,
            reference: row.ref,
            party: row.party,
            customer: row.party,
            vendor: row.party,
            department: row.party,
            remarks: `Loaded from ${sourceType} ${row.ref}.`
          },
          bindLines: [[row.item, row.uom, row.qty.replace(/[^0-9.]/g, '') || '1', row.rate, '0', '18%', '0']]
        }))
      }
    }
  ]
});

export const REFERENCE_DATA_TRAY_CONFIGS: ReferenceDataTrayConfig[] = [
  dependentReferenceTray('requestForQuotation', 'request-for-quotation', 'Request For Quotation', 'Approved Purchase Requisition', [
    { ref: 'PR-0526-0018', party: 'Production', item: 'Drone Motor', qty: '48 Nos', uom: 'Nos', rate: '2100', status: 'Approved' },
    { ref: 'PR-0526-0021', party: 'Kitchen', item: 'Basmati Rice 25KG', qty: '60 Bag', uom: 'Bag', rate: '2250', status: 'Approved' },
    { ref: 'PR-0526-0024', party: 'Procurement Team', item: 'Agro Seed Premium', qty: '120 Bag', uom: 'Bag', rate: '1850', status: 'Approved' }
  ]),
  {
    id: 'inventory-purchase-order-reference',
    title: 'Purchase Order Reference',
    subtitle: 'Use approved RFQ/vendor quotation or PR lines to prepare the PO, or close and enter directly.',
    icon: 'pi pi-shopping-cart',
    routes: [{ path: '/dashboard/inventory/transactions/purchase-order' }],
    sections: [
      {
        title: 'Approved RFQ / PR Lines',
        subtitle: 'Select only the vendor-approved lines required in this PO.',
        icon: 'pi pi-file-edit',
        table: {
          title: 'Procurement References',
          bindable: true,
          columns: [
            { field: 'sourceType', header: 'Source' },
            { field: 'ref', header: 'Reference' },
            { field: 'vendor', header: 'Vendor' },
            { field: 'item', header: 'Item' },
            { field: 'qty', header: 'Qty' },
            { field: 'status', header: 'Status' }
          ],
          rows: [
            {
              sourceType: 'RFQ',
              ref: 'RFQ-0526-0007',
              vendor: 'Agro Fresh Traders',
              item: 'Agro Seed Premium',
              qty: '120 Bag',
              status: 'Approved Rate',
              bindKey: 'RFQ-0526-0007-L1',
              bindTarget: 'purchaseOrder',
              bindLabel: 'RFQ-0526-0007 - Agro Seed Premium',
              bindFields: { linkedPr: 'PR-0526-0024', supplier: 'Agro Fresh Traders', receivingWarehouse: 'BLR Store', referenceNo: 'RFQ-0526-0007' },
              bindLines: [['Agro Seed Premium', 'Bag', '120', '1850', '0', '5%', 'BLR Store', '2,33,100']]
            },
            {
              sourceType: 'RFQ',
              ref: 'RFQ-0526-0008',
              vendor: 'Fresh Foods Distributor',
              item: 'Basmati Rice 25KG',
              qty: '60 Bag',
              status: 'Approved Rate',
              bindKey: 'RFQ-0526-0008-L1',
              bindTarget: 'purchaseOrder',
              bindLabel: 'RFQ-0526-0008 - Basmati Rice 25KG',
              bindFields: { linkedPr: 'PR-0526-0021', supplier: 'Fresh Foods Distributor', receivingWarehouse: 'Main Kitchen Store', referenceNo: 'RFQ-0526-0008' },
              bindLines: [['Basmati Rice 25KG', 'Bag', '60', '2250', '1', '5%', 'Main Kitchen Store', '1,40,333']]
            },
            {
              sourceType: 'PR',
              ref: 'PR-0526-0018',
              vendor: 'Aero Labs',
              item: 'Drone Motor',
              qty: '48 Nos',
              status: 'Approved',
              bindKey: 'PR-0526-0018-L1',
              bindTarget: 'purchaseOrder',
              bindLabel: 'PR-0526-0018 - Drone Motor',
              bindFields: { linkedPr: 'PR-0526-0018', supplier: 'Aero Labs', receivingWarehouse: 'Manufacturing Store', referenceNo: 'PR-0526-0018' },
              bindLines: [['Drone Motor', 'Nos', '48', '2100', '0', '18%', 'Manufacturing Store', '1,18,944']]
            }
          ]
        }
      }
    ]
  },
  {
    id: 'inventory-goods-receipt-reference',
    title: 'Goods Receipt Reference',
    subtitle: 'Matched purchase order, supplier, and pending receipt lines.',
    icon: 'pi pi-truck',
    routes: [{ path: '/dashboard/inventory/transactions/goods-receipt' }],
    sections: [
      {
        title: 'Purchase Order',
        icon: 'pi pi-file',
        fields: [
          { label: 'PO Number', value: 'PO-0526-0042', tone: 'info' },
          { label: 'Supplier', value: 'Pragati Services' },
          { label: 'PO Date', value: '08-May-2026' },
          { label: 'Warehouse', value: 'HYD Main WH' },
          { label: 'Receipt Status', value: 'Partially Received', tone: 'warning' }
        ],
        links: [
          { label: 'View Purchase Order', route: '/dashboard/inventory/transactions/purchase-order', icon: 'pi pi-external-link' },
          { label: 'Vendor Master', route: '/dashboard/inventory/masters/vendor-master', icon: 'pi pi-user' }
        ]
      },
      {
        title: 'Pending Lines',
        icon: 'pi pi-box',
        table: {
          bindable: true,
          columns: [
            { field: 'item', header: 'Item' },
            { field: 'ordered', header: 'Ordered' },
            { field: 'received', header: 'Received' },
            { field: 'pending', header: 'Pending' }
          ],
          rows: [
            { item: 'LED Display 32 inch', ordered: 20, received: 12, pending: 8, bindKey: 'PO-0526-0042-L1', bindTarget: 'goodsReceipt', bindLabel: 'PO-0526-0042 - LED Display', bindFields: { poReference: 'PO-0526-0042', vendor: 'ElectroMart Supplies', warehouse: 'HYD Main WH' }, bindLines: [['LED Display 32 inch', '20 Nos', '8 Nos', '8 Nos', '0', 'NA', 'SN-1101..1108', 'NA', 'HYD Main WH']] },
            { item: 'Agro Seed Premium', ordered: 120, received: 0, pending: 120, bindKey: 'PO-0526-0042-L2', bindTarget: 'goodsReceipt', bindLabel: 'PO-0526-0042 - Agro Seed Premium', bindFields: { poReference: 'PO-0526-0042', vendor: 'Agro Fresh Traders', warehouse: 'BLR Store' }, bindLines: [['Agro Seed Premium', '120 Bag', '120 Bag', '116 Bag', '4 Bag QC hold', 'LOT-AGRO-0526-A', 'NA', '18-Dec-2026', 'BLR Store']] },
            { item: 'Basmati Rice 25KG', ordered: 60, received: 0, pending: 60, bindKey: 'PO-0526-0042-L3', bindTarget: 'goodsReceipt', bindLabel: 'PO-0526-0042 - Basmati Rice 25KG', bindFields: { poReference: 'PO-0526-0042', vendor: 'Fresh Foods Distributor', warehouse: 'Main Kitchen Store' }, bindLines: [['Basmati Rice 25KG', '60 Bag', '60 Bag', '60 Bag', '0', 'LOT-RICE-0526-K', 'NA', '30-Nov-2026', 'Main Kitchen Store']] }
          ]
        }
      }
    ]
  },
  dependentReferenceTray('proformaInvoice', 'proforma-invoice', 'Proforma Invoice', 'Estimate', [
    { ref: 'EST-0526-0022', party: 'Green County Buyer', item: 'Flat A-1204', qty: '1 Unit', uom: 'Unit', rate: '7200000', status: 'Accepted' },
    { ref: 'EST-0526-0024', party: 'Aero Labs', item: 'Implementation', qty: '2 Milestone', uom: 'Month', rate: '480000', status: 'Accepted' }
  ]),
  dependentReferenceTray('salesOrder', 'sales-order', 'Sales Order', 'Sales Quotation', [
    { ref: 'SQ-0526-0021', party: 'Green County Buyer', item: 'LED Display', qty: '2 Nos', uom: 'Nos', rate: '24500', status: 'Accepted' },
    { ref: 'SQ-0526-0028', party: 'Aero Labs', item: 'Drone Motor', qty: '16 Set', uom: 'Set', rate: '8500', status: 'Accepted' }
  ]),
  dependentReferenceTray('deliveryChallan', 'delivery-challan', 'Delivery Challan', 'Sales Order', [
    { ref: 'SO-0526-0033', party: 'Metro Projects', item: 'LED Display', qty: '4 Nos', uom: 'Nos', rate: '24500', status: 'Dispatch Pending' },
    { ref: 'SO-0526-0038', party: 'Tenant Works Pvt Ltd', item: 'Dedicated Seat', qty: '12 Seat-Day', uom: 'Seat-Day', rate: '950', status: 'Dispatch Pending' }
  ]),
  dependentReferenceTray('salesReturn', 'sales-return', 'Sales Return', 'Sales Invoice', [
    { ref: 'INV-0526-0061', party: 'Tenant Works Pvt Ltd', item: 'LED Display', qty: '1 Nos', uom: 'Nos', rate: '24500', status: 'Return Requested' },
    { ref: 'INV-0526-0064', party: 'Metro Projects', item: 'AMC Support', qty: '1 Month', uom: 'Month', rate: '12000', status: 'Return Requested' }
  ]),
  dependentReferenceTray('materialIssueProduction', 'material-issue-production', 'Material Issue Production', 'Production Plan', [
    { ref: 'PP-0526-0009', party: 'Assembly Line 1', item: 'Drone Motor', qty: '48 Nos', uom: 'Nos', rate: '2100', status: 'Issue Pending' },
    { ref: 'PP-0526-0011', party: 'Kitchen', item: 'Basmati Rice', qty: '20 KG', uom: 'KG', rate: '92', status: 'Issue Pending' }
  ]),
  dependentReferenceTray('productionReturn', 'production-return', 'Production Return', 'Material Issue', [
    { ref: 'MI-0526-0012', party: 'Assembly Line 1', item: 'Drone Motor', qty: '4 Nos', uom: 'Nos', rate: '2100', status: 'Unused' },
    { ref: 'MI-0526-0015', party: 'Kitchen', item: 'Basmati Rice', qty: '3 KG', uom: 'KG', rate: '92', status: 'Unused' }
  ]),
  dependentReferenceTray('shipmentEntry', 'shipment-entry', 'Shipment Entry', 'Delivery Challan', [
    { ref: 'DC-0526-0018', party: 'Metro Projects', item: 'LED Display', qty: '4 Nos', uom: 'Nos', rate: '24500', status: 'Ready To Ship' },
    { ref: 'DC-0526-0022', party: 'Green County Buyer', item: 'Flat Documents', qty: '1 Set', uom: 'Set', rate: '0', status: 'Ready To Ship' }
  ]),
  dependentReferenceTray('gatePass', 'gate-pass', 'Gate Pass', 'GRN / DC', [
    { ref: 'GRN-0526-0021', party: 'ElectroMart Supplies', item: 'LED Display', qty: '5 Nos', uom: 'Nos', rate: '24500', status: 'Inward' },
    { ref: 'DC-0526-0018', party: 'Metro Projects', item: 'Precast Panel', qty: '8 Nos', uom: 'Nos', rate: '7800', status: 'Outward' }
  ]),
  dependentReferenceTray('debitNote', 'debit-note', 'Debit Note', 'Purchase Return', [
    { ref: 'PR-RET-0526-0004', party: 'ElectroMart Supplies', item: 'LED Display', qty: '1 Nos', uom: 'Nos', rate: '24500', status: 'Debit Pending' },
    { ref: 'GRN-0526-0019', party: 'Aero Labs', item: 'Drone Motor', qty: '2 Set', uom: 'Set', rate: '8500', status: 'Price Difference' }
  ]),
  dependentReferenceTray('creditNote', 'credit-note', 'Credit Note', 'Sales Return / Invoice', [
    { ref: 'SR-RET-0526-0003', party: 'Tenant Works Pvt Ltd', item: 'LED Display', qty: '1 Nos', uom: 'Nos', rate: '24500', status: 'Credit Pending' },
    { ref: 'INV-0526-0064', party: 'Metro Projects', item: 'AMC Support', qty: '1 Month', uom: 'Month', rate: '12000', status: 'Discount Adj.' }
  ]),
  dependentReferenceTray('stockAdjustment', 'stock-adjustment', 'Stock Adjustment', 'Cycle Count Variance', [
    { ref: 'CC-0526-0004', party: 'HYD Main WH', item: 'LED Display 32 inch', qty: '2 Nos', uom: 'Nos', rate: '24500', status: 'Short Found' },
    { ref: 'CC-0526-0007', party: 'Main Kitchen Store', item: 'Basmati Rice 25KG', qty: '3 Bag', uom: 'Bag', rate: '2650', status: 'Excess Found' },
    { ref: 'CC-0526-0009', party: 'BLR Store', item: 'Agro Seed Premium', qty: '4 Bag', uom: 'Bag', rate: '2150', status: 'Expiry Damage' }
  ]),
  {
    id: 'inventory-purchase-return-reference',
    title: 'Purchase Return Reference',
    subtitle: 'Original receipt, quality reason, and returnable quantities.',
    icon: 'pi pi-replay',
    routes: [{ path: '/dashboard/inventory/transactions/purchase-return' }],
    sections: [
      {
        title: 'Original Receipt',
        icon: 'pi pi-file-check',
        fields: [
          { label: 'GRN Number', value: 'GRN-0526-0021', tone: 'info' },
          { label: 'Supplier', value: 'Pragati Services' },
          { label: 'Receipt Date', value: '10-May-2026' },
          { label: 'Return Reason', value: 'Damaged in transit', tone: 'warning' }
        ],
        table: {
          title: 'Returnable Receipt Lines',
          bindable: true,
          columns: [
            { field: 'item', header: 'Item' },
            { field: 'received', header: 'Received' },
            { field: 'returnable', header: 'Returnable' },
            { field: 'reason', header: 'Reason' }
          ],
          rows: [
            {
              item: 'LED Display',
              received: '5 Nos',
              returnable: '1 Nos',
              reason: 'Damaged',
              bindKey: 'GRN-0526-0021-L1',
              bindTarget: 'purchaseReturn',
              bindLabel: 'GRN-0526-0021 - LED Display',
              bindFields: { grnReference: 'GRN-0526-0021', vendor: 'Pragati Services', reason: 'Damaged in transit' },
              bindLines: [['LED Display', 'Nos', '1', 'Damaged', 'HYD Main WH', 'Return to vendor']]
            }
          ]
        },
        links: [
          { label: 'Open Goods Receipt', route: '/dashboard/inventory/transactions/goods-receipt', icon: 'pi pi-external-link' }
        ]
      }
    ]
  },
  {
    id: 'inventory-sales-invoice-reference',
    title: 'Sales Invoice Reference',
    subtitle: 'Select one or more sales orders or quotations to bind customer and item rows into the invoice.',
    icon: 'pi pi-receipt',
    routes: [{ path: '/dashboard/inventory/transactions/sales-invoice' }],
    sections: [
      {
        title: 'Available References',
        icon: 'pi pi-shopping-cart',
        subtitle: 'Tick the references that should become the base for this invoice.',
        table: {
          title: 'Sales Orders / Quotations',
          bindable: true,
          columns: [
            { field: 'type', header: 'Type' },
            { field: 'ref', header: 'Reference' },
            { field: 'customer', header: 'Customer' },
            { field: 'date', header: 'Date' },
            { field: 'amount', header: 'Amount' },
            { field: 'status', header: 'Status' }
          ],
          rows: [
            {
              type: 'Sales Order',
              ref: 'SO-0526-0033',
              customer: 'Metro Projects',
              date: '09-May-2026',
              amount: 'Rs. 1,44,550',
              status: 'Approved',
              bindKey: 'SO-0526-0033',
              bindTarget: 'salesInvoice',
              bindLabel: 'SO-0526-0033 - Metro Projects',
              bindFields: {
                customer: 'Metro Projects',
                warehouse: 'HYD Main WH',
                placeOfSupply: 'Telangana',
                transportMode: 'Road',
                customerNotes: 'Invoice against approved sales order SO-0526-0033.'
              },
              bindLines: [
                ['LED Display 32 inch', 'Nos', '4', '24,500', '0', '18%', 'SN-1101..1104', 'NA', 'HYD Main WH', '1,15,640'],
                ['Agro Seed Premium', 'Bag', '10', '2,150', '1', '5%', 'LOT-AGRO-0526-A', '18-Dec-2026', 'BLR Store', '22,349']
              ]
            },
            {
              type: 'Sales Order',
              ref: 'SO-0526-0038',
              customer: 'Tenant Works Pvt Ltd',
              date: '10-May-2026',
              amount: 'Rs. 86,730',
              status: 'Approved',
              bindKey: 'SO-0526-0038',
              bindTarget: 'salesInvoice',
              bindLabel: 'SO-0526-0038 - Tenant Works Pvt Ltd',
              bindFields: {
                customer: 'Tenant Works Pvt Ltd',
                warehouse: 'Co-work Floor 2',
                placeOfSupply: 'Karnataka',
                transportMode: 'Not Applicable',
                customerNotes: 'Invoice against co-working sales order SO-0526-0038.'
              },
              bindLines: [
                ['Dedicated Seat', 'Seat-Day', '12', '950', '0', '18%', 'NA', 'NA', 'Co-work Floor 2', '13,452'],
                ['AMC Support', 'Month', '1', '12,000', '0', '18%', 'NA', 'NA', 'Co-work Floor 2', '14,160']
              ]
            },
            {
              type: 'Sales Quotation',
              ref: 'SQ-0526-0021',
              customer: 'Green County Buyer',
              date: '08-May-2026',
              amount: 'Rs. 72,540',
              status: 'Accepted',
              bindKey: 'SQ-0526-0021',
              bindTarget: 'salesInvoice',
              bindLabel: 'SQ-0526-0021 - Green County Buyer',
              bindFields: {
                customer: 'Green County Buyer',
                warehouse: 'HYD Main WH',
                placeOfSupply: 'Telangana',
                transportMode: 'Hand Delivery',
                customerNotes: 'Invoice converted from accepted quotation SQ-0526-0021.'
              },
              bindLines: [
                ['LED Display 32 inch', 'Nos', '2', '24,500', '0', '18%', 'SN-1105, SN-1106', 'NA', 'HYD Main WH', '57,820'],
                ['Basmati Rice 25KG', 'Bag', '6', '2,650', '0', '5%', 'LOT-RICE-0526-K', '30-Nov-2026', 'Main Kitchen Store', '16,695']
              ]
            }
          ]
        },
        links: [
          { label: 'Open Sales Order', route: '/dashboard/inventory/transactions/sales-order', icon: 'pi pi-external-link' },
          { label: 'Open Sales Quotation', route: '/dashboard/inventory/transactions/sales-quotation', icon: 'pi pi-file' }
        ]
      }
    ]
  },
  {
    id: 'inventory-production-entry-reference',
    title: 'Production Entry Reference',
    subtitle: 'Planned production, BOM issue, and expected output data.',
    icon: 'pi pi-cog',
    routes: [{ path: '/dashboard/inventory/transactions/production-entry' }],
    sections: [
      {
        title: 'Production Plan',
        icon: 'pi pi-calendar-clock',
        fields: [
          { label: 'Plan Number', value: 'PP-0526-0009', tone: 'info' },
          { label: 'Work Center', value: 'Assembly Line 1' },
          { label: 'BOM', value: 'BOM-MOB-ADP-65W' },
          { label: 'Planned Output', value: '120 Nos' }
        ],
        links: [
          { label: 'Open Production Planning', route: '/dashboard/inventory/transactions/production-planning', icon: 'pi pi-external-link' },
          { label: 'Open BOM Master', route: '/dashboard/inventory/masters/bom-master', icon: 'pi pi-database' }
        ]
      },
      {
        title: 'Material Issue Summary',
        icon: 'pi pi-box',
        table: {
          bindable: true,
          columns: [
            { field: 'material', header: 'Material' },
            { field: 'issued', header: 'Issued' },
            { field: 'consumed', header: 'Consumed' }
          ],
          rows: [
            { material: 'Copper Coil', issued: '36 Kg', consumed: '28 Kg', bindKey: 'PP-0526-0009-L1', bindTarget: 'productionEntry', bindLabel: 'PP-0526-0009 - Copper Coil', bindFields: { planRef: 'PP-0526-0009', finishedProduct: 'Laptop Adapter 65W', toWarehouse: 'Manufacturing Store' }, bindLines: [['Laptop Adapter 65W', '120 Nos', '116 Nos', '4 Nos', '2 Kg', 'Rs. 1,48,000']] },
            { material: 'Plastic Housing', issued: '130 Nos', consumed: '116 Nos', bindKey: 'PP-0526-0009-L2', bindTarget: 'productionEntry', bindLabel: 'PP-0526-0009 - Plastic Housing', bindFields: { planRef: 'PP-0526-0009', finishedProduct: 'Laptop Adapter 65W', toWarehouse: 'Manufacturing Store' }, bindLines: [['Laptop Adapter 65W', '120 Nos', '116 Nos', '4 Nos', '14 Nos', 'Rs. 1,48,000']] },
            { material: 'Packing Labels', issued: '140 Nos', consumed: '120 Nos', bindKey: 'PP-0526-0009-L3', bindTarget: 'productionEntry', bindLabel: 'PP-0526-0009 - Packing Labels', bindFields: { planRef: 'PP-0526-0009', finishedProduct: 'Laptop Adapter 65W', toWarehouse: 'Manufacturing Store' }, bindLines: [['Laptop Adapter 65W', '120 Nos', '116 Nos', '4 Nos', '20 Nos', 'Rs. 1,48,000']] }
          ]
        }
      }
    ]
  }
];
