import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentModeSelectorComponent, PaymentModeSelectorValue, defaultPaymentModeValue } from './payment-mode-selector.component';

// Item 19: shared Cash/Bank -> Cheque/Online/Debit Card/Credit Card
// mode-of-payment component, cloned (UX only) from OneSphere-Accounts'
// General Receipt screen so Inventory's Payment/Receipt voucher can use the
// exact same mode-of-payment UX. Covers mode switching, field reset on
// sub-type change, per-mode validity, and the emitted output shape --
// especially that Cash always emits modeKey 'cash' verbatim, since
// Inventory's ledger-posting SP branches on that exact string.
describe('PaymentModeSelectorComponent (item 19)', () => {
  let fixture: ComponentFixture<PaymentModeSelectorComponent>;
  let component: PaymentModeSelectorComponent;
  let emitted: PaymentModeSelectorValue[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentModeSelectorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentModeSelectorComponent);
    component = fixture.componentInstance;
    emitted = [];
    component.valueChange.subscribe(v => emitted.push(v));
    fixture.detectChanges();
  });

  function latest(): PaymentModeSelectorValue {
    fixture.detectChanges();
    return emitted[emitted.length - 1];
  }

  it('defaults to Cash, valid, with modeKey exactly "cash" (ledger-posting SP branches on this literal)', () => {
    const v = latest();
    expect(v.mode).toBe('CASH');
    expect(v.bankSubType).toBeNull();
    expect(v.modeKey).toBe('cash');
    expect(v.isValid).toBe(true);
  });

  it('switching to Bank defaults the sub-type to Cheque and is invalid until required fields are filled', () => {
    component.setTopMode('BANK');
    let v = latest();
    expect(v.bankSubType).toBe('CHEQUE');
    expect(v.isValid).toBe(false);

    component.setBankNameFree('HDFC Bank');
    component.setBranchName('MG Road');
    component.setAccountNumber('123456789012');
    component.setRefNumber('456789');
    component.setRefDate('2026-08-16');
    v = latest();
    expect(v.modeKey).toBe('cheque');
    expect(v.isValid).toBe(true);
    expect(v.bankName).toBe('HDFC Bank');
    expect(v.refNumber).toBe('456789');
  });

  it('switching bank sub-type resets the previous sub-type\'s fields', () => {
    component.setTopMode('BANK'); // -> CHEQUE
    component.setBankNameFree('HDFC Bank');
    component.setRefNumber('123456');
    expect(latest().refNumber).toBe('123456');

    component.setBankSubType('ONLINE');
    const v = latest();
    expect(v.refNumber).toBe('');
    expect(v.bankName).toBe('');
    expect(v.bankSubType).toBe('ONLINE');
  });

  it('Online + UPI requires a UPI id before it is valid; other Online types do not', () => {
    component.setTopMode('BANK');
    component.setBankSubType('ONLINE');
    component.setBankNameFree('ICICI Bank');
    component.setRefNumber('998877');
    component.setRefDate('2026-08-16');
    component.setDepositBankNameFree('Company Current A/c');
    component.setTypeOfPayment('NEFT');
    expect(latest().isValid).toBe(true);

    component.setTypeOfPayment('UPI');
    let v = latest();
    expect(v.isValid).toBe(false); // upiId still empty
    expect(component.showUpi()).toBe(true);

    component.setUpiId('vendor@okhdfcbank');
    v = latest();
    expect(v.isValid).toBe(true);
    expect(v.modeKey).toBe('online');
  });

  it('Credit Card requires "Bank / Financial Services"; Debit Card does not', () => {
    component.setTopMode('BANK');
    component.setBankSubType('DEBIT_CARD');
    component.setCardNumber('4111111111111111');
    component.setRefNumber('12345');
    component.setDepositBankNameFree('Company Current A/c');
    expect(latest().isValid).toBe(true); // no bank/financial services needed for debit

    component.setBankSubType('CREDIT_CARD');
    component.setCardNumber('4111111111111111');
    component.setRefNumber('12345');
    component.setDepositBankNameFree('Company Current A/c');
    expect(latest().isValid).toBe(false); // missing bank/financial services

    component.setBankFinancialServices('SBI-Master Card');
    expect(latest().isValid).toBe(true);
    expect(latest().modeKey).toBe('credit_card');
  });

  it('sanitizes free-typed input: digits-only for card/account/reference, letters-only for names', () => {
    component.setTopMode('BANK');
    component.setBankSubType('DEBIT_CARD');
    component.setCardNumber('41a1-1111 1111!!1111extra');
    expect(component.cardNumber()).toMatch(/^\d+$/); // non-digits stripped
    expect(component.cardNumber().length).toBeLessThanOrEqual(16); // capped at 16
    component.setBankFinancialServices('SBI123 Bank');
    expect(component.bankFinancialServices()).toBe('SBI Bank');
  });

  it('Cheque No. is capped at 6 digits but Reference No. (Online/Card) allows up to 25', () => {
    component.setTopMode('BANK'); // CHEQUE
    component.setRefNumber('1234567890');
    expect(component.refNumber()).toBe('123456');

    component.setBankSubType('ONLINE');
    component.setRefNumber('1234567890123456789012345extra');
    expect(component.refNumber().length).toBe(25);
  });

  it('the `value` input pre-fills every field for edit/restore scenarios', () => {
    const seed: PaymentModeSelectorValue = {
      ...defaultPaymentModeValue(),
      mode: 'BANK',
      bankSubType: 'CREDIT_CARD',
      cardNumber: '5500000000000004',
      bankFinancialServices: 'Axis Bank',
      refNumber: '77777',
      depositBankId: 9,
      depositBankName: 'Axis Current A/c',
      modeKey: 'credit_card',
      summary: 'Credit Card ****0004 · Axis Bank',
      isValid: true
    };
    component.value = seed;
    fixture.detectChanges();

    expect(component.mode()).toBe('BANK');
    expect(component.bankSubType()).toBe('CREDIT_CARD');
    expect(component.cardNumber()).toBe('5500000000000004');
    expect(component.depositBankName()).toBe('Axis Current A/c');
  });

  it('resolves bankId/depositBankId against the supplied option lists into their label fields', () => {
    component.banks = [{ id: 1, label: 'State Bank of India' }, { id: 2, label: 'HDFC Bank' }];
    component.depositBanks = [{ id: 9, label: 'Company Current A/c' }];
    component.setTopMode('BANK');
    component.setBankId(2);
    component.setDepositBankId(9);
    const v = latest();
    expect(v.bankId).toBe(2);
    expect(v.bankName).toBe('HDFC Bank');
    expect(v.depositBankId).toBe(9);
    expect(v.depositBankName).toBe('Company Current A/c');
  });

  it('markAllTouched() reveals validation errors for empty required fields', () => {
    component.setTopMode('BANK'); // CHEQUE, everything empty
    fixture.detectChanges();
    expect(component.bankNameError).toBe(''); // not yet touched

    component.markAllTouched();
    fixture.detectChanges();
    expect(component.bankNameError).toBe('Please Select Bank Name');
    expect(component.branchNameError).toBe('Please Enter Branch Name');
  });

  // Item 20: "Cash payments should be allowed up to a maximum of ₹20,000" --
  // a flat per-transaction cap on a single Cash-mode row, distinct from the
  // Section 269ST *daily aggregate* check already in Accounts' General
  // Receipt screen (CASH_TRANSACTION_LIMIT = 199999). Backed server-side by
  // inventory.sp_save_payment_voucher (migration 148).
  describe('₹20,000 Cash cap (item 20)', () => {
    it('Cash at or under ₹20,000 stays valid with no error message', () => {
      component.amount = 20000;
      let v = latest();
      expect(v.isValid).toBe(true);
      expect(component.cashLimitError).toBe('');

      component.amount = 500;
      v = latest();
      expect(v.isValid).toBe(true);
      expect(component.cashLimitError).toBe('');
    });

    it('Cash over ₹20,000 is invalid and shows a clear inline message, unconditionally (not gated by touch)', () => {
      component.amount = 20000.01;
      const v = latest();
      expect(v.isValid).toBe(false);
      expect(component.cashLimitError).toContain('cannot exceed ₹20,000');
    });

    it('the cap is Cash-only -- Bank mode is unaffected by any amount, including well over ₹20,000', () => {
      component.amount = 500000;
      component.setTopMode('BANK');
      component.setBankSubType('DEBIT_CARD');
      component.setCardNumber('4111111111111111');
      component.setRefNumber('12345');
      component.setDepositBankNameFree('Company Current A/c');
      const v = latest();
      expect(v.mode).toBe('BANK');
      expect(v.isValid).toBe(true); // amount alone never blocks Bank
      expect(component.cashLimitError).toBe(''); // getter is Cash-only, gated on mode()
    });

    it('switching from an over-cap Cash amount to Bank clears the cash error, and back to Cash restores it', () => {
      component.amount = 99999;
      expect(latest().isValid).toBe(false);

      component.setTopMode('BANK');
      expect(component.cashLimitError).toBe('');

      component.setTopMode('CASH');
      expect(component.cashLimitError).toContain('cannot exceed');
      expect(latest().isValid).toBe(false);
    });

    it('a null/undefined amount input is treated as 0 (valid) rather than throwing', () => {
      component.amount = null as any;
      expect(latest().isValid).toBe(true);
      component.amount = undefined as any;
      expect(latest().isValid).toBe(true);
    });
  });
});
