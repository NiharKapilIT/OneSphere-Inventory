import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { NgSelectModule } from '@ng-select/ng-select';

interface BiometricRow {
  branch: string;
  employeeCode: string;
  date: string;
  employeeName: string;
  leaveType: string;
  avaCl: number;
  avaSl: number;
}

@Component({
  selector: 'app-biometric-report',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, ButtonModule, NgSelectModule],
  templateUrl: './biometric-Attendance.html',
  styleUrls: ['./biometric-Attendance.css']
})
export class BiometricAttendance implements OnInit {
  submitted = false;

  fromDate = '2026-04-01';
  toDate = '2026-04-01';

  allBiometricList: BiometricRow[] = [
    {
      branch: 'Hyderabad',
      employeeCode: 'EMP001',
      date: '2026-04-01',
      employeeName: 'Ravi Kumar',
      leaveType: 'CL',
      avaCl: 2,
      avaSl: 6
    },
    {
      branch: 'Warangal',
      employeeCode: 'EMP002',
      date: '2026-04-01',
      employeeName: 'Suresh Reddy',
      leaveType: 'SL',
      avaCl: 3,
      avaSl: 4
    },
    {
      branch: 'Chennai',
      employeeCode: 'EMP003',
      date: '2026-04-01',
      employeeName: 'Anitha Devi',
      leaveType: 'CL',
      avaCl: 4,
      avaSl: 5
    }
  ];

  biometricList: BiometricRow[] = [];

  ngOnInit(): void {
    this.biometricList = [...this.allBiometricList];
  }

  onShow(): void {
    this.submitted = true;

    if (!this.fromDate || !this.toDate) {
      return;
    }

    this.biometricList = this.allBiometricList.filter(row => {
      return row.date >= this.fromDate && row.date <= this.toDate;
    });
  }

  onCancel(): void {
    this.submitted = false;
    this.fromDate = '2026-04-01';
    this.toDate = '2026-04-01';
    this.biometricList = [...this.allBiometricList];
  }

  onSave(): void {
    console.log('Save clicked', this.biometricList);
  }

  onExportPdf(): void {
    console.log('Export PDF clicked');
  }

  onPrint(): void {
    console.log('Print clicked');
  }
}