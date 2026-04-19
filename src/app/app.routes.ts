import { Routes } from '@angular/router';
import { authGuard, accountGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'select-account',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/account-select/account-select.component')
        .then(m => m.AccountSelectComponent),
  },
  {
    path: 'app',
    canActivate: [accountGuard],
    loadComponent: () =>
      import('./layout/shell/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'accounts',
        loadComponent: () =>
          import('./features/accounts/accounts-list/accounts-list.component')
            .then(m => m.AccountsListComponent),
      },
      {
        path: 'ledger-groups',
        loadComponent: () =>
          import('./features/ledger-groups/ledger-groups-list/ledger-groups-list.component')
            .then(m => m.LedgerGroupsListComponent),
      },
      {
        path: 'ledgers',
        loadComponent: () =>
          import('./features/ledgers/ledgers-list/ledgers-list.component')
            .then(m => m.LedgersListComponent),
      },
      {
        path: 'voucher-types',
        loadComponent: () =>
          import('./features/voucher-types/voucher-types-list/voucher-types-list.component')
            .then(m => m.VoucherTypesListComponent),
      },
      {
        path: 'voucher-series',
        loadComponent: () =>
          import('./features/voucher-series/voucher-series-list/voucher-series-list.component')
            .then(m => m.VoucherSeriesListComponent),
      },
      {
        path: 'vouchers',
        loadComponent: () =>
          import('./features/vouchers/vouchers-list/vouchers-list.component')
            .then(m => m.VouchersListComponent),
      },
      {
        path: 'ledger-statement',
        loadComponent: () =>
          import('./features/vouchers/ledger-statement/ledger-statement.component')
            .then(m => m.LedgerStatementComponent),
      },
    ],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
