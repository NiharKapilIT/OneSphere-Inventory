import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';

import { AccessControlService } from '../../../core/services/Settings/access-control.service';

@Component({
  selector: 'app-settings-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './settings-dashboard.html',
  styles: [`
    .settings-dash-link {
      color: inherit;
      text-decoration: none;
      border-radius: 8px;
    }

    .settings-dash-link:hover {
      border-color: color-mix(in srgb, var(--clr-p2, #0891b2) 35%, #dbe8f9);
      background: color-mix(in srgb, var(--clr-p2, #0891b2) 6%, white);
    }
  `]
})
export class SettingsDashboard implements OnInit {
  private readonly accessControl = inject(AccessControlService);

  stats = [
    { label: 'Users', value: '0', icon: 'pi pi-users text-primary fs-4', route: '/dashboard/settings/user-management/manage-users' },
    { label: 'Roles', value: '0', icon: 'pi pi-shield text-success fs-4', route: '/dashboard/settings/user-management/roles-permissions' },
    { label: 'Branches', value: '0', icon: 'pi pi-sitemap text-info fs-4', route: '/dashboard/settings/branch-management/manage-branches' },
    { label: 'Active Users', value: '0', icon: 'pi pi-user-check text-warning fs-4', route: '/dashboard/settings/user-management/manage-users' }
  ];

  async ngOnInit(): Promise<void> {
    try {
      const [users, roles, branches] = await Promise.all([
        firstValueFrom(this.accessControl.getUsers().pipe(timeout(8000))),
        firstValueFrom(this.accessControl.getRoles().pipe(timeout(8000))),
        firstValueFrom(this.accessControl.getBranches().pipe(timeout(8000)))
      ]);
      const userData = users.data ?? [];
      this.stats = [
        { ...this.stats[0], value: String(userData.length) },
        { ...this.stats[1], value: String((roles.data ?? []).length) },
        { ...this.stats[2], value: String((branches.data ?? []).length) },
        { ...this.stats[3], value: String(userData.filter(user => user.status === 'active').length) }
      ];
    } catch {
      // Dashboard cards stay available even if the admin API is not reachable.
    }
  }
}
