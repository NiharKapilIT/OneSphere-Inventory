import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { NgSelectModule } from '@ng-select/ng-select';
import { HrmsPayroll } from '../../../../core/services/hrms/hrms-payroll';
import { CommonService } from '../../../../core/services/Common/common.service';

interface EmployeeOption {
  employeeCode: string;
  employeeName: string;
}

interface AttendanceRow {
  employeeCode: string;
  employeeName: string;
  designation: string;
  sl: number;
  totalSl: number;
  cl: number;
  totalCl: number;
  year: number;
  month: number;
}


@Component({
  selector: 'app-employee-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, ButtonModule, NgSelectModule],
  templateUrl: './employee-attendance.html',
  styleUrls: ['./employee-attendance.css']
})
export class EmployeeAttendance implements OnInit {
  submitted = false;

  selectedEmployee: EmployeeOption | null = null;
  selectedYear: number | null = null;
  selectedMonth: number | null = null;
 connectionString: string = '';
globalSchema: string = '';
companyName: string = '';
  branchSchema!: string;
  constructor(
  private _hrmsPayroll: HrmsPayroll,
      private _commonService: CommonService 
) {}

  employeeOptions: EmployeeOption[] = [
    { employeeCode: 'EMP001', employeeName: 'Ravi Kumar' },
    { employeeCode: 'EMP002', employeeName: 'Suresh Reddy' },
    { employeeCode: 'EMP003', employeeName: 'Anitha Devi' },
    { employeeCode: 'EMP004', employeeName: 'Mahesh Babu' }
  ];

yearOptions: number[] = [];

  getCalendarYears(): void {

    debugger;

    this._hrmsPayroll
      .GetCalendarYear(
        this.globalSchema,
        this.companyName,
       // this.branchSchema
      )
      .subscribe({
        next: (res: any[]) => {

          this.yearOptions = res.map(
            (x: any) => x.calendar_year
          );

        },
        error: (err: any) => {
          console.error(err);
        }
      });
  }
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

  allAttendanceList: AttendanceRow[] = [
    {
      employeeCode: 'EMP001',
      employeeName: 'Ravi Kumar',
      designation: 'Accounts Officer',
      sl: 1,
      totalSl: 6,
      cl: 0,
      totalCl: 2,
      year: 2026,
      month: 4
    },
    {
      employeeCode: 'EMP002',
      employeeName: 'Suresh Reddy',
      designation: 'HR Executive',
      sl: 0,
      totalSl: 4,
      cl: 1,
      totalCl: 3,
      year: 2026,
      month: 4
    },
    {
      employeeCode: 'EMP003',
      employeeName: 'Anitha Devi',
      designation: 'Software Engineer',
      sl: 2,
      totalSl: 5,
      cl: 1,
      totalCl: 4,
      year: 2026,
      month: 4
    },
    {
      employeeCode: 'EMP004',
      employeeName: 'Mahesh Babu',
      designation: 'Admin Executive',
      sl: 0,
      totalSl: 3,
      cl: 0,
      totalCl: 1,
      year: 2026,
      month: 4
    }
  ];

  attendanceList: AttendanceRow[] = [];

 ngOnInit(): void {
    // Load session/connection values first
    this.connectionString = this._commonService.ConnectionString;  // adjust property names
    this.globalSchema     = this._commonService.globalschema;      // to match your CommonService
    this.branchSchema     = this._commonService.BranchSchema;
    this.companyName      = this._commonService.CompanyName;

    this.attendanceList = [...this.allAttendanceList];
    this.getCalendarYears(); // ← now has values
  }

  runAttendance(): void {
    this.submitted = true;

    if (!this.selectedYear || !this.selectedMonth) {
      return;
    }

    this.attendanceList = this.allAttendanceList.filter(row => {
      const matchesYear = row.year === this.selectedYear;
      const matchesMonth = row.month === this.selectedMonth;
      const matchesEmployee = this.selectedEmployee
        ? row.employeeCode === this.selectedEmployee.employeeCode
        : true;

      return matchesYear && matchesMonth && matchesEmployee;
    });
  }

  onClear(): void {
    this.submitted = false;
    this.selectedEmployee = null;
    this.selectedYear = null;
    this.selectedMonth = null;
    this.attendanceList = [...this.allAttendanceList];
  }
}