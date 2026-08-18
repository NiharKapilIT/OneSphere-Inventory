import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { DatePipe } from '@angular/common';
import { of, throwError } from 'rxjs';

import { PurchaseInvoiceAttachmentsComponent } from './purchase-invoice-attachments.component';
import { PurchaseInvoiceAttachment } from '../../Inventory_Shared/inventory-transactions.service';

// Coverage for item 11: Purchase Invoice attachments upload/list/preview/delete
// panel. fileUploadS3() itself (CommonService) is pre-existing, already-used
// infrastructure -- mocked via spy here rather than re-simulated, so these
// tests stay focused on what's actually new: extension/size validation,
// stripping the S3 folder prefix before saving metadata, list state after
// save/delete, and preview classification (image vs pdf vs other).
describe('PurchaseInvoiceAttachmentsComponent (item 11)', () => {
  let fixture: ComponentFixture<PurchaseInvoiceAttachmentsComponent>;
  let component: PurchaseInvoiceAttachmentsComponent;
  let httpMock: HttpTestingController;

  function makeAttachment(overrides: Partial<PurchaseInvoiceAttachment> = {}): PurchaseInvoiceAttachment {
    return { id: 1, purchaseInvoiceId: 5, fileKey: 'abc.pdf', fileName: 'abc.pdf', ...overrides };
  }

  function makeFile(name: string, sizeBytes?: number, type = 'application/pdf'): File {
    const file = new File(['x'], name, { type });
    if (sizeBytes !== undefined) Object.defineProperty(file, 'size', { value: sizeBytes });
    return file;
  }

  function makeChangeEvent(file: File): Event {
    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', { value: [file] });
    return { target: input } as unknown as Event;
  }

  function flushInitialLoad(rows: PurchaseInvoiceAttachment[] = []) {
    const req = httpMock.expectOne(r => r.url.includes('purchase-invoices/5/attachments') && r.method === 'GET');
    req.flush({ success: true, message: 'ok', data: rows });
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseInvoiceAttachmentsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), DatePipe]
    }).compileComponents();

    fixture = TestBed.createComponent(PurchaseInvoiceAttachmentsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('purchaseInvoiceId', 5);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('loads the attachment list for the bound purchase invoice id on first bind', () => {
    flushInitialLoad([makeAttachment({ fileName: 'test.pdf', fileKey: 'a1_test.pdf' })]);
    expect(component.attachments().length).toBe(1);
    expect(component.attachments()[0].fileName).toBe('test.pdf');
    expect(component.loading()).toBe(false);
  });

  it('re-loads when purchaseInvoiceId changes to a different saved record', () => {
    flushInitialLoad([]);
    fixture.componentRef.setInput('purchaseInvoiceId', 9);
    fixture.detectChanges();
    const req = httpMock.expectOne(r => r.url.includes('purchase-invoices/9/attachments') && r.method === 'GET');
    req.flush({ success: true, message: 'ok', data: [] });
  });

  it('surfaces a list-load failure without leaving loading stuck true', () => {
    const req = httpMock.expectOne(r => r.url.includes('purchase-invoices/5/attachments') && r.method === 'GET');
    req.flush('boom', { status: 500, statusText: 'Server Error' });
    expect(component.loading()).toBe(false);
    expect(component.listError()).toBeTruthy();
  });

  describe('client-side upload validation', () => {
    beforeEach(() => flushInitialLoad([]));

    it('rejects a disallowed file extension before ever calling fileUploadS3', () => {
      const uploadSpy = vi.spyOn(component['commonService'], 'fileUploadS3');
      component.onFileSelected(makeChangeEvent(makeFile('malware.exe', 100, 'application/octet-stream')));

      expect(component.uploadError()).toContain('.exe');
      expect(uploadSpy).not.toHaveBeenCalled();
    });

    it('rejects a file over the 25 MB limit before ever calling fileUploadS3', () => {
      const uploadSpy = vi.spyOn(component['commonService'], 'fileUploadS3');
      component.onFileSelected(makeChangeEvent(makeFile('big.pdf', 26 * 1024 * 1024)));

      expect(component.uploadError()).toContain('25 MB');
      expect(uploadSpy).not.toHaveBeenCalled();
    });

    it('accepts every extension the backend whitelist allows', () => {
      const uploadSpy = vi.spyOn(component['commonService'], 'fileUploadS3')
        .mockReturnValue(of(['PurchaseInvoiceAttachment/fake.ext']));
      const saveSpy = vi.spyOn((component as any).txService, 'savePurchaseInvoiceAttachment')
        .mockReturnValue(of({ success: true, message: 'ok', data: makeAttachment({ id: 99 }) }));
      for (const ext of ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'xlsx', 'csv']) {
        component.uploadError.set('');
        component.onFileSelected(makeChangeEvent(makeFile(`file.${ext}`, 100)));
        expect(component.uploadError()).toBe('');
      }
      expect(uploadSpy).toHaveBeenCalledTimes(7);
      expect(saveSpy).toHaveBeenCalledTimes(7);
    });
  });

  describe('upload happy path', () => {
    beforeEach(() => flushInitialLoad([]));

    it('strips the S3 folder prefix before saving the attachment record, and prepends the new row', () => {
      vi.spyOn(component['commonService'], 'fileUploadS3')
        .mockReturnValue(of(['PurchaseInvoiceAttachment/8f2e-invoice-scan.pdf']));

      component.onFileSelected(makeChangeEvent(makeFile('invoice-scan.pdf', 1024)));

      const req = httpMock.expectOne(r => r.url.includes('purchase-invoices/5/attachments') && r.method === 'POST');
      expect(req.request.body.fileKey).toBe('8f2e-invoice-scan.pdf');
      expect(req.request.body.fileName).toBe('invoice-scan.pdf');
      req.flush({
        success: true, message: 'ok',
        data: makeAttachment({ id: 2, fileKey: '8f2e-invoice-scan.pdf', fileName: 'invoice-scan.pdf' })
      });

      expect(component.attachments().length).toBe(1);
      expect(component.attachments()[0].fileName).toBe('invoice-scan.pdf');
      expect(component.uploadPending()).toBe(false);
    });

    it('surfaces an upload error and resets uploadPending when fileUploadS3 fails', () => {
      vi.spyOn(component['commonService'], 'fileUploadS3')
        .mockReturnValue(throwError(() => ({ error: 'No active config for module' })));

      component.onFileSelected(makeChangeEvent(makeFile('invoice-scan.pdf', 1024)));

      expect(component.uploadPending()).toBe(false);
      expect(component.uploadError()).toBe('No active config for module');
    });

    it('surfaces a metadata-save error when the upload succeeded but the save call fails', () => {
      vi.spyOn(component['commonService'], 'fileUploadS3')
        .mockReturnValue(of(['PurchaseInvoiceAttachment/8f2e-invoice-scan.pdf']));

      component.onFileSelected(makeChangeEvent(makeFile('invoice-scan.pdf', 1024)));

      const req = httpMock.expectOne(r => r.url.includes('purchase-invoices/5/attachments') && r.method === 'POST');
      req.flush('Purchase Invoice 5 not found for this company', { status: 400, statusText: 'Bad Request' });

      expect(component.uploadPending()).toBe(false);
      expect(component.uploadError()).toBeTruthy();
      expect(component.attachments().length).toBe(0);
    });
  });

  describe('preview()', () => {
    beforeEach(() => flushInitialLoad([]));

    it('classifies a .pdf attachment for iframe preview and requests the DownloadImage blob', () => {
      component.preview(makeAttachment({ fileKey: 'abc.pdf', fileName: 'abc.pdf' }));
      const req = httpMock.expectOne(r => r.url.includes('/Accounts/DownloadImage/PurchaseInvoiceAttachment/abc.pdf'));
      expect(req.request.method).toBe('GET');
      req.flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));

      expect(component.previewKind()).toBe('pdf');
      expect(component.previewFrameUrl()).toBeTruthy();
      expect(component.previewImgUrl()).toBeNull();
    });

    it('classifies a .png attachment for <img> preview', () => {
      component.preview(makeAttachment({ fileKey: 'photo.png', fileName: 'photo.png' }));
      const req = httpMock.expectOne(r => r.url.includes('/Accounts/DownloadImage/PurchaseInvoiceAttachment/photo.png'));
      req.flush(new Blob(['x'], { type: 'image/png' }));

      expect(component.previewKind()).toBe('image');
      expect(component.previewImgUrl()).toBeTruthy();
    });

    it('falls back to a "no preview" state for an unsupported type (e.g. .docx)', () => {
      component.preview(makeAttachment({ fileKey: 'terms.docx', fileName: 'terms.docx' }));
      const req = httpMock.expectOne(r => r.url.includes('/Accounts/DownloadImage/PurchaseInvoiceAttachment/terms.docx'));
      req.flush(new Blob(['x']));

      expect(component.previewKind()).toBe('other');
      expect(component.previewImgUrl()).toBeNull();
      expect(component.previewFrameUrl()).toBeNull();
    });

    it('closePreview() clears preview state', () => {
      component.preview(makeAttachment());
      httpMock.expectOne(r => r.url.includes('DownloadImage')).flush(new Blob(['x']));
      component.closePreview();
      expect(component.previewOpen()).toBe(false);
      expect(component.previewFrameUrl()).toBeNull();
    });
  });

  describe('remove()', () => {
    beforeEach(() => flushInitialLoad([makeAttachment()]));

    it('does nothing when the user cancels the confirm dialog', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      component.remove(component.attachments()[0]);
      httpMock.expectNone(r => r.method === 'DELETE');
    });

    it('deletes and removes the row from the list on confirm', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      component.remove(component.attachments()[0]);

      const req = httpMock.expectOne(r => r.url.includes('purchase-invoices/5/attachments/1') && r.method === 'DELETE');
      req.flush({ success: true, message: 'ok', data: { id: 1, fileKey: 'abc.pdf', deleted: true } });

      expect(component.attachments().length).toBe(0);
      expect(component.deletingId()).toBeNull();
    });

    it('surfaces a delete error and clears deletingId without removing the row', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      component.remove(component.attachments()[0]);

      const req = httpMock.expectOne(r => r.url.includes('purchase-invoices/5/attachments/1') && r.method === 'DELETE');
      req.flush('Attachment 1 not found for this company', { status: 400, statusText: 'Bad Request' });

      expect(component.attachments().length).toBe(1);
      expect(component.deletingId()).toBeNull();
      expect(component.listError()).toBeTruthy();
    });
  });

  describe('formatSize()', () => {
    beforeEach(() => flushInitialLoad([]));

    it('formats bytes, KB and MB thresholds', () => {
      expect(component.formatSize(500)).toBe('500 B');
      expect(component.formatSize(2048)).toBe('2.0 KB');
      expect(component.formatSize(5 * 1024 * 1024)).toBe('5.00 MB');
      expect(component.formatSize(null)).toBe('');
      expect(component.formatSize(undefined)).toBe('');
    });
  });
});
