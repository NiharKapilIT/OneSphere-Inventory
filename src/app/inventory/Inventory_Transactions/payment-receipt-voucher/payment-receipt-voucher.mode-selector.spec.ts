import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { PaymentReceiptVoucherComponent } from './payment-receipt-voucher';
import { defaultPaymentModeValue, PaymentModeSelectorValue } from '../../../shared/payment-mode-selector/payment-mode-selector.component';
import { PaymentsService } from '../../Inventory_Shared/payments.service';

// Item 19: payment-receipt-voucher.ts used to drive its mode-of-payment
// section off a thin, ad-hoc MODE_DEFS map (Cash/UPI/Card/Cheque/NEFT/IMPS,
// each with a hand-rolled `fields` array of generic text inputs). That's
// now replaced by the shared <app-payment-mode-selector> (same UX as
// Accounts' General Receipt) -- this pins down the integration seam: that
// each mode row pairs an amount with the selector's output, that the
// derived payload maps `details` -> {modeKey, refJson} the way
// PaymentsService.savePaymentVoucher()/inv_payment_voucher_modes expects,
// and that a row failing the selector's own validity blocks Save.
describe('PaymentReceiptVoucherComponent — mode-of-payment integration (item 19)', () => {
  let fixture: ComponentFixture<PaymentReceiptVoucherComponent>;
  let component: PaymentReceiptVoucherComponent;
  let savePayload: any;

  function setUpParty(): void {
    (component as any).selectedPartyId.set(1);
    (component as any).parties.set([{ id: 1, vendor_name: 'Acme Supplies' } as any]);
  }

  beforeEach(async () => {
    savePayload = null;
    const paymentsServiceStub: Partial<PaymentsService> = {
      getPaymentVouchers: () => of({ success: true, data: [] }) as any,
      getOutstandingInvoices: () => of({ success: true, data: [] }) as any,
      getTdsCodes: () => of({ success: true, data: [] }) as any,
      getVendorFyPurchaseSummary: () => of({ success: true, data: null }) as any,
      getAvailableNotes: () => of({ success: true, data: [] }) as any,
      savePaymentVoucher: (payload: any) => { savePayload = payload; return of({ success: true, data: { voucher_number: 'PV-EL-26-00001' } }) as any; }
    };

    await TestBed.configureTestingModule({
      imports: [PaymentReceiptVoucherComponent],
      providers: [
        provideHttpClient(),
        { provide: ActivatedRoute, useValue: { data: of({ mode: 'pay' }) } },
        { provide: PaymentsService, useValue: paymentsServiceStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentReceiptVoucherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('addMode() adds a row that defaults to a valid Cash entry', () => {
    component.addMode();
    const rows = component.modeRows();
    expect(rows.length).toBe(1);
    expect(rows[0].details.mode).toBe('CASH');
    expect(rows[0].details.modeKey).toBe('cash');
    expect(rows[0].details.isValid).toBe(true);
  });

  it('setModeDetails(idx, ...) replaces just that row\'s details, leaving its amount untouched', () => {
    component.addMode();
    component.setModeAmount(0, '5000');
    const bankValue: PaymentModeSelectorValue = {
      ...defaultPaymentModeValue(),
      mode: 'BANK',
      bankSubType: 'CHEQUE',
      bankName: 'HDFC Bank',
      branchName: 'MG Road',
      accountNumber: '123456789012',
      refNumber: '456789',
      refDate: '2026-08-16',
      modeKey: 'cheque',
      summary: 'Cheque #456789 · HDFC Bank',
      isValid: true
    };
    component.setModeDetails(0, bankValue);

    const row = component.modeRows()[0];
    expect(row.amount).toBe(5000);
    expect(row.details.modeKey).toBe('cheque');
    expect(row.details.bankName).toBe('HDFC Bank');
  });

  it('save() blocks and does not call the backend when an active mode row is invalid', () => {
    setUpParty();
    (component as any).quickAmount.set(1000);
    component.addMode();
    component.setModeAmount(0, '1000'); // stays Cash-default but forced to Bank/Cheque below, incomplete
    component.setModeDetails(0, { ...defaultPaymentModeValue(), mode: 'BANK', bankSubType: 'CHEQUE', modeKey: 'cheque', isValid: false });

    component.save();

    expect(savePayload).toBeNull();
    expect(component.saveError()).toContain('required fields');
  });

  it('save() maps a valid Cash mode row to {modeKey: "cash", amount, refJson} untouched by bank fields', () => {
    setUpParty();
    (component as any).quickAmount.set(2500);
    component.addMode();
    component.setModeAmount(0, '2500');
    // default row is already CASH + valid

    component.save();

    expect(savePayload).not.toBeNull();
    expect(savePayload.modes).toEqual([
      { modeKey: 'cash', amount: 2500, refJson: { summary: 'Cash' } }
    ]);
  });

  it('save() maps a valid Bank/Cheque mode row into refJson with the fields the shared component captured', () => {
    setUpParty();
    (component as any).quickAmount.set(5000);
    component.addMode();
    component.setModeAmount(0, '5000');
    component.setModeDetails(0, {
      ...defaultPaymentModeValue(),
      mode: 'BANK',
      bankSubType: 'CHEQUE',
      bankId: 7,
      bankName: 'HDFC Bank',
      branchName: 'MG Road',
      accountNumber: '123456789012',
      refNumber: '456789',
      refDate: '2026-08-16',
      modeKey: 'cheque',
      summary: 'Cheque #456789 · HDFC Bank',
      isValid: true
    });

    component.save();

    expect(savePayload.modes.length).toBe(1);
    const [m] = savePayload.modes;
    expect(m.modeKey).toBe('cheque');
    expect(m.amount).toBe(5000);
    expect(m.refJson.bankSubType).toBe('CHEQUE');
    expect(m.refJson.bankName).toBe('HDFC Bank');
    expect(m.refJson.chequeNumber).toBe('456789'); // Cheque No. -> chequeNumber, not referenceNumber
    expect(m.refJson.chequeDate).toBe('2026-08-16');
    expect(m.refJson.bankId).toBe('7');
  });

  it('removing a mode row drops it from what gets saved', () => {
    setUpParty();
    (component as any).quickAmount.set(1000);
    component.addMode();
    component.addMode();
    component.setModeAmount(0, '400');
    component.setModeAmount(1, '600');
    component.removeMode(0);

    expect(component.modeRows().length).toBe(1);
    expect(component.modeRows()[0].amount).toBe(600);
  });

  // Item 20: end-to-end through the real rendered <app-payment-mode-selector>
  // (not a manually-faked `details.isValid`) -- setting a mode row's amount
  // over ₹20,000 while it's still Cash must round-trip through the child
  // component's own [amount] input back into row.details.isValid and block
  // save(), the same as any other incomplete mode row does.
  it('save() blocks a Cash mode row whose amount exceeds the ₹20,000 cap', () => {
    setUpParty();
    (component as any).quickAmount.set(25000);
    component.addMode(); // defaults to Cash, valid at amount 0
    component.setModeAmount(0, '25000');
    fixture.detectChanges(); // propagate [amount] into the child, then its valueChange back out

    expect(component.modeRows()[0].details.mode).toBe('CASH');
    expect(component.modeRows()[0].details.isValid).toBe(false);

    component.save();

    expect(savePayload).toBeNull();
    expect(component.saveError()).toContain('required fields');
  });

  it('save() accepts a Cash mode row at exactly ₹20,000', () => {
    setUpParty();
    (component as any).quickAmount.set(20000);
    component.addMode();
    component.setModeAmount(0, '20000');
    fixture.detectChanges();

    expect(component.modeRows()[0].details.isValid).toBe(true);

    component.save();

    expect(savePayload).not.toBeNull();
    expect(savePayload.modes).toEqual([
      { modeKey: 'cash', amount: 20000, refJson: { summary: 'Cash' } }
    ]);
  });
});
