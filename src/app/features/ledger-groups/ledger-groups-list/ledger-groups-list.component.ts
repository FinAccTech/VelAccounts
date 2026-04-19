
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
import { LedgerGroupsService } from '../../../core/services/api.services';
import { LedgerGroup } from '../../../core/models';
import { LedgerGroupFormComponent } from '../ledger-group-form/ledger-group-form.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-ledger-groups-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule,
            MatCardModule, MatTooltipModule, MatProgressBarModule],
  template: `
    <div class="page-header">
      <h2 class="page-title">Ledger Groups</h2>
      <button mat-flat-button color="primary" (click)="openForm()">
        <mat-icon>add</mat-icon> New Group
      </button>
    </div>
    <mat-card>
      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
      <table mat-table [dataSource]="items()" class="full-table">
        <ng-container matColumnDef="Grp_Code">
          <th mat-header-cell *matHeaderCellDef>Code</th>
          <td mat-cell *matCellDef="let r">{{ r.Grp_Code }}</td>
        </ng-container>
        <ng-container matColumnDef="Grp_Name">
          <th mat-header-cell *matHeaderCellDef>Name</th>
          <td mat-cell *matCellDef="let r">{{ r.Grp_Name }}</td>
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
      @if (!loading() && items().length === 0) {
        <div class="empty-state"><mat-icon>folder</mat-icon><p>No ledger groups yet.</p></div>
      }
    </mat-card>
  `,
  styleUrls: ['../../../shared/list.styles.css'],
})
export class LedgerGroupsListComponent implements OnInit {
  private svc    = inject(LedgerGroupsService);
  private dialog = inject(MatDialog);
  private snack  = inject(MatSnackBar);

  loading = signal(false);
  items   = signal<LedgerGroup[]>([]);
  cols    = ['Grp_Code', 'Grp_Name', 'Remarks', 'actions'];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: r  => { this.items.set(r.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openForm(row?: LedgerGroup) {
    this.dialog.open(LedgerGroupFormComponent, { width: '480px', data: row })
      .afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  confirmDelete(row: LedgerGroup) {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Group', message: `Delete "${row.Grp_Name}"?`, danger: true, confirmText: 'Delete' }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.svc.delete(row.GrpSno, row.CurrentRowVer).subscribe({
        next: () => { this.snack.open('Deleted.', 'OK'); this.load(); },
      });
    });
  }
}
