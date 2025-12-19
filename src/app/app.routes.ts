import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [() => import('./auth/auth.guard').then((m) => m.authGuard)]
  },
  {
    path: 'members',
    loadComponent: () =>
      import('./members/members.component').then((m) => m.MembersComponent),
    canActivate: [() => import('./auth/auth.guard').then((m) => m.authGuard)]
  },
  {
    path: 'specialties-groups',
    loadComponent: () =>
      import('./specialties-groups/specialties-groups.component').then(
        (m) => m.SpecialtiesGroupsComponent
      ),
    canActivate: [() => import('./auth/auth.guard').then((m) => m.authGuard)]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
