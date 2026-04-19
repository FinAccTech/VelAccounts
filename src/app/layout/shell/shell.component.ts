import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { ActiveAccountService } from '../../core/services/active-account.service';

interface NavItem { label: string; icon: string; route: string; adminOnly?: boolean; }

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatSidenavModule, MatToolbarModule, MatListModule,
    MatIconModule, MatButtonModule, MatMenuModule,
    MatDividerModule, MatTooltipModule,
  ],
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  readonly activeAccount = inject(ActiveAccountService);
  readonly user          = this.auth.currentUser;
  readonly isAdmin       = this.auth.isAdmin;
  readonly sidenavOpen   = signal(true);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard',      icon: 'dashboard',    route: '/app/dashboard' },
    { label: 'Ledger Groups',  icon: 'folder',       route: '/app/ledger-groups' },
    { label: 'Ledgers',        icon: 'account_tree', route: '/app/ledgers' },
    { label: 'Voucher Types',  icon: 'category',     route: '/app/voucher-types', adminOnly: true },
    { label: 'Voucher Series', icon: 'format_list_numbered', route: '/app/voucher-series', adminOnly: true },
    { label: 'Vouchers',       icon: 'receipt_long', route: '/app/vouchers' },
    { label: 'Ledger Statement', icon: 'bar_chart',  route: '/app/ledger-statement' },
  ];

  readonly adminItems: NavItem[] = [
    { label: 'Books of Accounts', icon: 'menu_book', route: '/app/accounts' },
  ];

  switchAccount(): void {
    this.activeAccount.clearAccount();
    this.router.navigate(['/select-account']);
  }

  logout(): void {
    this.auth.logout();
  }
}
