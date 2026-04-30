import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { NgSelectModule } from '@ng-select/ng-select';

interface EmployeeLookupRow {
  employeeId: string;
  employeeName: string;
  designation: string;
}

@Component({
  selector: 'app-khc-details',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, ButtonModule, NgSelectModule],
  templateUrl: './khc-details.html',
  styleUrls: ['./khc-details.css']
})
export class KhcDetails implements OnInit {
  submitted = false;

  employeeList: EmployeeLookupRow[] = [];
  allEmployees: EmployeeLookupRow[] = [
    {
      employeeId: 'EMP001',
      employeeName: 'Ravi Kumar',
      designation: 'Accounts Officer'
    },
    {
      employeeId: 'EMP002',
      employeeName: 'Suresh Reddy',
      designation: 'HR Executive'
    },
    {
      employeeId: 'EMP003',
      employeeName: 'Anitha Devi',
      designation: 'Software Engineer'
    }
  ];

  formData = {
    employeeId: '',
    employeeName: '',
    presentDesignation: '',
    kapilGroupJoinDate: '2026-04-01',
    khcNo: '',
    employeePolicyDate: '2026-04-01',
    renewalDate: '2026-04-01',
    policyAmount: null as number | null
  };

  ngOnInit(): void {
    this.employeeList = [...this.allEmployees];
  }

  onSelectEmployee(row: EmployeeLookupRow): void {
    this.formData.employeeId = row.employeeId;
    this.formData.employeeName = row.employeeName;
    this.formData.presentDesignation = row.designation;
  }

  onClear(): void {
    this.submitted = false;
    this.employeeList = [...this.allEmployees];
    this.formData = {
      employeeId: '',
      employeeName: '',
      presentDesignation: '',
      kapilGroupJoinDate: '2026-04-01',
      khcNo: '',
      employeePolicyDate: '2026-04-01',
      renewalDate: '2026-04-01',
      policyAmount: null
    };
  }

  onSave(): void {
    this.submitted = true;

    if (!this.formData.khcNo || !this.formData.policyAmount) {
      return;
    }

    console.log('KHC Details Saved', this.formData);
  }
}