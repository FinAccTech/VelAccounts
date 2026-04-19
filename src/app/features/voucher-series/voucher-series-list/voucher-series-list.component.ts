
import { Component, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatTableModule } from "@angular/material/table";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatCardModule } from "@angular/material/card";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { VoucherSeriesService } from "../../../core/services/api.services";
import { VoucherSeries } from "../../../core/models";
import { VoucherSeriesFormComponent } from "../voucher-series-form/voucher-series-form.component";
import { ConfirmDialogComponent } from "../../../shared/components/confirm-dialog/confirm-dialog.component";

@Component({
  selector: "app-voucher-series-list",
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule,
            MatCardModule, MatTooltipModule, MatProgressBarModule],
  template: `
    <div class="page-header">
      <h2 class="page-title">Voucher Series</h2>
      <button mat-flat-button color="primary" (click)="openForm()">
        <mat-icon>add</mat-icon> New Series
      </button>
    </div>
    <mat-card>
      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
      <table mat-table [dataSource]="items()" class="full-table">
        <ng-container matColumnDef="Series_Name">
          <th mat-header-cell *matHeaderCellDef>Series</th>
          <td mat-cell *matCellDef="let r">{{ r.Series_Name }}</td>
        </ng-container>
        <ng-container matColumnDef="VTyp_Name">
          <th mat-header-cell *matHeaderCellDef>Voucher Type</th>
          <td mat-cell *matCellDef="let r">{{ r.VTyp_Name }}</td>
        </ng-container>
        <ng-container matColumnDef="Prefix">
          <th mat-header-cell *matHeaderCellDef>Prefix</th>
          <td mat-cell *matCellDef="let r">{{ r.Prefix }}</td>
        </ng-container>
        <ng-container matColumnDef="Numbering_Method">
          <th mat-header-cell *matHeaderCellDef>Numbering</th>
          <td mat-cell *matCellDef="let r">{{ r.Numbering_Method }}</td>
        </ng-container>
        <ng-container matColumnDef="Current_No">
          <th mat-header-cell *matHeaderCellDef>Current No</th>
          <td mat-cell *matCellDef="let r">{{ r.Current_No }}</td>
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
        <div class="empty-state"><mat-icon>format_list_numbered</mat-icon><p>No voucher series yet.</p></div>
      }
    </mat-card>
  `,
  styleUrls: ["../../../shared/list.styles.css"],
})
export class VoucherSeriesListComponent implements OnInit {
  private svc    = inject(VoucherSeriesService);
  private dialog = inject(MatDialog);
  private snack  = inject(MatSnackBar);

  loading = signal(false);
  items   = signal<VoucherSeries[]>([]);
  cols    = ["Series_Name", "VTyp_Name", "Prefix", "Numbering_Method", "Current_No", "actions"];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: r  => { this.items.set(r.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openForm(row?: VoucherSeries) {
    this.dialog.open(VoucherSeriesFormComponent, { width: "560px", data: row })
      .afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  confirmDelete(row: VoucherSeries) {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: "Delete Series", message: `Delete "${row.Series_Name}"?`, danger: true, confirmText: "Delete" }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.svc.delete(row.SeriesSno, row.CurrentRowVer).subscribe({
        next: () => { this.snack.open("Deleted.", "OK"); this.load(); },
      });
    });
  }
}
