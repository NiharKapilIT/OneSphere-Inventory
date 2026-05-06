import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';

import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface EmployeeOnRollModel {
  empId: string;
  employeeName: string;
  designation: string;
  basicSalary: number;
  specialAllowances: number;
  allowances: number;

  total?: number;
  pfNo?: string;
  esiNo?: string;
  khcNo?: string;
  bloodGroup?: string;
  doj?: Date;
  sscMinutes?: string;
  newChargeDate?: Date;
}

@Component({
  selector: 'app-employee-on-roll',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, ButtonModule],
  templateUrl: './employee-on-roll.html',
  styleUrls: ['./employee-on-roll.css']
})
export class EmployeeOnRoll implements OnInit {

  searchText = '';

  employeeList: EmployeeOnRollModel[] = [];

  allEmployees: EmployeeOnRollModel[] = [
    {
      empId: 'EMP001',
      employeeName: 'Ravi Kumar',
      designation: 'Accounts Officer',
      basicSalary: 35000,
      specialAllowances: 5000,
      allowances: 3000,
      pfNo: 'PF001',
      esiNo: 'ESI001',
      khcNo: 'KHC001',
      bloodGroup: 'O+',
      doj: new Date('2020-01-15'),
      sscMinutes: '10',
      newChargeDate: new Date('2023-06-01')
    },
    {
      empId: 'EMP002',
      employeeName: 'Suresh Reddy',
      designation: 'HR Executive',
      basicSalary: 32000,
      specialAllowances: 4000,
      allowances: 2500,
      pfNo: 'PF002',
      esiNo: 'ESI002',
      khcNo: 'KHC002',
      bloodGroup: 'A+',
      doj: new Date('2019-03-10'),
      sscMinutes: '15',
      newChargeDate: new Date('2022-08-12')
    },
    {
      empId: 'EMP003',
      employeeName: 'Anitha Devi',
      designation: 'Software Engineer',
      basicSalary: 45000,
      specialAllowances: 7000,
      allowances: 3500,
      pfNo: 'PF003',
      esiNo: 'ESI003',
      khcNo: 'KHC003',
      bloodGroup: 'B+',
      doj: new Date('2021-07-20'),
      sscMinutes: '12',
      newChargeDate: new Date('2024-01-01')
    },
    {
      empId: 'EMP004',
      employeeName: 'Mahesh Babu',
      designation: 'Admin Executive',
      basicSalary: 28000,
      specialAllowances: 3000,
      allowances: 2000,
      pfNo: 'PF004',
      esiNo: 'ESI004',
      khcNo: 'KHC004',
      bloodGroup: 'AB+',
      doj: new Date('2018-11-05'),
      sscMinutes: '8',
      newChargeDate: new Date('2021-09-15')
    }
  ];

  ngOnInit(): void {
    this.employeeList = this.calculateTotals(this.allEmployees);
  }


  calculateTotals(data: EmployeeOnRollModel[]): EmployeeOnRollModel[] {
    return data.map(emp => ({
      ...emp,
      total: (emp.basicSalary || 0) +
        (emp.specialAllowances || 0) +
        (emp.allowances || 0)
    }));
  }


  onSearch(): void {
    const value = this.searchText.trim().toLowerCase();

    if (!value) {
      this.employeeList = this.calculateTotals(this.allEmployees);
      return;
    }

    const filtered = this.allEmployees.filter(emp =>
      emp.empId.toLowerCase().includes(value) ||
      emp.employeeName.toLowerCase().includes(value) ||
      emp.designation.toLowerCase().includes(value)
    );

    this.employeeList = this.calculateTotals(filtered);
  }


  onClear(): void {
    this.searchText = '';
    this.employeeList = this.calculateTotals(this.allEmployees);
  }

  viewEmployee(emp: EmployeeOnRollModel): void {
    console.log('Employee:', emp);
  }

  onMoreClick(emp: any): void {
    console.log('More clicked:', emp);
  }


  // exportExcel(): void {
  //   if (!this.employeeList.length) return;

  //   const exportData = this.employeeList.map(emp => ({
  //     'Emp ID': emp.empId,
  //     'Employee Name': emp.employeeName,
  //     'Designation': emp.designation,
  //     'Basic Salary': emp.basicSalary,
  //     'Special Allowances': emp.specialAllowances,
  //     'Allowances': emp.allowances,
  //     'Total': emp.total
  //   }));

  //   const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
  //   const workbook: XLSX.WorkBook = {
  //     Sheets: { 'Employee On-Roll': worksheet },
  //     SheetNames: ['Employee On-Roll']
  //   };

  //   const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

  //   const blob = new Blob([excelBuffer], {
  //     type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
  //   });

  //   saveAs(blob, 'employee-on-roll.xlsx');
  // }


  // exportPdf(): void {
  //   if (!this.employeeList.length) return;

  //   const doc = new jsPDF('l', 'mm', 'a4');

  //   doc.setFontSize(14);
  //   doc.text('Employee On-Roll', 14, 15);

  //   const headers = [[
  //     'Emp ID',
  //     'Employee Name',
  //     'Designation',
  //     'Basic Salary',
  //     'Special Allowances',
  //     'Allowances',
  //     'Total'
  //   ]];

  //   const rows = this.employeeList.map(emp => [
  //     emp.empId,
  //     emp.employeeName,
  //     emp.designation,
  //     emp.basicSalary,
  //     emp.specialAllowances,
  //     emp.allowances,
  //     emp.total
  //   ]);

  //   autoTable(doc, {
  //     head: headers,
  //     body: rows,
  //     startY: 22,
  //     styles: { fontSize: 9, cellPadding: 3 },
  //     headStyles: { fillColor: [43, 80, 236] }
  //   });

  //   doc.save('employee-on-roll.pdf');
  // }


}