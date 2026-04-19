
import { Component, inject, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatButtonModule } from "@angular/material/button";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { VouchersService, VoucherSeriesService, LedgersService } from "../../../core/services/api.services";
import { Voucher, VoucherSeries, Ledger } from "../../../core/models";

@Component({
  selector: "app-voucher-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
            MatInputModule, MatSelectModule, MatDatepickerModule, MatButtonModule,
            MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>{{ row ? "Edit" : "New" }} Voucher</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <!-- Series (only on new) -->
        @if (!row) {
          <mat-form-field appearance="outline">
            <mat-label>Series</mat-label>
            <mat-select formControlName="SeriesSno" (selectionChange)="onSeriesChange($event.value)">
              @for (s of series(); track s.SeriesSno) {
                <mat-option [value]="s.SeriesSno">{{ s.Series_Name }} ({{ s.Numbering_Method }})</mat-option>
              }
            </mat-select>
            <mat-error>Required</mat-error>
          </mat-form-field>
        }

        <!-- Vou_No — shown for SEMI and MANUAL; readonly hint for AUTO -->
        @if (showVouNo()) {
          <mat-form-field appearance="outline">
            <mat-label>Voucher No</mat-label>
            <input matInput formControlName="Vou_No"
                   [readonly]="selectedSeries()?.Numbering_Method === 'SEMI'" />
            <mat-hint>{{ selectedSeries()?.Numbering_Method === "SEMI" ? "Suggested — you can edit" : "Enter manually" }}</mat-hint>
            <mat-error>Required for this series</mat-error>
          </mat-form-field>
        } @else if (!row) {
          <div class="auto-hint">
            <span>Voucher No: <strong>{{ nextNoPreview() || "Auto-generated on save" }}</strong></span>
          </div>
        }

        <mat-form-field appearance="outline">
          <mat-label>Date</mat-label>
          <input matInput [matDatepicker]="dp" formControlName="Vou_Date" />
          <mat-datepicker-toggle matSuffix [for]="dp" />
          <mat-datepicker #dp />
          <mat-error>Required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Ledger</mat-label>
          <mat-select formControlName="LedSno">
            @for (l of ledgers(); track l.LedSno) {
              <mat-option [value]="l.LedSno">{{ l.Led_Name }}</mat-option>
            }
          </mat-select>
          <mat-error>Required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Amount</mat-label>
          <input matInput type="number" formControlName="Amount" min="0.01" step="0.01" />
          <mat-error>Required and must not be zero</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Narration</mat-label>
          <textarea matInput formControlName="Narration" rows="2"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="saving">
        @if (saving) { <mat-spinner diameter="18" /> } @else { Save }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.dialog-form { display:flex; flex-direction:column; gap:4px; padding-top:8px; min-width:420px; }
            .auto-hint { background:#f3f4f6; border-radius:8px; padding:10px 14px; margin-bottom:4px; font-size:14px; }`],
})
export class VoucherFormComponent implements OnInit {
  private svc       = inject(VouchersService);
  private seriesSvc = inject(VoucherSeriesService);
  private ledSvc    = inject(LedgersService);
  private fb        = inject(FormBuilder);
  private snack     = inject(MatSnackBar);
  private ref       = inject(MatDialogRef<VoucherFormComponent>);
  readonly row      = inject<Voucher | undefined>(MAT_DIALOG_DATA);

  saving         = false;
  series         = signal<VoucherSeries[]>([]);
  ledgers        = signal<Ledger[]>([]);
  selectedSeries = signal<VoucherSeries | null>(null);
  nextNoPreview  = signal<string>("");

  showVouNo = () => {
    const m = this.selectedSeries()?.Numbering_Method;
    return m === "SEMI" || m === "MANUAL";
  };

  form = this.fb.nonNullable.group({
    SeriesSno: [0],
    Vou_No:    [""],
    Vou_Date:  [new Date(), Validators.required],
    LedSno:    [0, Validators.required],
    Amount:    [0, [Validators.required, Validators.min(0.01)]],
    Narration: [""],
  });

  ngOnInit() {
    this.seriesSvc.list().subscribe(r => this.series.set(r.data ?? []));
    this.ledSvc.list().subscribe(r => this.ledgers.set(r.data ?? []));
    if (this.row) {
      this.form.patchValue({
        ...this.row,
        Vou_Date: new Date(this.row.Vou_Date),
      });
    }
  }

  onSeriesChange(seriesSno: number) {
    const s = this.series().find(x => x.SeriesSno === seriesSno) ?? null;
    this.selectedSeries.set(s);
    if (!s) return;
    if (s.Numbering_Method === "SEMI") {
      this.seriesSvc.getNextNumber(seriesSno).subscribe(r => {
        const preview = r.data?.PreviewVouNo ?? "";
        this.nextNoPreview.set(preview);
        this.form.patchValue({ Vou_No: preview });
      });
    } else if (s.Numbering_Method === "AUTO") {
      this.seriesSvc.getNextNumber(seriesSno).subscribe(r => {
        this.nextNoPreview.set(r.data?.PreviewVouNo ?? "");
      });
    }
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    if (!v.Amount || v.Amount === 0) {
      this.snack.open("Amount cannot be zero.", "OK"); return;
    }
    this.saving = true;
    const dateStr = (v.Vou_Date as unknown as Date).toISOString().split("T")[0];

    if (this.row) {
      this.svc.update(this.row.VouSno, {
        Vou_Date: dateStr, LedSno: v.LedSno,
        Amount: v.Amount, Narration: v.Narration,
        CurrentRowVer: this.row.CurrentRowVer,
      }).subscribe({
        next: () => { this.snack.open("Saved.", "OK"); this.ref.close(true); },
        error: () => { this.saving = false; },
      });
    } else {
      this.svc.create({
        SeriesSno: v.SeriesSno, Vou_Date: dateStr,
        LedSno: v.LedSno, Amount: v.Amount,
        Narration: v.Narration,
        Vou_No: this.showVouNo() ? v.Vou_No : undefined,
      }).subscribe({
        next: res => {
          this.snack.open(`Saved. Voucher No: ${res.data?.Vou_No}`, "OK", { duration: 5000 });
          this.ref.close(true);
        },
        error: () => { this.saving = false; },
      });
    }
  }
}
