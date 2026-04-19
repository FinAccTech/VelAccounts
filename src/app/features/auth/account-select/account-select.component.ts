import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActiveAccountService } from '../../../core/services/active-account.service';
import { AuthService } from '../../../core/services/auth.service';
import { AccountsService } from '../../../core/services/api.services';
import { Account, ApiResponse } from '../../../core/models';
import { environment } from '../../../../environments/environment';
import { AccountFormDialogComponent } from './account-form-dialog.component';

@Component({
  selector: 'app-account-select',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatListModule,
    MatProgressSpinnerModule, MatProgressBarModule, MatToolbarModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatDividerModule, MatMenuModule, MatTooltipModule,
  ],
  templateUrl: './account-select.component.html',
})
export class AccountSelectComponent implements OnInit {
  private readonly activeAccount = inject(ActiveAccountService);
  private readonly auth          = inject(AuthService);
  private readonly router        = inject(Router);
  private readonly http          = inject(HttpClient);
  private readonly dialog        = inject(MatDialog);
  private readonly snack         = inject(MatSnackBar);
  private readonly accountsSvc   = inject(AccountsService);

  readonly user     = this.auth.currentUser;
  readonly isAdmin  = this.auth.isAdmin;
  readonly loading  = signal(false);
  readonly saving   = signal(false);
  readonly accounts = signal<Account[]>([]);

  ngOnInit(): void { this.loadAccounts(); }

  loadAccounts(): void {
    this.loading.set(true);
    this.http
      .get<ApiResponse<Account[]>>(`${environment.apiUrl}/accounts`)
      .subscribe({
        next:  res => { this.accounts.set(res.data ?? []); this.loading.set(false); },
        error: ()  => this.loading.set(false),
      });
  }

  select(account: Account): void {
    this.activeAccount.setAccount(account);
    this.router.navigate(['/app/dashboard']);
  }

  openCreateForm(): void {
    this.dialog.open(AccountFormDialogComponent, { width: '480px', data: null })
      .afterClosed().subscribe(saved => { if (saved) this.loadAccounts(); });
  }

  openEditForm(account: Account, event: Event): void {
    event.stopPropagation();
    this.dialog.open(AccountFormDialogComponent, { width: '480px', data: account })
      .afterClosed().subscribe(saved => { if (saved) this.loadAccounts(); });
  }

  deleteAccount(account: Account, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Delete "${account.Acc_Name}"? This cannot be undone.`)) return;
    this.accountsSvc.delete(account.AccSno, account.CurrentRowVer).subscribe({
      next: () => { this.snack.open('Account deleted.', 'OK'); this.loadAccounts(); },
    });
  }

  logout(): void { this.auth.logout(); }
}
