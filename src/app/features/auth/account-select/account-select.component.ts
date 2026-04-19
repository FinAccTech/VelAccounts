import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActiveAccountService } from '../../../core/services/active-account.service';
import { AuthService } from '../../../core/services/auth.service';
import { Account, ApiResponse } from '../../../core/models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-account-select',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule,
    MatListModule, MatProgressSpinnerModule, MatToolbarModule,
  ],
  templateUrl: './account-select.component.html',
})
export class AccountSelectComponent implements OnInit {
  private readonly activeAccount = inject(ActiveAccountService);
  private readonly auth          = inject(AuthService);
  private readonly router        = inject(Router);
  private readonly http          = inject(HttpClient);

  readonly user     = this.auth.currentUser;
  readonly loading  = signal(false);
  readonly accounts = signal<Account[]>([]);

  ngOnInit(): void {
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.loading.set(true);
    this.http
      .get<ApiResponse<Account[]>>(`${environment.apiUrl}/accounts`)
      .subscribe({
        next: res => {
          this.loading.set(false);
          this.accounts.set(res.data ?? []);
        },
        error: () => this.loading.set(false),
      });
  }

  select(account: Account): void {
    this.activeAccount.setAccount(account);
    this.router.navigate(['/app/dashboard']);
  }

  logout(): void {
    this.auth.logout();
  }
}
