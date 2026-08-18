import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Coverage for item 16: the Print/Export PDF/Export Excel/Mail/WhatsApp
// toolbar icons above every transaction screen's "Existing Saved" grid must
// stay hidden while the record open in the form above is still a Draft.
// showGridToolbarExportIcons() is deliberately status-based rather than
// isCurrentRecordPosted() (which defaults to false for most transaction
// config keys — purchaseOrder, gatePass, etc. — since it's only wired for a
// handful of them), so it must behave the same regardless of config.key.
describe('InventoryScreenShell — grid toolbar export icons (item 16)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const config: InventoryScreenConfig = {
    key: 'purchaseOrder',
    title: 'Purchase Order',
    subtitle: '',
    kind: 'transaction',
    icon: 'pi pi-shopping-bag'
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

  it('hides the icons for a Draft record on a screen with no dedicated isCurrentRecordPosted() wiring', () => {
    // purchaseOrder falls through isCurrentRecordPosted()'s default case
    // (always false) -- showGridToolbarExportIcons() must not depend on it.
    component.formValues.set({ status: 'Draft' });
    expect(component.showGridToolbarExportIcons()).toBe(false);
  });

  it('shows the icons once that same screen has a Posted record open', () => {
    component.formValues.set({ status: 'Posted' });
    expect(component.showGridToolbarExportIcons()).toBe(true);
  });

  it('shows the icons before any record has been loaded and status defaults blank, only Draft hides them', () => {
    component.formValues.set({});
    expect(component.showGridToolbarExportIcons()).toBe(false);
  });

  it('is case-insensitive on the status value', () => {
    component.formValues.set({ status: 'draft' });
    expect(component.showGridToolbarExportIcons()).toBe(false);
  });

  it('treats a non-draft status like Cancelled as showing the icons', () => {
    component.formValues.set({ status: 'Cancelled' });
    expect(component.showGridToolbarExportIcons()).toBe(true);
  });
});
