
import { Component, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatTableModule } from "@angular/material/table";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatIconModule } from "@angular/material/icon";
import { VouchersService, LedgersService } from "../../../core/services/api.services";
import { Ledger, LedgerStatementLine, LedgerStatementSummary } from "../../../core/models";

@Component({
  selector: "app-ledger-statement",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
            MatSelectModule, MatDatepickerModule, MatInputModule, MatButtonModule,
            MatTableModule, MatProgressBarModule, MatIconModule],
  template: `
    <div class="page-header">
      <h2 class="page-title">Ledger Statement</h2>
    </div>

    <!-- Controls -->
    <mat-card class="filter-card">
      <form [formGroup]="form" class="filter-row">
        <mat-form-field appearance="outline" class="ledger-field">
          <mat-label>Ledger</mat-label>
          <mat-select formControlName="LedSno">
            @for (l of ledgers(); track l.LedSno) {
              <mat-option [value]="l.LedSno">{{ l.Led_Name }}</mat-option>
            }
          </mat-select>
          <mat-error>Required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>From</mat-label>
          <input matInput [matDatepicker]="dpFrom" formControlName="fromDate" />
          <mat-datepicker-toggle matSuffix [for]="dpFrom" />
          <mat-datepicker #dpFrom />
          <mat-error>Required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>To</mat-label>
          <input matInput [matDatepicker]="dpTo" formControlName="toDate" />
          <mat-datepicker-toggle matSuffix [for]="dpTo" />
          <mat-datepicker #dpTo />
          <mat-error>Required</mat-error>
        </mat-form-field>
        <button mat-flat-button color="primary" (click)="load()" [disabled]="loading()">
          <mat-icon>search</mat-icon> Show
        </button>
      </form>
    </mat-card>

    @if (summary()) {
      <!-- Summary Cards -->
      <div class="summary-row">
        <mat-card class="summary-card">
          <mat-card-content>
            <p class="sum-label">Opening Balance</p>
            <p class="sum-value" [class.debit]="summary()!.OpeningBalance < 0"
                                 [class.credit]="summary()!.OpeningBalance >= 0">
              {{ summary()!.OpeningBalance | number:"1.2-2" }}
            </p>
          </mat-card-content>
        </mat-card>
        <mat-card class="summary-card">
          <mat-card-content>
            <p class="sum-label">Total Debit</p>
            <p class="sum-value debit">{{ totalDebit() | number:"1.2-2" }}</p>
          </mat-card-content>
        </mat-card>
        <mat-card class="summary-card">
          <mat-card-content>
            <p class="sum-label">Total Credit</p>
            <p class="sum-value credit">{{ totalCredit() | number:"1.2-2" }}</p>
          </mat-card-content>
        </mat-card>
        <mat-card class="summary-card">
          <mat-card-content>
            <p class="sum-label">Closing Balance</p>
            <p class="sum-value" [class.debit]="summary()!.ClosingBalance < 0"
                                 [class.credit]="summary()!.ClosingBalance >= 0">
              {{ summary()!.ClosingBalance | number:"1.2-2" }}
            </p>
          </mat-card-content>
        </mat-card>
      </div>
    }

    <!-- Statement table -->
    <mat-card>
      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
      <table mat-table [dataSource]="lines()" class="full-table">
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
        <ng-container matColumnDef="Narration">
          <th mat-header-cell *matHeaderCellDef>Narration</th>
          <td mat-cell *matCellDef="let r">{{ r.Narration }}</td>
        </ng-container>
        <ng-container matColumnDef="Debit">
          <th mat-header-cell *matHeaderCellDef style="text-align:right">Debit</th>
          <td mat-cell *matCellDef="let r" style="text-align:right" class="debit">
            {{ r.Debit ? (r.Debit | number:"1.2-2") : "" }}
          </td>
        </ng-container>
        <ng-container matColumnDef="Credit">
          <th mat-header-cell *matHeaderCellDef style="text-align:right">Credit</th>
          <td mat-cell *matCellDef="let r" style="text-align:right" class="credit">
            {{ r.Credit ? (r.Credit | number:"1.2-2") : "" }}
          </td>
        </ng-container>
        <ng-container matColumnDef="RunningBalance">
          <th mat-header-cell *matHeaderCellDef style="text-align:right">Balance</th>
          <td mat-cell *matCellDef="let r" style="text-align:right;font-weight:500"
              [class.debit]="r.RunningBalance < 0" [class.credit]="r.RunningBalance >= 0">
            {{ r.RunningBalance | number:"1.2-2" }}
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols;"></tr>
      </table>
      @if (!loading() && lines().length === 0 && summary()) {
        <div class="empty-state"><mat-icon>bar_chart</mat-icon><p>No transactions in this period.</p></div>
      }
      @if (!summary() && !loading()) {
        <div class="empty-state"><mat-icon>search</mat-icon><p>Select a ledger and date range, then click Show.</p></div>
      }
    </mat-card>
  `,
  styles: [`
    .page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
    .page-title { margin:0; font-size:22px; }
    .filter-card { margin-bottom:16px; padding:8px 16px; }
    .filter-row { display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
    .ledger-field { min-width:240px; }
    .full-table { width:100%; }
    .empty-state { display:flex; flex-direction:column; align-items:center; padding:48px; color:#aaa; }
    .empty-state mat-icon { font-size:48px; width:48px; height:48px; }
    .summary-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:16px; }
    .summary-card mat-card-content { padding:12px 16px; }
    .sum-label { margin:0 0 4px; font-size:12px; color:#666; text-transform:uppercase; }
    .sum-value { margin:0; font-size:22px; font-weight:600; }
    .debit  { color:#c62828; }
    .credit { color:#2e7d32; }
  `],
})
export class LedgerStatementComponent implements OnInit {
  private svc    = inject(VouchersService);
  private ledSvc = inject(LedgersService);
  private fb     = inject(FormBuilder);

  loading = signal(false);
  ledgers = signal<Ledger[]>([]);
  lines   = signal<LedgerStatementLine[]>([]);
  summary = signal<LedgerStatementSummary | null>(null);

  totalDebit  = () => this.lines().reduce((a, l) => a + l.Debit,  0);
  totalCredit = () => this.lines().reduce((a, l) => a + l.Credit, 0);

  cols = ["Vou_Date","Vou_No","VoucherType","Narration","Debit","Credit","RunningBalance"];

  form = this.fb.nonNullable.group({
    LedSno:   [0, Validators.required],
    fromDate: [null as Date | null, Validators.required],
    toDate:   [null as Date | null, Validators.required],
  });

  ngOnInit() {
    this.ledSvc.list().subscribe(r => this.ledgers.set(r.data ?? []));
  }

  load() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v    = this.form.getRawValue();
    const fmt  = (d: Date) => d.toISOString().split("T")[0];
    this.loading.set(true);
    this.svc.getLedgerStatement(
      v.LedSno,
      fmt(v.fromDate!),
      fmt(v.toDate!)
    ).subscribe({
      next: res => {
        this.lines.set(res.data);
        this.summary.set(res.summary);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
