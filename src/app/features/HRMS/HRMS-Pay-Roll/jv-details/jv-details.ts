import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { NgSelectModule } from '@ng-select/ng-select';

interface JvTypeOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-jv-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, NgSelectModule],
  templateUrl: './jv-details.html'
})
export class JvDetails {
  submitted = false;

  selectedYear: string | null = null;
  selectedMonth: number | null = null;
  selectedJvType: string | null = null;

  yearOptions = [
    '2020-2021',
    '2021-2022',
    '2022-2023',
    '2023-2024',
    '2024-2025',
    '2025-2026'
  ];

  monthOptions = [
    { label: 'January', value: 1 },
    { label: 'February', value: 2 },
    { label: 'March', value: 3 },
    { label: 'April', value: 4 },
    { label: 'May', value: 5 },
    { label: 'June', value: 6 },
    { label: 'July', value: 7 },
    { label: 'August', value: 8 },
    { label: 'September', value: 9 },
    { label: 'October', value: 10 },
    { label: 'November', value: 11 },
    { label: 'December', value: 12 }
  ];

  jvTypeOptions: JvTypeOption[] = [
    { label: 'ESI', value: 'ESI' },
    { label: 'PROVIDENT FUND', value: 'PROVIDENT_FUND' },
    { label: 'AO ALLOWANCES', value: 'AO_ALLOWANCES' },
    { label: 'PROFISSIONAL TAX', value: 'PROFISSIONAL_TAX' },
    { label: 'VDA', value: 'VDA' },
    { label: 'HRA', value: 'HRA' },
    { label: 'QUIT ACT ALLOWANCE', value: 'QUIT_ACT_ALLOWANCE' }
  ];

  onShow(): void {
    this.submitted = true;

    if (!this.selectedYear || !this.selectedMonth || !this.selectedJvType) {
      return;
    }

    console.log('JV Details Filter', {
      year: this.selectedYear,
      month: this.selectedMonth,
      jvType: this.selectedJvType
    });
  }

  onClear(): void {
    this.submitted = false;
    this.selectedYear = null;
    this.selectedMonth = null;
    this.selectedJvType = null;
  }
}
