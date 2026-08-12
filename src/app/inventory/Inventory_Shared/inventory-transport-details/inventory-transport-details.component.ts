import { CommonModule } from '@angular/common';
import { Component, Input, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { CommonService } from '../../../core/services/Common/common.service';

// Shared "Transport / Vehicle Details" fieldset -- Vehicle Type/Name/No.,
// with optional nested Weighing (before/after weight + photo proof) and
// Driver (name/contact/license) sub-sections, each behind their own Yes/No
// switch. Genuinely per-transaction (unlike Bank Details), so it carries a
// top-level Yes/No switch too, same as the old ad hoc Transport Details
// block it replaces on Delivery Challan/Sales Invoice. All state and
// persistence lives on the host InventoryScreenShell
// (transportDetailsForm()/setTransportDetailsField()/
// transportDetailsSectionEnabled()/toggleTransportDetailsSection()) --
// this component is a thin template wrapper, same [host]="this" convention
// as app-inventory-delivery-address and app-inventory-bank-details. The one
// piece of real logic it owns locally is the S3 photo upload for the two
// weighing proofs, following the same fileUploadS3()-based pattern already
// proven elsewhere in this app (contact photo upload).
@Component({
  selector: 'app-inventory-transport-details',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './inventory-transport-details.component.html'
})
export class InventoryTransportDetailsComponent {
  @Input({ required: true }) host!: any;

  private readonly commonService = inject(CommonService);

  readonly vehicleTypeOptions = ['Truck', 'Van', 'Tempo', 'Trailer', 'Two Wheeler', 'Own Fleet', 'Third Party'];

  readonly beforeWeightUploadPending = signal(false);
  readonly afterWeightUploadPending = signal(false);
  readonly beforeWeightUploadError = signal('');
  readonly afterWeightUploadError = signal('');

  onWeighingPhotoChange(event: Event, side: 'before' | 'after'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const ext = (file.name.substring(file.name.lastIndexOf('.') + 1) || '').toLowerCase();
    const pendingSignal = side === 'before' ? this.beforeWeightUploadPending : this.afterWeightUploadPending;
    const errorSignal = side === 'before' ? this.beforeWeightUploadError : this.afterWeightUploadError;
    if (!['jpg', 'jpeg', 'png'].includes(ext)) {
      errorSignal.set('Upload a jpg or png photo.');
      input.value = '';
      return;
    }

    errorSignal.set('');
    pendingSignal.set(true);
    const fd = new FormData();
    fd.append(file.name, file);
    fd.append('NewFileName', `Transport Weighing ${side}.${ext}`);

    this.commonService.fileUploadS3('TransportWeighing', fd).subscribe({
      next: (data: any) => {
        pendingSignal.set(false);
        const uploadedPath = Array.isArray(data) ? data[0] : '';
        if (!uploadedPath) {
          errorSignal.set('Upload failed - no file path returned.');
          return;
        }
        const guidPrefixedName = uploadedPath.includes('/') ? uploadedPath.substring(uploadedPath.indexOf('/') + 1) : uploadedPath;
        this.host.setTransportDetailsField(side === 'before' ? 'beforeWeightPhoto' : 'afterWeightPhoto', guidPrefixedName);
      },
      error: () => {
        pendingSignal.set(false);
        errorSignal.set('Upload failed - try again.');
        input.value = '';
      }
    });
  }
}
