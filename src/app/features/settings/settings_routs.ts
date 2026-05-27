import { Routes } from '@angular/router';

export const settingsRoutes: Routes = [
  {
    path: 'settings-dashboard',
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./settings-dashboard/settings-dashboard')
            .then(m => m.SettingsDashboard)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'branch-management',
    children: [
      {
        path: 'manage-branches',
        loadComponent: () =>
          import('./branch-management/manage-branches/manage-branches.component')
            .then(m => m.ManageBranchesComponent)
      },
      {
        path: '',
        redirectTo: 'manage-branches',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'user-management',
    children: [
      {
        path: 'manage-users',
        loadComponent: () =>
          import('./user-management/manage-users/manage-users.component')
            .then(m => m.ManageUsersComponent)
      },
      {
        path: 'roles-permissions',
        loadComponent: () =>
          import('./user-management/roles-permissions/roles-permissions.component')
            .then(m => m.RolesPermissionsComponent)
      },
      {
        path: '',
        redirectTo: 'manage-users',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: 'settings-dashboard/dashboard',
    pathMatch: 'full'
  }
];
