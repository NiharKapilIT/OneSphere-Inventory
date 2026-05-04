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
  loading = signal(false);
  errorMessage = signal('');

  companyCodes = signal<CompanyCode[]>([]);
  companyOptions = signal<{ label: string; value: number }[]>([]);
  branchOptions = signal<{ label: string; value: string }[]>([]);

  selectedCompanyId = signal<number | null>(null);
  selectedCompanyCode = signal('');
  selectedBranchCode = signal('');
  // selectedBranchCode = signal('');
  username = signal('');
  password = signal('');

  // ── Computed ─────────────────────────────────────────────────────
  noBranches = computed(() =>
    !!this.selectedCompanyId() &&
    this.branchOptions().length === 0 &&
    !this.loading()
  );


  // ── ngOnInit: set API URL then load companies ────────
  async ngOnInit(): Promise<void> {
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
    this.selectedBranchCode.set('');
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
    this.step.set(1);
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
