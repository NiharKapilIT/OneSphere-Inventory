import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Coverage for item 5: "Received Stock / Accepted Stock should be added
// only if the reference comes from GRN; otherwise, it is not required for
// direct entries." A direct (non-GRN) Purchase Invoice now shows a plain
// 'Qty' column instead of 'Received Qty'/'Accepted Qty', and every internal
// qty read (save payload, amount preview, serial-picker qty-needed) must
// resolve from the column that's actually visible for the current mode —
// not fall through to whichever of 'Received Qty'/'Accepted Qty' the old
// substring-matching fallback happened to hit first (see
// purchaseInvoiceQtyForRow()'s own comment for that history).
describe('InventoryScreenShell — Purchase Invoice direct vs GRN-linked qty (item 5)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const lineColumns = ['Product', 'Variant', 'Attribute', 'UOM', 'Qty', 'Received Qty', 'Accepted Qty', 'Rate', 'Amount'];

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

  it('shows Qty (not Received/Accepted Qty) for a direct invoice with no GRN reference', () => {
    const columns = component.transactionLineDisplayColumns(lineColumns);
    expect(columns).toContain('Qty');
    expect(columns).not.toContain('Received Qty');
    expect(columns).not.toContain('Accepted Qty');
  });

  it('shows Received/Accepted Qty (not Qty) once a GRN reference is bound', () => {
    component.formValues.set({ ...component.formValues(), grnId: 501 });
    const columns = component.transactionLineDisplayColumns(lineColumns);
    expect(columns).not.toContain('Qty');
    expect(columns).toContain('Received Qty');
    expect(columns).toContain('Accepted Qty');
  });

  it('purchaseInvoiceQtyForRow reads the plain Qty column for a direct invoice', () => {
    // Row layout matches lineColumns: [Product, Variant, Attribute, UOM, Qty, Received Qty, Accepted Qty, Rate, Amount]
    const row = ['Dell I7', '', '', 'Nos', '7', '', '', '50000', '350000'];
    const qty = (component as any).purchaseInvoiceQtyForRow(row);
    expect(qty).toBe(7);
  });

  it('purchaseInvoiceQtyForRow prefers Accepted Qty when a GRN-linked row carries one', () => {
    const row = ['Dell I7', '', '', 'Nos', '', '10', '9', '50000', '450000'];
    const qty = (component as any).purchaseInvoiceQtyForRow(row);
    expect(qty).toBe(9);
  });
});
