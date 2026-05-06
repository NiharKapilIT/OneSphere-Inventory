import { Component, DestroyRef, inject, OnInit, signal, ViewChild } from "@angular/core";
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
import { BsDatepickerConfig } from "ngx-bootstrap/datepicker";
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { AccountsConfig } from "../../../../core/services/accounts/accounts-config";


@Component({
  selector: "app-company-config",
  standalone: true,
  imports: [TableModule, DialogModule, DatePickerModule, ReactiveFormsModule, CommonModule, FileUploadModule, NgSelectModule, ToastModule],
  templateUrl: "./company-config.html",
  providers: [MessageService]

})
export class CompanyConfig implements OnInit {

  uploadedImage = signal<string | null>(null);
  uploadError = signal<string | null>(null);
  uploadSuccess = signal<boolean>(false);
  private readonly messageService = inject(MessageService);
  @ViewChild('fileUpload') fileUploadRef!: FileUpload;


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
  today: any = new Date();
  statusOptions: any = []
  barnchname: any[] = [
    { value: 'Branch1', label: 'Branch1' },
    { value: 'Branch2', label: 'Branch2' },
    { value: 'Branch3', label: 'Branch3' },
  ];
  statusCode: any[] = [
    { value: 'Status1', label: 'Status1' },
    { value: 'Status2', label: 'Status2' },
    { value: 'Status3', label: 'Status3' },
  ];
  status: any[] = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];
  private readonly destroyRef = inject(DestroyRef);
  private readonly datepipe = inject(DatePipe);
  private readonly _commonService = inject(CommonService);
  private readonly _accountsConfig = inject(AccountsConfig);

  // formValidationMessages: Record<string, string> = {};


  currentdate: Partial<BsDatepickerConfig> = new BsDatepickerConfig();

  companyConfigForm!: FormGroup<any>;
  BranchConfigForm!: FormGroup<any>;
  constructor(private fb: FormBuilder) {
    this.pageCriteria = new PageCriteria();

  }


  ngOnInit(): void {
    this.pageSetUp();
    this.buildForm();

    this.companyConfigForm.get('companyName')?.valueChanges
      .subscribe(name => {
        this.generateCompanyCode(name);
      });


    this.BranchConfigForm.get('barnchname')?.valueChanges
      .subscribe(name => {
        this.generateBranchCode(name);

      });
    this._accountsConfig.GetCompanyBranchHierarchy(1, 3).subscribe({
      next: res => {
        console.log("res", res);

        this.gridData = res.data
      }
    })
  }


  
  generateCompanyCode(name: string) {
    if (!name) return;

    const words = name.trim().split(' ');

    const initials = words
      .filter(w => w.length > 0)
      .map(w => w[0].toUpperCase())
      .join('');

    const existing = (this.gridData || []).filter(x =>
      (x.companyCode || '').startsWith(initials)
    );

    const nextNumber = (existing.length + 1)
      .toString()
      .padStart(2, '0');

    const code = initials + nextNumber;

    this.companyConfigForm.patchValue({
      companyCode: code
    }, { emitEvent: false });
  }



  generateBranchCode(name: string) {
    if (!name) return;

    const words = name.trim().split(' ');

    const initials = words
      .filter(w => w.length > 0)
      .map(w => w[0].toUpperCase())
      .join('');

    const existing = (this.gridData || []).filter(x =>
      (x.branchCode || '').startsWith(initials)
    );

    const nextNumber = (existing.length + 1)
      .toString()
      .padStart(2, '0');

    const code = initials + nextNumber;

    this.BranchConfigForm.patchValue({
      branchCode: code
    }, { emitEvent: false });
  }


  // ── Form Construction ────────────────────────────────────────────────────────
  private buildForm(): void {
    this.companyConfigForm = this.fb.group({
      companyName: ['', Validators.required],
      createdBy: [''],
      contactId: [''],
      currencyFormate: [''],
      dateFormat: [''],
      status: ['Active'],
      registrationAddress: [''],
      panNumber: [''],
      cinNumber: [''],
      companyCode: [''],
      companyLogo: [''],

    } as any);
    this.BlurEventAllControll(this.companyConfigForm);

    this.BranchConfigForm = this.fb.group({
      barnchname: ['', Validators.required],
      branchCode: ['', Validators.required],
      gstNumber: [''],
      statuscode: [''],
      branchEmail: [''],
      branchContactNumber: [''],
      status: [''],
      branchAddress: [''],
      branchDate: [this.today]
    } as any);
    this.BlurEventAllControll(this.BranchConfigForm);





  }

  onIfscInput(): void {
    const control1 = this.companyConfigForm.get('panNumber');
    const control = this.companyConfigForm.get('cinNumber');
    if (control1?.value) {
      const clean = (control1.value as string)
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();
      control1.setValue(clean, { emitEvent: false });
    }
    if (control?.value) {
      const clean = (control.value as string)
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();
      control.setValue(clean, { emitEvent: false });
    }
  }


  onSave(): void {

    this.submitted = true;
    this.checkValidations(this.companyConfigForm, true);

    if (this.companyConfigForm.valid) {

      const payload = {
        companyCode: this.companyConfigForm.value.companyCode || '',
        companyName: this.companyConfigForm.value.companyName || '',
        createdBy: this.companyConfigForm.value.createdBy || '',
        contactId: this.companyConfigForm.value.contactId ? Number(this.companyConfigForm.value.contactId) : null,
        currencyFormat: this.companyConfigForm.value.currencyFormate || '',
        // dateFormat: this.datepipe.transform(this.companyConfigForm.value.dateFormat, 'yyyy-MM-dd') || '',
        dateFormat: this.datepipe.transform(new Date(), 'yyyy-MM-dd') || '',
        cinNumber: this.companyConfigForm.value.cinNumber || '',
        panNumber: this.companyConfigForm.value.panNumber || '',
        registrationAddress: this.companyConfigForm.value.registrationAddress || '',
        status: this.companyConfigForm.value.status === 'Active',
        companyLogo: this.uploadedImage() || '',
      };

      this._accountsConfig.SaveCompanyConfiguration(payload).subscribe({
        next: (response) => {
          if (response.success) {
            console.log('Company configuration saved successfully:', response);
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: response.message || 'Company configuration saved successfully!'
            });
            this.onClear();
            this.clearUploadedImage();
            this.visible.set(false);
          } else {
            console.warn('Save failed:', response);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: response.message || 'Failed to save configuration.'
            });
          }
        },
        error: (err: any) => {
          console.error('API Error:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Something went wrong. Please try again.'
          });
        }
      });
    }
  }


  onClear(): void {
    this.submitted = false;

    this.companyConfigForm.reset();

    // Reset validation states
    Object.keys(this.companyConfigForm.controls).forEach(key => {
      const control = this.companyConfigForm.get(key);
      control?.setErrors(null);
      control?.markAsPristine();
      control?.markAsUntouched();
    });

    // Clear custom validation messages
    this.companyConfigvalidations = {};

    // Clear uploaded image
    this.clearUploadedImage();
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


  onUpload(event: any) {
    this.uploadError.set(null);
    this.uploadSuccess.set(false);

    for (const file of event.currentFiles) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'svg'];

      if (!allowedTypes.includes(file.type) || !allowedExtensions.includes(fileExtension)) {
        this.uploadError.set('Only JPG, JPEG, PNG, and SVG files are allowed.');
        this.messageService.add({
          severity: 'error',
          summary: 'Invalid File Type',
          detail: 'Only JPG, JPEG, PNG, and SVG files are allowed.',
          life: 3000
        });
        this.fileUploadRef?.clear();
        return;
      }

      // Create image reader and validate dimensions
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const img = new Image();
        img.onload = () => {
          // Check dimensions
          if (img.width === 512 && img.height === 512) {
            // Valid image - store it
            // this.uploadedImage.set(e.target.result);
            const formData = new FormData();
            formData.append('file', file, file.name);

            this._commonService.uploadFile(formData).subscribe({
              next: (res: any) => {
                this.uploadedImage.set(res.filePath);
                this.uploadSuccess.set(true);
                this.uploadError.set(null);
                this.messageService.add({
                  severity: 'success',
                  summary: 'Success',
                  detail: `Image uploaded successfully!(${file.name})`,
                  life: 3000
                });
                console.log('File uploaded successfully:', file.name);
              },
              error: () => {
                this.uploadError.set('Failed to upload file.');
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: 'Failed to upload file.',
                  life: 3000
                });
              }
            });
          } else {
            // Invalid dimensions
            const error = `Invalid image dimensions.Expected 512x512 pixels, got ${img.width}x${img.height}`;
            this.uploadError.set(error);
            this.messageService.add({
              severity: 'error',
              summary: 'Invalid Dimensions',
              detail: error,
              life: 4000
            });
            this.fileUploadRef?.clear();
          }
        };

        img.onerror = () => {
          this.uploadError.set('Error loading image. Please ensure the file is a valid image.');
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error loading image. Please ensure the file is a valid image.',
            life: 3000
          });
        };

        img.src = e.target.result;
      };

      reader.onerror = () => {
        this.uploadError.set('Error reading file. Please try again.');
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error reading file. Please try again.',
          life: 3000
        });
      };

      reader.readAsDataURL(file);
    }
  }



  clearUploadedImage() {
    this.uploadedImage.set(null);
    this.uploadError.set(null);
    this.uploadSuccess.set(false);
    this.fileUploadRef?.clear();
  }





}
