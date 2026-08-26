import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Coverage for item 5: "Received Stock / Accepted Stock should be added
// only if the reference comes from GRN; otherwise, it is not required for
// direct entries." A direct (non-GRN) Purchase Invoice shows a plain 'Qty'
// column; a GRN-linked Purchase Invoice shows only 'Accepted Qty' (what the
// GRN actually kept, not what merely arrived) -- 'Received Qty' is never a
// PI column at all, GRN-linked or not. Every internal qty read (save
// payload, amount preview, serial-picker qty-needed) must resolve from the
// column that's actually visible for the current mode (see
// purchaseInvoiceQtyForRow()'s own comment for the substring-matching
// history this guards against).
describe('InventoryScreenShell — Purchase Invoice direct vs GRN-linked qty (item 5)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const lineColumns = ['Product', 'Variant', 'Attribute', 'UOM', 'Qty', 'Accepted Qty', 'Rate', 'Amount'];

  const config: InventoryScreenConfig = {
    key: 'purchaseInvoice',
    title: 'Purchase Invoice',
    subtitle: '',
    kind: 'transaction',
    icon: 'pi pi-file',
    lineColumns
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryScreenShell);
    component = fixture.componentInstance;
    component.config = config;
    fixture.detectChanges();
  });

  it('shows Qty (not Accepted Qty) for a direct invoice with no GRN reference', () => {
    const columns = component.transactionLineDisplayColumns(lineColumns);
    expect(columns).toContain('Qty');
    expect(columns).not.toContain('Accepted Qty');
    expect(columns).not.toContain('Received Qty');
  });

  it('shows only Accepted Qty (not Qty, not Received Qty) once a GRN reference is bound', () => {
    component.formValues.set({ ...component.formValues(), grnId: 501 });
    const columns = component.transactionLineDisplayColumns(lineColumns);
    expect(columns).not.toContain('Qty');
    expect(columns).toContain('Accepted Qty');
    expect(columns).not.toContain('Received Qty');
  });

  it('purchaseInvoiceQtyForRow reads the plain Qty column for a direct invoice', () => {
    // Row layout matches lineColumns: [Product, Variant, Attribute, UOM, Qty, Accepted Qty, Rate, Amount]
    const row = ['Dell I7', '', '', 'Nos', '7', '', '50000', '350000'];
    const qty = (component as any).purchaseInvoiceQtyForRow(row);
    expect(qty).toBe(7);
  });

  it('purchaseInvoiceQtyForRow reads Accepted Qty for a GRN-linked invoice', () => {
    const row = ['Dell I7', '', '', 'Nos', '', '9', '50000', '450000'];
    const qty = (component as any).purchaseInvoiceQtyForRow(row);
    expect(qty).toBe(9);
  });
});
