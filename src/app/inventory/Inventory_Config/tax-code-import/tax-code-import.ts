import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  InventoryConfigService,
  TaxCodeImportSummary,
  TaxCodeSourceStatus
} from '../../Inventory_Shared/inventory-config.service';
import { toInventoryTitleCase } from '../../Inventory_Shared/inventory-text-case.util';
import { taxCodeImportConfig } from '../../Inventory_Shared/inventory-screen.model';
import { InventoryScreenShell } from '../../Inventory_Shared/inventory-screen-shell/inventory-screen-shell';

@Component({
  selector: 'app-inventory-tax-code-import',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, InventoryScreenShell],
  templateUrl: './tax-code-import.html'
})
export class InventoryTaxCodeImportComponent implements OnInit {
  private readonly svc = inject(InventoryConfigService);

  readonly selectedFile = signal<File | null>(null);
  readonly sourceName = signal('GST/CBIC import');
  readonly sourceUpdatedAt = signal('');
  readonly importing = signal(false);
  readonly loadingStatus = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  readonly summary = signal<TaxCodeImportSummary | null>(null);
  readonly sourceStatus = signal<TaxCodeSourceStatus | null>(null);
  readonly taxCodeImportConfig = taxCodeImportConfig;

  ngOnInit(): void {
    this.loadSourceStatus();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
    this.summary.set(null);
    this.message.set('');
    this.error.set('');
  }

  onSourceNameChange(value: string): void {
    this.sourceName.set(toInventoryTitleCase(value ?? ''));
  }

  upload(): void {
    const file = this.selectedFile();
    if (!file) {
      this.error.set('Choose a CSV or XLSX file first.');
      return;
    }

    this.importing.set(true);
    this.message.set('');
    this.error.set('');

    this.svc.importTaxCodes(file, this.sourceName().trim(), this.sourceUpdatedAt() || undefined).subscribe({
      next: res => {
        this.importing.set(false);
        this.summary.set(res.data ?? null);
        this.message.set(res.message || 'Tax codes imported.');
        this.loadSourceStatus();
      },
      error: err => {
        this.importing.set(false);
        this.error.set(err?.error?.message ?? 'Import failed. Check the file format and try again.');
      }
    });
  }

  loadSourceStatus(): void {
    this.loadingStatus.set(true);
    this.svc.getTaxCodeSourceStatus().subscribe({
      next: res => {
        this.sourceStatus.set(res.data ?? null);
        this.loadingStatus.set(false);
      },
      error: () => {
        this.sourceStatus.set(null);
        this.loadingStatus.set(false);
      }
    });
  }

  formatDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
