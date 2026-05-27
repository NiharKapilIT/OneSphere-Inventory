import {
  Component, OnInit, signal, computed, inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';


import {
  CompanyCode, BranchCode, LoginResponse
} from './login.models';


import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { environment } from '../../../envir/environment.prod';
import { AuthService } from '../../core/services/auth.service';
import { CompanyDetailsService } from '../../core/services/Common/company-details-service';
import { NgSelectModule } from '@ng-select/ng-select';

type AuthMode = 'login' | 'otp' | 'register';
type RegisterStep = 1 | 2 | 3 | 4 | 5;

interface RegistrationBranch {
  branchName: string;
  branchCode: string;
  city: string;
  state: string;
  contactNo: string;
}

interface CompanySetupDraft {
  companyName: string;
  legalName: string;
  companyCode: string;
  gstin: string;
  pan: string;
  cin: string;
  email: string;
  contactNo: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  financialYear: string;
}

interface AdminUserDraft {
  fullName: string;
  email: string;
  contactNo: string;
  role: string;
  accessScope: string;
}

interface DemoPermission {
  module: string;
  access: string;
  rights: string;
}

interface DemoUserAccess {
  name: string;
  role: string;
  company: string;
  branch: string;
  access: string;
}

interface DemoLoginCompany {
  name: string;
  code: string;
  role: string;
  branches: string[];
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule, NgSelectModule, ButtonModule,
    InputTextModule, PasswordModule, ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {

  // ── DI via inject() ──────────────────────────────────────────────
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly companyService = inject(CompanyDetailsService);

  // ── Signals ──────────────────────────────────────────────────────
  step = signal<1 | 2>(1);
  authMode = signal<AuthMode>('login');
  registerStep = signal<RegisterStep>(1);
  saasDemoModalOpen = signal(false);
  saasDemoStep = signal<RegisterStep>(1);
  otpLoginStep = signal<1 | 2>(1);
  loading = signal(false);
  errorMessage = signal('');

  companyCodes = signal<CompanyCode[]>([]);
  companyOptions = signal<{ label: string; value: number }[]>([]);
  branchOptions = signal<{ label: string; value: string }[]>([]);

  selectedCompanyId = signal<number | null>(null);
  selectedBranchCode = signal('');
  selectedCompanyCode = signal('');
  username = signal('');
  password = signal('');

  loginOtpIdentifier = signal('');
  loginOtp = signal('');
  loginOtpSent = signal(false);

  registrationIdentity = signal('admin@demoenterprise.com');
  registrationOtp = signal('123456');
  registrationOtpSent = signal(false);
  registrationOtpVerified = signal(false);

  companySetup = signal<CompanySetupDraft>({
    companyName: 'Demo Enterprise Pvt Ltd',
    legalName: 'Demo Enterprise Private Limited',
    companyCode: 'DEMO01',
    gstin: '36ABCDE1234F1Z5',
    pan: 'ABCDE1234F',
    cin: 'U72900TG2026PTC000001',
    email: 'accounts@demoenterprise.com',
    contactNo: '9876543210',
    address: '5th Floor, Business Towers, Financial District',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    pincode: '500032',
    financialYear: '2025-2026',
  });

  registrationBranches = signal<RegistrationBranch[]>([
    { branchName: 'Head Office', branchCode: 'HO', city: 'Hyderabad', state: 'Telangana', contactNo: '9876543210' },
    { branchName: 'Bengaluru Branch', branchCode: 'BLR', city: 'Bengaluru', state: 'Karnataka', contactNo: '9876501234' },
  ]);

  adminUser = signal<AdminUserDraft>({
    fullName: 'Demo Admin',
    email: 'admin@demoenterprise.com',
    contactNo: '9876543210',
    role: 'Default Admin',
    accessScope: 'All Branches',
  });

  demoPermissions = signal<DemoPermission[]>([
    { module: 'Accounts', access: 'Admin', rights: 'Create, View, Update, Delete, Approve' },
    { module: 'HRMS', access: 'Manager', rights: 'Create, View, Update, Approve' },
    { module: 'Reports', access: 'View Only', rights: 'View, Export' },
    { module: 'Settings', access: 'Admin Only', rights: 'Create Roles, Assign Users, Configure Company' },
  ]);

  demoUserAccess = signal<DemoUserAccess[]>([
    { name: 'Demo Admin', role: 'Default Admin', company: 'Demo Enterprise', branch: 'All Branches', access: 'Full CRUD + Approvals' },
    { name: 'Accounts Manager', role: 'Accounts Admin', company: 'Demo Enterprise', branch: 'Head Office', access: 'CRUD + Approvals' },
    { name: 'HR Executive', role: 'HR User', company: 'Demo Enterprise', branch: 'Bengaluru Branch', access: 'Create, View, Update' },
    { name: 'Management Viewer', role: 'Viewer', company: 'All Allocated Companies', branch: 'All Allocated Branches', access: 'View Only' },
  ]);

  demoLoginCompanies = signal<DemoLoginCompany[]>([
    { name: 'Demo Enterprise Pvt Ltd', code: 'DEMO01', role: 'Default Admin', branches: ['Head Office', 'Bengaluru Branch'] },
    { name: 'Kapil Demo Services', code: 'KDS01', role: 'Management Viewer', branches: ['Corporate Office', 'Vizag Branch'] },
  ]);



  // ── Computed ─────────────────────────────────────────────────────
  noBranches = computed(() =>
    !!this.selectedCompanyId() &&
    this.branchOptions().length === 0 &&
    !this.loading()
  );

  registerProgress = computed(() => {
    const step = this.registerStep();
    return [
      { no: 1, label: 'Verify', active: step === 1, done: step > 1 },
      { no: 2, label: 'Company', active: step === 2, done: step > 2 },
      { no: 3, label: 'Branches', active: step === 3, done: step > 3 },
      { no: 4, label: 'Admin User', active: step === 4, done: false },
    ];
  });

  saasDemoProgress = computed(() => {
    const step = this.saasDemoStep();
    return [
      { no: 1, label: 'Verify', active: step === 1, done: step > 1 },
      { no: 2, label: 'Company', active: step === 2, done: step > 2 },
      { no: 3, label: 'Branches', active: step === 3, done: step > 3 },
      { no: 4, label: 'Users & Access', active: step === 4, done: step > 4 },
      { no: 5, label: 'Login Flow', active: step === 5, done: false },
    ];
  });


  // ── ngOnInit: set API URL then load companies ────────

  async ngOnInit(): Promise<void> {
    (this.selectedBranchCode as any).set(null);
    (this.selectedCompanyCode as any).set(null);
    (this.selectedCompanyId as any).set(null);

    let urldata = environment.apiURL;
    let res = await this.http.get<{ apiURL: string }[]>(urldata).toPromise();

    if (res?.length && res[0].apiURL) {
      let url = new URL(res[0].apiURL);
      let apiURL = url.origin + '/api';
      sessionStorage.setItem('apiURL', apiURL);
    }

    await this.loadCompanyCodes();
  }

  // ── Load companies ───────────────────────────────────────────────
  private async loadCompanyCodes(): Promise<void> {

    const api = sessionStorage.getItem('apiURL') ?? '';
    try {
      const data = await firstValueFrom(
        this.http.get<CompanyCode[]>(`${api}/Accounts/GetUsersCompanyCodes`).pipe(timeout(10000))
      );
      this.companyCodes.set(data);
      this.companyOptions.set(
        data.map(c => ({
          label: c.company_name,
          value: c.tbl_mst_chit_company_configuration_id,
        }))
      );
    } catch {
      this.showToast('error', 'Error', 'Failed to load company codes');
    }
  }

  // ── Company change → load branches ───────────────────────────────
  async onCompanyChange(): Promise<void> {
    const id = this.selectedCompanyId();
    const api = sessionStorage.getItem('apiURL') ?? '';

    this.branchOptions.set([]);
    //this.selectedBranchCode.set('');
    (this.selectedBranchCode as any).set(null);
    this.errorMessage.set('');
    if (!id) return;

    const found = this.companyCodes().find(
      c => c.tbl_mst_chit_company_configuration_id === id
    );
    this.selectedCompanyCode.set(found?.company_code ?? '');
    this.loading.set(true);

    try {
      const data = await firstValueFrom(
        this.http.get<BranchCode[]>(
          `${api}/Accounts/GetUsersBranchCodes?companyConfigurationId=${id}`
        ).pipe(timeout(10000))
      );
      this.branchOptions.set(
        data.map(b => ({ label: b.branch_name, value: b.branch_code }))
      );
    } catch {
      this.showToast('error', 'Error', 'Failed to load branch codes');
    } finally {
      this.loading.set(false);
    }
  }

  // ── Step 1 next ──────────────────────────────────────────────────
  onStep1Next(): void {
    this.errorMessage.set('');
    if (!this.selectedCompanyId()) {
      this.errorMessage.set('Please select a company.'); return;
    }
    if (!this.selectedBranchCode()) {
      this.errorMessage.set('Please select a branch.'); return;
    }
    this.step.set(2);
  }

  // ── Go back ──────────────────────────────────────────────────────

  goBack(): void {
    (this.selectedBranchCode as any).set(null);
    (this.selectedCompanyCode as any).set(null);
    (this.selectedCompanyId as any).set(null);
    this.step.set(1);
  }

  setAuthMode(mode: AuthMode): void {
    this.authMode.set(mode);
    this.errorMessage.set('');
    if (mode === 'login') {
      this.step.set(1);
    }
    if (mode === 'otp') {
      this.otpLoginStep.set(1);
    }
    if (mode === 'register') {
      this.registerStep.set(1);
    }
  }

  openSaasRegistrationDemo(): void {
    this.errorMessage.set('');
    this.saasDemoStep.set(1);
    this.saasDemoModalOpen.set(true);
  }

  closeSaasRegistrationDemo(): void {
    this.saasDemoModalOpen.set(false);
    this.errorMessage.set('');
  }

  setSaasDemoStep(step: number): void {
    this.saasDemoStep.set(step as RegisterStep);
    this.errorMessage.set('');
  }

  nextSaasDemoStep(): void {
    const step = this.saasDemoStep();
    if (step < 5) {
      this.saasDemoStep.set((step + 1) as RegisterStep);
    }
  }

  previousSaasDemoStep(): void {
    const step = this.saasDemoStep();
    if (step > 1) {
      this.saasDemoStep.set((step - 1) as RegisterStep);
    }
  }

  sendLoginOtp(): void {
    this.errorMessage.set('');
    if (!this.loginOtpIdentifier().trim()) {
      this.errorMessage.set('Please enter mobile number or mail ID.');
      return;
    }
    this.loginOtpSent.set(true);
    this.showToast('success', 'OTP sent', 'A verification code has been sent.');
  }

  verifyLoginOtp(): void {
    this.errorMessage.set('');
    if (!this.loginOtpSent()) {
      this.errorMessage.set('Please send OTP first.');
      return;
    }
    if (this.loginOtp().trim().length < 4) {
      this.errorMessage.set('Please enter a valid OTP.');
      return;
    }
    this.otpLoginStep.set(2);
    this.showToast('success', 'OTP verified', 'Choose company and branch to continue.');
  }

  completeOtpLogin(): void {
    this.errorMessage.set('');
    if (!this.selectedCompanyId() || !this.selectedBranchCode()) {
      this.errorMessage.set('Please select company and branch.');
      return;
    }
    this.showToast('success', 'OTP login ready', 'Backend login integration can be connected later.');
  }

  sendRegistrationOtp(): void {
    this.errorMessage.set('');
    if (!this.registrationIdentity().trim()) {
      this.errorMessage.set('Please enter mobile number or mail ID.');
      return;
    }
    this.registrationOtpSent.set(true);
    this.showToast('success', 'OTP sent', 'Registration OTP has been sent.');
  }

  confirmRegistrationOtp(): void {
    this.errorMessage.set('');
    if (!this.registrationOtpSent()) {
      this.errorMessage.set('Please send OTP first.');
      return;
    }
    if (this.registrationOtp().trim().length < 4) {
      this.errorMessage.set('Please enter a valid OTP.');
      return;
    }
    this.registrationOtpVerified.set(true);
    this.registerStep.set(2);
  }

  updateCompanySetup(field: keyof CompanySetupDraft, value: string): void {
    this.companySetup.update(current => ({ ...current, [field]: value }));
  }

  goToCompanyBranchSetup(): void {
    const company = this.companySetup();
    this.errorMessage.set('');
    if (!company.companyName.trim() || !company.companyCode.trim() || !company.email.trim() || !company.contactNo.trim()) {
      this.errorMessage.set('Please fill company name, code, mail ID and contact number.');
      return;
    }
    this.registerStep.set(3);
  }

  addRegistrationBranch(): void {
    this.registrationBranches.update(branches => [
      ...branches,
      { branchName: '', branchCode: '', city: '', state: '', contactNo: '' },
    ]);
  }

  removeRegistrationBranch(index: number): void {
    this.registrationBranches.update(branches =>
      branches.length === 1 ? branches : branches.filter((_, branchIndex) => branchIndex !== index)
    );
  }

  updateRegistrationBranch(index: number, field: keyof RegistrationBranch, value: string): void {
    this.registrationBranches.update(branches =>
      branches.map((branch, branchIndex) =>
        branchIndex === index ? { ...branch, [field]: value } : branch
      )
    );
  }

  goToAdminUserSetup(): void {
    this.errorMessage.set('');
    const hasBranch = this.registrationBranches().some(branch =>
      branch.branchName.trim() && branch.branchCode.trim()
    );
    if (!hasBranch) {
      this.errorMessage.set('Please add at least one branch name and branch code.');
      return;
    }
    this.registerStep.set(4);
  }

  updateAdminUser(field: keyof AdminUserDraft, value: string): void {
    this.adminUser.update(current => ({ ...current, [field]: value }));
  }

  finishRegistrationSetup(): void {
    const admin = this.adminUser();
    this.errorMessage.set('');
    if (!admin.fullName.trim() || !admin.email.trim() || !admin.contactNo.trim()) {
      this.errorMessage.set('Please fill admin user name, mail ID and contact number.');
      return;
    }
    this.showToast('success', 'Registration UI complete', 'Company, branch and admin user setup is ready for backend integration.');
    this.setAuthMode('login');
  }

  // ── Login POST ───────────────────────────────────────────────────
  async onLogin(): Promise<void> {
    this.errorMessage.set('');
    if (!this.username().trim()) {
      this.errorMessage.set('Please enter your username.'); return;
    }
    if (!this.password().trim()) {
      this.errorMessage.set('Please enter your password.'); return;
    }

    const api = sessionStorage.getItem('apiURL') ?? '';
    this.loading.set(true);

    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(`${api}/Accounts/login`, {
          user_name: this.username().trim(),
          password: this.password().trim(),
          companyCode: this.selectedCompanyCode(),
          branchCode: this.selectedBranchCode(),
        }).pipe(timeout(10000))
      );

      const resolvedUsername =
        (response as any).user_name ?? response.username ?? this.username().trim();

      this.authService.setSession(
        response.token || '',
        resolvedUsername,
        this.selectedCompanyCode(),
        this.selectedBranchCode(),
        response.userId,
        response.branchId,
        response.ipAddress,
      );
      sessionStorage.setItem('moduleName','accounts')
      // store company details (fire-and-forget, non-blocking)
      this.companyService.GetCompanyData().subscribe({
        next: (d: any) => {
          if (d?.length) sessionStorage.setItem('CompanyDetails', JSON.stringify(d[0]));
        },
      });

      this.showToast('success', 'Login successful', `Welcome back, ${resolvedUsername}!`);
      setTimeout(() => this.router.navigate(['/dashboard']), 1000);

    } catch (err: any) {
      if (err?.status === 401) {
        this.errorMessage.set('Invalid username or password.');
        this.showToast('error', 'Login failed', 'Invalid credentials. Please try again.');
      } else {
        this.errorMessage.set('Login failed. Please try again.');
        this.showToast('error', 'Error', 'Something went wrong. Please try again.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  // ── Toast helper ─────────────────────────────────────────────────
  showToast(severity: string, summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail, life: 3000 });
  }
}
