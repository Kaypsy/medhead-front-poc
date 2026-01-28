import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard'
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
    path: 'specialties',
    loadComponent: () =>
      import('./specialties/specialties.component').then((m) => m.SpecialtiesComponent),
    canActivate: [() => import('./auth/auth.guard').then((m) => m.authGuard)]
  },
  {
    path: 'hospitals',
    loadComponent: () =>
      import('./hospitals/hospitals.component').then((m) => m.HospitalsComponent),
    canActivate: [() => import('./auth/auth.guard').then((m) => m.authGuard)]
  },
  {
    path: 'emergency',
    loadComponent: () =>
      import('./features/emergency/emergency-search.component').then(
        (m) => m.EmergencySearchComponent
      ),
    canActivate: [() => import('./auth/auth.guard').then((m) => m.authGuard)]
  },
  {
    path: 'emergency-search',
    loadComponent: () =>
      import('./emergency-search/emergency-search.component').then(
        (m) => m.EmergencySearchComponent
      ),
    canActivate: [() => import('./auth/auth.guard').then((m) => m.authGuard)]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
