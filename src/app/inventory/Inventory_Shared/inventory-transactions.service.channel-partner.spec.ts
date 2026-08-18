import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryTransactionsService } from './inventory-transactions.service';

// Regression coverage for a real gap found while building item 2 (Channel
// Partner): the C# API serializes controller responses as camelCase
// (channelPartnerId), but each of these four norm*() functions is a
// hand-written field whitelist — a field missing from the whitelist is
// silently dropped even though the backend already returns it correctly.
// This bit for real: the SQL layer, the C# DTOs, and buildSalesTransactionPayload()
// (the outgoing save path) were all fixed and individually verified before
// this incoming-response mapping gap was caught, so it's worth pinning down
// on its own rather than trusting the outgoing-payload tests to imply the
// round trip works.
describe('InventoryTransactionsService — channel_partner survives the API response mapping (item 2)', () => {
  let service: InventoryTransactionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(InventoryTransactionsService);
  });

  const apiRow = {
    id: 1,
    channelPartnerId: 42,
    channelPartnerName: 'Bright Distributors',
    customerId: 7,
    customerName: 'Acme Corp',
    items: []
  };

  it('normSalesInvoice keeps channel_partner_id/name from the camelCase API response', () => {
    const normalized = (service as any).normSalesInvoice(apiRow);
    expect(normalized.channel_partner_id).toBe(42);
    expect(normalized.channel_partner_name).toBe('Bright Distributors');
  });

  it('normSalesOrder keeps channel_partner_id/name from the camelCase API response', () => {
    const normalized = (service as any).normSalesOrder(apiRow);
    expect(normalized.channel_partner_id).toBe(42);
    expect(normalized.channel_partner_name).toBe('Bright Distributors');
  });

  it('normDeliveryChallan keeps channel_partner_id/name from the camelCase API response', () => {
    const normalized = (service as any).normDeliveryChallan(apiRow);
    expect(normalized.channel_partner_id).toBe(42);
    expect(normalized.channel_partner_name).toBe('Bright Distributors');
  });

  it('normSalesReturn keeps channel_partner_id/name from the camelCase API response', () => {
    const normalized = (service as any).normSalesReturn(apiRow);
    expect(normalized.channel_partner_id).toBe(42);
    expect(normalized.channel_partner_name).toBe('Bright Distributors');
  });
});
