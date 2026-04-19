
import { Component, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatTableModule } from "@angular/material/table";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatInputModule } from "@angular/material/input";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { ReactiveFormsModule, FormBuilder } from "@angular/forms";
import { VouchersService, VoucherSeriesService } from "../../../core/services/api.services";
import { Voucher, VoucherSeries } from "../../../core/models";
import { VoucherFormComponent } from "../voucher-form/voucher-form.component";
import { ConfirmDialogComponent } from "../../../shared/components/confirm-dialog/confirm-dialog.component";

@Component({
  selector: "app-vouchers-list",
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule,
            MatCardModule, MatFormFieldModule, MatSelectModule, MatDatepickerModule,
            MatInputModule, MatTooltipModule, MatProgressBarModule, ReactiveFormsModule],
  template: `
    <div class="page-header">
      <h2 class="page-title">Vouchers</h2>
      <button mat-flat-button color="primary" (click)="openForm()">
        <mat-icon>add</mat-icon> New Voucher
      </button>
    </div>

    <!-- Filters -->
    <mat-card class="filter-card">
      <form [formGroup]="filterForm" class="filter-row">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Series</mat-label>
          <mat-select formControlName="seriesSno">
            <mat-option [value]="null">All</mat-option>
            @for (s of series(); track s.SeriesSno) {
              <mat-option [value]="s.SeriesSno">{{ s.Series_Name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>From</mat-label>
          <input matInput [matDatepicker]="dpFrom" formControlName="fromDate" />
          <mat-datepicker-toggle matSuffix [for]="dpFrom" />
          <mat-datepicker #dpFrom />
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>To</mat-label>
          <input matInput [matDatepicker]="dpTo" formControlName="toDate" />
          <mat-datepicker-toggle matSuffix [for]="dpTo" />
          <mat-datepicker #dpTo />
        </mat-form-field>
        <button mat-flat-button color="accent" (click)="load()">Filter</button>
        <button mat-button (click)="resetFilters()">Reset</button>
      </form>
    </mat-card>

    <mat-card>
      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
      <table mat-table [dataSource]="items()" class="full-table">
        <ng-container matColumnDef="Vou_Date">
          <th mat-header-cell *matHeaderCellDef>Date</th>
          <td mat-cell *matCellDef="let r">{{ r.Vou_Date | date:"dd/MM/yyyy" }}</td>
        </ng-container>
        <ng-container matColumnDef="Vou_No">
          <th mat-header-cell *matHeaderCellDef>Voucher No</th>
          <td mat-cell *matCellDef="let r"><strong>{{ r.Vou_No }}</strong></td>
        </ng-container>
        <ng-container matColumnDef="VoucherType">
          <th mat-header-cell *matHeaderCellDef>Type</th>
          <td mat-cell *matCellDef="let r">{{ r.VoucherType }}</td>
        </ng-container>
        <ng-container matColumnDef="Led_Name">
          <th mat-header-cell *matHeaderCellDef>Ledger</th>
          <td mat-cell *matCellDef="let r">{{ r.Led_Name }}</td>
        </ng-container>
        <ng-container matColumnDef="Amount">
          <th mat-header-cell *matHeaderCellDef style="text-align:right">Amount</th>
          <td mat-cell *matCellDef="let r" style="text-align:right">
            <span [class]="r.Cash_Type === 'IN' ? 'credit' : 'debit'">
              {{ r.Amount | number:"1.2-2" }}
            </span>
          </td>
        </ng-container>
        <ng-container matColumnDef="Narration">
          <th mat-header-cell *matHeaderCellDef>Narration</th>
          <td mat-cell *matCellDef="let r">{{ r.Narration }}</td>
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
        <div class="empty-state"><mat-icon>receipt_long</mat-icon><p>No vouchers found.</p></div>
      }
    </mat-card>
  `,
  styles: [`
    .page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
    .page-title  { margin:0; font-size:22px; }
    .full-table  { width:100%; }
    .empty-state { display:flex; flex-direction:column; align-items:center; padding:48px; color:#aaa; }
    .empty-state mat-icon { font-size:48px; width:48px; height:48px; }
    .filter-card { margin-bottom:16px; padding:8px 16px; }
    .filter-row { display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
    .filter-field { min-width:160px; }
    .debit  { color:#c62828; font-weight:500; }
    .credit { color:#2e7d32; font-weight:500; }
  `],
})
export class VouchersListComponent implements OnInit {
  private svc       = inject(VouchersService);
  private seriesSvc = inject(VoucherSeriesService);
  private dialog    = inject(MatDialog);
  private snack     = inject(MatSnackBar);
  private fb        = inject(FormBuilder);

  loading = signal(false);
  items   = signal<Voucher[]>([]);
  series  = signal<VoucherSeries[]>([]);
  cols    = ["Vou_Date","Vou_No","VoucherType","Led_Name","Amount","Narration","actions"];

  filterForm = this.fb.group({
    seriesSno: [null as number|null],
    fromDate:  [null as Date|null],
    toDate:    [null as Date|null],
  });

  ngOnInit() {
    this.seriesSvc.list().subscribe(r => this.series.set(r.data ?? []));
    this.load();
  }

  load() {
    this.loading.set(true);
    const f = this.filterForm.value;
    const fmt = (d: Date|null) => d ? d.toISOString().split("T")[0] : undefined;
    this.svc.list({
      seriesSno: f.seriesSno ?? undefined,
      fromDate:  fmt(f.fromDate ?? null),
      toDate:    fmt(f.toDate ?? null),
    }).subscribe({
      next: r  => { this.items.set(r.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  resetFilters() { this.filterForm.reset(); this.load(); }

  openForm(row?: Voucher) {
    this.dialog.open(VoucherFormComponent, { width: "560px", data: row })
      .afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  confirmDelete(row: Voucher) {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: "Delete Voucher", message: `Delete voucher ${row.Vou_No}?`, danger: true, confirmText: "Delete" }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.svc.delete(row.VouSno, row.CurrentRowVer).subscribe({
        next: () => { this.snack.open("Deleted.", "OK"); this.load(); },
      });
    });
  }
}
