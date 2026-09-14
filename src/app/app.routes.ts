import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'admin',
    pathMatch: 'full'
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/pages/dashboard-admin/dashboard-admin')
        .then(m => m.DashboardAdmin)
  },
  {
    path: '**',
    redirectTo: 'admin'
  }
];
