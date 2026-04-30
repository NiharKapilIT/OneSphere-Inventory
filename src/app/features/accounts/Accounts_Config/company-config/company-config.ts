import { Component, DestroyRef, inject, signal } from "@angular/core";
import { TableModule } from "primeng/table";
import { DialogModule } from "primeng/dialog";
import { PageCriteria } from "../../../../core/models/pagecriteria";
import { CommonService } from "../../../../core/services/Common/common.service";
import {
  FormBuilder,
  FormGroup,
  FormControl,
  FormArray,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePickerModule } from 'primeng/datepicker';
import { NgSelectModule } from "@ng-select/ng-select";

@Component({
  selector: "app-company-config",
  imports: [TableModule, DialogModule, DatePickerModule, ReactiveFormsModule, CommonModule, NgSelectModule],
  templateUrl: "./company-config.html",
})
export class CompanyConfig {
  selectedTab = 'companyConfiguration';
  gridData: any[] = [];
  pageCriteria: PageCriteria;
  pageSize = 10;
  page: any = {};
  startindex: any; endindex: any;
  //  companyshowgrid:boolean=true

  companyshowgrid = signal<boolean>(false);
  branchshowgrid = signal<boolean>(false);
  visible = signal<boolean>(false);
  companyConfigvalidations: any = {};
  submitted = false;
  items: any = []
  private readonly destroyRef = inject(DestroyRef);

  private readonly _commonService = inject(CommonService);
  companyConfigForm!: FormGroup<any>;
  constructor(private fb: FormBuilder) {
    this.pageCriteria = new PageCriteria();

  }


  ngOnInit(): void {
    this.pageSetUp();
  }

  // ── Form Construction ────────────────────────────────────────────────────────
  private buildForm(): void {
    this.companyConfigForm = this.fb.group({
      companyName: ['', Validators.required],
      date: [''],

    } as any);
    this.BlurEventAllControll(this.companyConfigForm);
  }

  BlurEventAllControll(fromgroup: FormGroup): void {
    try {
      Object.keys(fromgroup.controls).forEach(key => this.setBlurEvent(fromgroup, key));
    } catch (e: any) {
      this._commonService.showErrorMessage(e);
    }
  }
  setBlurEvent(fromgroup: FormGroup, key: string): void {
    try {
      const formcontrol = fromgroup.get(key);
      if (!formcontrol) return;

      if (formcontrol instanceof FormGroup) {
        this.BlurEventAllControll(formcontrol);
      } else if (formcontrol.validator) {
        formcontrol.valueChanges
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => this.GetValidationByControl(fromgroup, key, true));
      }
    } catch (e: any) {
      this._commonService.showErrorMessage(e);
    }
  }
  GetValidationByControl(formGroup: FormGroup, key: string, isValid: boolean): boolean {
    try {
      const formcontrol = formGroup.get(key);
      if (!formcontrol) return isValid;

      if (formcontrol instanceof FormGroup) {
        this.checkValidations(formcontrol, isValid);
      } else if (formcontrol.validator) {
        this.companyConfigvalidations[key] = '';
        if ((this.submitted || formcontrol.dirty || formcontrol.touched) &&
          (formcontrol.errors || formcontrol.invalid)) {
          const el = document.getElementById(key);
          if (el) {
            const lablename = (el as HTMLInputElement).title;
            for (const errorkey in formcontrol.errors) {
              if (errorkey) {
                const msg = this._commonService.getValidationMessage(formcontrol, errorkey, lablename, key, '');
                this.companyConfigvalidations[key] += msg + ' ';
                isValid = false;
              }
            }
          }
        }
      }
    } catch (e: any) {
      this._commonService.showErrorMessage(e);
    }
    return isValid;
  }

  checkValidations(group: FormGroup, isValid: boolean): boolean {
    try {
      Object.keys(group.controls).forEach(key => {
        isValid = this.GetValidationByControl(group, key, isValid);
      });
    } catch (e: any) {
      this._commonService.showErrorMessage(e);
      return false;
    }
    return isValid;
  }

  showDialog() {
    this.visible.set(true);
  }

  private pageSetUp() {
    this.page.offset = 0; this.page.pageNumber = 1;
    this.page.size = this._commonService.pageSize || 10;
    this.startindex = 0; this.endindex = this.page.size;
    this.page.totalElements = 0; this.page.totalPages = 1;
    this.pageCriteria.pageSize = this.page.size;
    this.pageCriteria.offset = 0;
  }
  companyConfiguration() {
    this.companyshowgrid.set(true);
    this.branchshowgrid.set(false);
  }
  branchConfiguration() {
    this.companyshowgrid.set(false);
    this.branchshowgrid.set(true);
  }
  userInfo() {
    this.companyshowgrid.set(false);
    this.branchshowgrid.set(false);
  }

}
