// // import { Component } from '@angular/core';

// // @Component({
// //   selector: 'app-ssc-agenda',
// //   imports: [],
// //   templateUrl: './ssc-agenda.html',
// //   styleUrl: './ssc-agenda.css',
// // })
// // export class SscAgenda {
// // action() {
// // throw new Error('Method not implemented.');
// // }
// // setAction(arg0: string) {
// // throw new Error('Method not implemented.');
// // }
// // }

// import { CommonModule } from '@angular/common';
// import { Component, computed, signal } from '@angular/core';
// import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// type ActionType = 'confirmation' | 'promotion' | 'transfer' | 'resignation';

// interface Employee {
//   id: number;
//   name: string;
//   epfNo: string;
//   designation: string;
//   hireDate: string;
// }

// @Component({
//   selector: 'app-ssc-agenda',
//   standalone: true,
//   imports: [CommonModule, ReactiveFormsModule],
//   templateUrl: './ssc-agenda.html',
//   styleUrl: './ssc-agenda.css'
// })
// export class SscAgenda {
//   action = signal<ActionType>('confirmation');

//   employees: Employee[] = [
//     {
//       id: 1,
//       name: 'Ravi Kumar',
//       epfNo: 'EPF10234',
//       designation: 'Software Engineer',
//       hireDate: '12-Jan-2024'
//     },
//     {
//       id: 2,
//       name: 'Suresh Reddy',
//       epfNo: 'EPF10235',
//       designation: 'HR Executive',
//       hireDate: '21-Feb-2024'
//     },
//     {
//       id: 3,
//       name: 'Anitha Rao',
//       epfNo: 'EPF10236',
//       designation: 'Payroll Analyst',
//       hireDate: '18-Mar-2024'
//     }
//   ];

//   designations = [
//     'Software Engineer',
//     'Senior Software Engineer',
//     'HR Executive',
//     'Payroll Analyst',
//     'Team Lead',
//     'Manager'
//   ];

//   form: FormGroup;

//   selectedEmployee = computed(() => {
//     const employeeId = Number(this.form?.get('employeeId')?.value || 0);
//     return this.employees.find(emp => emp.id === employeeId) || null;
//   });

//   constructor(private fb: FormBuilder) {
//     this.form = this.fb.group({
//       employeeId: ['', Validators.required],
//       designation: ['', Validators.required],
//       dateOfConfirmation: ['31-Mar-2026', Validators.required],
//       remarks: ['', Validators.required],
//       refNo: ['', Validators.required],
//       minutesDate: ['31-Mar-2026', Validators.required]
//     });
//   }

//   setAction(type: ActionType): void {
//     this.action.set(type);
//   }

//   onSave(): void {
//     if (this.form.invalid) {
//       this.form.markAllAsTouched();
//       return;
//     }

//     const payload = {
//       action: this.action(),
//       ...this.form.value
//     };

//     console.log('Saved data:', payload);
//   }

//   onCancel(): void {
//     this.form.reset({
//       employeeId: '',
//       designation: '',
//       dateOfConfirmation: '31-Mar-2026',
//       remarks: '',
//       refNo: '',
//       minutesDate: '31-Mar-2026'
//     });
//     this.action.set('confirmation');
//   }

//   hasError(controlName: string): boolean {
//     const control = this.form.get(controlName);
//     return !!(control && control.invalid && (control.dirty || control.touched));
//   }
// }

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-ssc-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './ssc-agenda.html',
  styleUrls: ['./ssc-agenda.css']
})
export class SscAgenda {
  selectedTab: string = 'Confirmation';

  selectedEmployee: string | null = null;
  selectedDesignation: string | null = null;
  selectedPromotionDesignation: string | null = null;
  selectedBranch: string | null = null;
  selectedTransferDesignation: string | null = null;
  selectedAuthority: string | null = null;

  employeeOptions: string[] = ['Employee 1', 'Employee 2', 'Employee 3'];
  designationOptions: string[] = ['HR Executive', 'Accounts Officer', 'Software Engineer'];
  promotionDesignationOptions: string[] = ['Senior HR Executive', 'Assistant Manager', 'Manager'];
  branchOptions: string[] = ['Hyderabad', 'Warangal', 'Chennai'];
  authorityOptions: string[] = ['HR Manager', 'Branch Manager', 'Managing Director'];
}