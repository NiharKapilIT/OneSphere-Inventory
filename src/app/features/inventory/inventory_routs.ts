import { Routes } from '@angular/router';

export const inventoryRoutes: Routes = [
  {
    path: 'inventory-dashboard',
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./Inventory_Reports/report-page/inventory-report-page')
          .then(m => m.InventoryReportPageComponent)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  {
    path: 'configuration',
    children: [
      {
        path: 'business-segments',
        loadComponent: () => import('./Inventory_Config/business-segments/business-segments')
          .then(m => m.InventoryBusinessSegmentsComponent)
      },
      {
        path: 'warehouse-location-master',
        loadComponent: () => import('./Inventory_Config/warehouse-location-master/warehouse-location-master')
          .then(m => m.InventoryWarehouseLocationMasterComponent)
      },
      {
        path: 'branch-master',
        loadComponent: () => import('./Inventory_Config/branch-master/branch-master')
          .then(m => m.InventoryBranchMasterComponent)
      },
      { path: '', redirectTo: 'business-segments', pathMatch: 'full' }
    ]
  },
  {
    path: 'masters',
    children: [
      {
        path: 'product-service-master',
        loadComponent: () => import('./Inventory_Masters/product-service-master/product-service-master')
          .then(m => m.InventoryProductServiceMasterComponent)
      },
      {
        path: 'category-master',
        loadComponent: () => import('./Inventory_Masters/category-master/category-master')
          .then(m => m.InventoryCategoryMasterComponent)
      },
      {
        path: 'product-group-master',
        loadComponent: () => import('./Inventory_Masters/product-group-master/product-group-master')
          .then(m => m.InventoryProductGroupMasterComponent)
      },
      {
        path: 'brand-master',
        loadComponent: () => import('./Inventory_Masters/brand-master/brand-master')
          .then(m => m.InventoryBrandMasterComponent)
      },
      {
        path: 'attribute-master',
        loadComponent: () => import('./Inventory_Masters/attribute-master/attribute-master')
          .then(m => m.InventoryAttributeMasterComponent)
      },
      {
        path: 'variant-master',
        loadComponent: () => import('./Inventory_Masters/variant-master/variant-master')
          .then(m => m.InventoryVariantMasterComponent)
      },
      {
        path: 'uom-master',
        loadComponent: () => import('./Inventory_Masters/uom-master/uom-master')
          .then(m => m.InventoryUomMasterComponent)
      },
      {
        path: 'hsn-sac-mapping',
        loadComponent: () => import('./Inventory_Masters/hsn-sac-mapping/hsn-sac-mapping')
          .then(m => m.InventoryHsnSacMappingComponent)
      },
      {
        path: 'barcode-configuration',
        loadComponent: () => import('./Inventory_Masters/barcode-configuration/barcode-configuration')
          .then(m => m.InventoryBarcodeConfigurationComponent)
      },
      {
        path: 'serial-number-policy',
        loadComponent: () => import('./Inventory_Masters/serial-number-policy/serial-number-policy')
          .then(m => m.InventorySerialNumberPolicyComponent)
      },
      {
        path: 'batch-lot-policy',
        loadComponent: () => import('./Inventory_Masters/batch-lot-policy/batch-lot-policy')
          .then(m => m.InventoryBatchLotPolicyComponent)
      },
      {
        path: 'substitute-products',
        loadComponent: () => import('./Inventory_Masters/substitute-products/substitute-products')
          .then(m => m.InventorySubstituteProductsComponent)
      },
      {
        path: 'opening-inventory-balance',
        loadComponent: () => import('./Inventory_Masters/opening-inventory-balance/opening-inventory-balance')
          .then(m => m.InventoryOpeningInventoryBalanceComponent)
      },
      {
        path: 'vendor-master',
        loadComponent: () => import('./Inventory_Masters/vendor-master/vendor-master')
          .then(m => m.InventoryVendorMasterComponent)
      },
      {
        path: 'payment-terms-master',
        loadComponent: () => import('./Inventory_Masters/payment-terms-master/payment-terms-master')
          .then(m => m.InventoryPaymentTermsMasterComponent)
      },
      {
        path: 'customer-master',
        loadComponent: () => import('./Inventory_Masters/customer-master/customer-master')
          .then(m => m.InventoryCustomerMasterComponent)
      },
      {
        path: 'price-list-master',
        loadComponent: () => import('./Inventory_Masters/price-list-master/price-list-master')
          .then(m => m.InventoryPriceListMasterComponent)
      },
      {
        path: 'bom-master',
        loadComponent: () => import('./Inventory_Masters/bom-master/bom-master')
          .then(m => m.InventoryBomMasterComponent)
      },
      {
        path: 'work-center-master',
        loadComponent: () => import('./Inventory_Masters/work-center-master/work-center-master')
          .then(m => m.InventoryWorkCenterMasterComponent)
      },
      {
        path: 'consumption-type-master',
        loadComponent: () => import('./Inventory_Masters/consumption-type-master/consumption-type-master')
          .then(m => m.InventoryConsumptionTypeMasterComponent)
      },
      {
        path: 'approval-workflow-master',
        loadComponent: () => import('./Inventory_Masters/approval-workflow-master/approval-workflow-master')
          .then(m => m.InventoryApprovalWorkflowMasterComponent)
      },
      {
        path: 'transporter-master',
        loadComponent: () => import('./Inventory_Masters/transporter-master/transporter-master')
          .then(m => m.InventoryTransporterMasterComponent)
      },
      {
        path: 'vehicle-master',
        loadComponent: () => import('./Inventory_Masters/vehicle-master/vehicle-master')
          .then(m => m.InventoryVehicleMasterComponent)
      },
      { path: '', redirectTo: 'product-service-master', pathMatch: 'full' }
    ]
  },
  {
    path: 'transactions',
    children: [
      // Procurement
      {
        path: 'purchase-requisition',
        loadComponent: () => import('./Inventory_Transactions/purchase-requisition/purchase-requisition')
          .then(m => m.InventoryPurchaseRequisitionComponent)
      },
      {
        path: 'request-for-quotation',
        loadComponent: () => import('./Inventory_Transactions/request-for-quotation/request-for-quotation')
          .then(m => m.InventoryRequestForQuotationComponent)
      },
      {
        path: 'purchase-order',
        loadComponent: () => import('./Inventory_Transactions/purchase-order/purchase-order')
          .then(m => m.InventoryPurchaseOrderComponent)
      },
      {
        path: 'goods-receipt',
        loadComponent: () => import('./Inventory_Transactions/goods-receipt/goods-receipt')
          .then(m => m.InventoryGoodsReceiptComponent)
      },
      {
        path: 'purchase-return',
        loadComponent: () => import('./Inventory_Transactions/purchase-return/purchase-return')
          .then(m => m.InventoryPurchaseReturnComponent)
      },
      // Sales
      {
        path: 'sales-enquiry',
        loadComponent: () => import('./Inventory_Transactions/sales-enquiry/sales-enquiry')
          .then(m => m.InventorySalesEnquiryComponent)
      },
      {
        path: 'sales-quotation',
        loadComponent: () => import('./Inventory_Transactions/sales-quotation/sales-quotation')
          .then(m => m.InventorySalesQuotationComponent)
      },
      {
        path: 'sales-order',
        loadComponent: () => import('./Inventory_Transactions/sales-order/sales-order')
          .then(m => m.InventorySalesOrderComponent)
      },
      {
        path: 'delivery-challan',
        loadComponent: () => import('./Inventory_Transactions/delivery-challan/delivery-challan')
          .then(m => m.InventoryDeliveryChallanComponent)
      },
      {
        path: 'sales-invoice',
        loadComponent: () => import('./Inventory_Transactions/sales-invoice/sales-invoice')
          .then(m => m.InventorySalesInvoiceComponent)
      },
      {
        path: 'sales-return',
        loadComponent: () => import('./Inventory_Transactions/sales-return/sales-return')
          .then(m => m.InventorySalesReturnComponent)
      },
      // Inventory
      {
        path: 'stock-transfer',
        loadComponent: () => import('./Inventory_Transactions/stock-transfer/stock-transfer')
          .then(m => m.InventoryStockTransferComponent)
      },
      {
        path: 'stock-adjustment',
        loadComponent: () => import('./Inventory_Transactions/stock-adjustment/stock-adjustment')
          .then(m => m.InventoryStockAdjustmentComponent)
      },
      {
        path: 'opening-stock-entry',
        loadComponent: () => import('./Inventory_Transactions/opening-stock-entry/opening-stock-entry')
          .then(m => m.InventoryOpeningStockEntryComponent)
      },
      {
        path: 'cycle-count',
        loadComponent: () => import('./Inventory_Transactions/cycle-count/cycle-count')
          .then(m => m.InventoryCycleCountComponent)
      },
      // Manufacturing
      {
        path: 'production-planning',
        loadComponent: () => import('./Inventory_Transactions/production-planning/production-planning')
          .then(m => m.InventoryProductionPlanningComponent)
      },
      {
        path: 'material-issue-production',
        loadComponent: () => import('./Inventory_Transactions/material-issue-production/material-issue-production')
          .then(m => m.InventoryMaterialIssueProductionComponent)
      },
      {
        path: 'production-entry',
        loadComponent: () => import('./Inventory_Transactions/production-entry/production-entry')
          .then(m => m.InventoryProductionEntryComponent)
      },
      {
        path: 'production-return',
        loadComponent: () => import('./Inventory_Transactions/production-return/production-return')
          .then(m => m.InventoryProductionReturnComponent)
      },
      // Consumption
      {
        path: 'material-consumption',
        loadComponent: () => import('./Inventory_Transactions/material-consumption/material-consumption')
          .then(m => m.InventoryMaterialConsumptionComponent)
      },
      {
        path: 'internal-issue-slip',
        loadComponent: () => import('./Inventory_Transactions/internal-issue-slip/internal-issue-slip')
          .then(m => m.InventoryInternalIssueSlipComponent)
      },
      // Logistics
      {
        path: 'shipment-entry',
        loadComponent: () => import('./Inventory_Transactions/shipment-entry/shipment-entry')
          .then(m => m.InventoryShipmentEntryComponent)
      },
      {
        path: 'gate-pass',
        loadComponent: () => import('./Inventory_Transactions/gate-pass/gate-pass')
          .then(m => m.InventoryGatePassComponent)
      },
      // Financial
      {
        path: 'debit-note',
        loadComponent: () => import('./Inventory_Transactions/debit-note/debit-note')
          .then(m => m.InventoryDebitNoteComponent)
      },
      {
        path: 'credit-note',
        loadComponent: () => import('./Inventory_Transactions/credit-note/credit-note')
          .then(m => m.InventoryCreditNoteComponent)
      },
      { path: '', redirectTo: 'purchase-requisition', pathMatch: 'full' }
    ]
  },
  {
    path: 'reports',
    children: [
      {
        path: 'inventory-summary',
        redirectTo: '/dashboard/inventory/inventory-dashboard/dashboard',
        pathMatch: 'full'
      },
      {
        path: ':reportKey',
        loadComponent: () => import('./Inventory_Reports/report-page/inventory-report-page')
          .then(m => m.InventoryReportPageComponent)
      },
      { path: '', redirectTo: 'inventory-summary', pathMatch: 'full' }
    ]
  },
  {
    path: '',
    redirectTo: 'inventory-dashboard/dashboard',
    pathMatch: 'full'
  }
];
