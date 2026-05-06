import { Component } from '@angular/core';

@Component({
  selector: 'app-settings-dashboard',
  templateUrl: './settings-dashboard.html'
})
export class SettingsDashboard {
  stats = [
    { label: 'Users', value: '0', icon: 'pi pi-users text-primary fs-4' },
    { label: 'Roles', value: '0', icon: 'pi pi-shield text-success fs-4' },
    { label: 'Activity Logs', value: '0', icon: 'pi pi-list-check text-info fs-4' },
    { label: 'System Tasks', value: '0', icon: 'pi pi-server text-warning fs-4' }
  ];
}
