import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActiveAccountService } from '../../core/services/active-account.service';
import { AuthService } from '../../core/services/auth.service';

interface QuickLink { label: string; icon: string; route: string; color: string; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <h2 class="page-title">Dashboard</h2>
    <p class="subtitle">
      Welcome, <strong>{{ user()?.User_Name }}</strong> —
      working in <strong>{{ account.currentAccount()?.Acc_Name }}</strong>
    </p>

    <div class="card-grid">
      @for (link of quickLinks; track link.route) {
        <mat-card class="quick-card" [routerLink]="link.route">
          <mat-card-content>
            <div class="card-inner" [style.background]="link.color">
              <mat-icon class="big-icon">{{ link.icon }}</mat-icon>
            </div>
            <p class="card-label">{{ link.label }}</p>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .page-title { margin: 0 0 4px; font-size: 24px; }
    .subtitle { color: #666; margin: 0 0 32px; }
    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 16px;
    }
    .quick-card { cursor: pointer; transition: box-shadow .2s; }
    .quick-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.15); }
    .card-inner {
      border-radius: 12px; padding: 24px;
      display: flex; justify-content: center;
    }
    .big-icon { font-size: 40px; width: 40px; height: 40px; color: white; }
    .card-label { text-align: center; margin: 12px 0 0; font-weight: 500; }
  `],
})
export class DashboardComponent {
  readonly account = inject(ActiveAccountService);
  readonly user    = inject(AuthService).currentUser;

  readonly quickLinks: QuickLink[] = [
    { label: 'Ledger Groups',    icon: 'folder',                  route: '/app/ledger-groups',  color: '#1976d2' },
    { label: 'Ledgers',          icon: 'account_tree',            route: '/app/ledgers',         color: '#388e3c' },
    { label: 'Voucher Types',    icon: 'category',                route: '/app/voucher-types',   color: '#f57c00' },
    { label: 'Voucher Series',   icon: 'format_list_numbered',    route: '/app/voucher-series',  color: '#7b1fa2' },
    { label: 'Vouchers',         icon: 'receipt_long',            route: '/app/vouchers',        color: '#c62828' },
    { label: 'Ledger Statement', icon: 'bar_chart',               route: '/app/ledger-statement',color: '#00838f' },
  ];
}
