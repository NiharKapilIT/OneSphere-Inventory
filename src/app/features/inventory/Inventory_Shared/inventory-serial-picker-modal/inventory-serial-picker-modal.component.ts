import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-inventory-serial-picker-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './inventory-serial-picker-modal.component.html'
})
export class InventorySerialPickerModalComponent {
  @Input({ required: true }) host!: any;

  captureDraft = '';

  addCaptureValue(input?: HTMLInputElement): void {
    const value = this.captureDraft.trim();
    if (!value) return;
    this.host.addSerialPickerCaptureValue(value);
    this.captureDraft = '';
    if (input) setTimeout(() => input.focus());
  }
}
