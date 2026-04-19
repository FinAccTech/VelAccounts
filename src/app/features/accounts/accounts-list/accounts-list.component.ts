import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AccountsService } from '../../../core/services/api.services';
import { Account } from '../../../core/models';
import { AccountFormComponent } from '../account-form/account-form.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-accounts-list',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatButtonModule, MatIconModule,
    MatCardModule, MatTooltipModule, MatProgressBarModule,
  ],
  template: `
    <div class="page-header">
      <h2 class="page-title">Books of Accounts</h2>
      <button mat-flat-button color="primary" (click)="openForm()">
        <mat-icon>add</mat-icon> New Account
      </button>
    </div>

    <mat-card>
      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
      <table mat-table [dataSource]="accounts()" class="full-table">
        <ng-container matColumnDef="Acc_Code">
          <th mat-header-cell *matHeaderCellDef>Code</th>
          <td mat-cell *matCellDef="let r">{{ r.Acc_Code }}</td>
        </ng-container>
        <ng-container matColumnDef="Acc_Name">
          <th mat-header-cell *matHeaderCellDef>Name</th>
          <td mat-cell *matCellDef="let r">{{ r.Acc_Name }}</td>
        </ng-container>
        <ng-container matColumnDef="Remarks">
          <th mat-header-cell *matHeaderCellDef>Remarks</th>
          <td mat-cell *matCellDef="let r">{{ r.Remarks }}</td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let r">
            <button mat-icon-button matTooltip="Edit" (click)="openForm(r)"><mat-icon>edit</mat-icon></button>
            <button mat-icon-button matTooltip="Delete" color="warn" (click)="confirmDelete(r)"><mat-icon>delete</mat-icon></button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols;"></tr>
      </table>
      @if (!loading() && accounts().length === 0) {
        <div class="empty-state"><mat-icon>menu_book</mat-icon><p>No accounts yet.</p></div>
      }
    </mat-card>
  `,
  styles: [`
  .page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
  .page-title  { margin:0; font-size:22px; }
  .full-table  { width:100%; }
  .empty-state { display:flex; flex-direction:column; align-items:center; padding:48px; color:#aaa; }
  .empty-state mat-icon { font-size:48px; width:48px; height:48px; }
`],
})
export class AccountsListComponent implements OnInit {
  private svc    = inject(AccountsService);
  private dialog = inject(MatDialog);
  private snack  = inject(MatSnackBar);

  loading  = signal(false);
  accounts = signal<Account[]>([]);
  cols     = ['Acc_Code', 'Acc_Name', 'Remarks', 'actions'];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: r  => { this.accounts.set(r.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openForm(row?: Account) {
    this.dialog.open(AccountFormComponent, { width: '480px', data: row })
      .afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  confirmDelete(row: Account) {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Account', message: `Delete "${row.Acc_Name}"?`, danger: true, confirmText: 'Delete' }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.svc.delete(row.AccSno, row.CurrentRowVer).subscribe({
        next: () => { this.snack.open('Deleted.', 'OK'); this.load(); },
      });
    });
  }
}
