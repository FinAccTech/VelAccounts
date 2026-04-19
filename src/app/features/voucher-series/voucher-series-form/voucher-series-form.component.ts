
import { Component, inject, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { MatSnackBar } from "@angular/material/snack-bar";
import { VoucherSeriesService, VoucherTypesService } from "../../../core/services/api.services";
import { VoucherSeries, VoucherType } from "../../../core/models";

@Component({
  selector: "app-voucher-series-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule,
            MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ row ? "Edit" : "New" }} Voucher Series</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Series Name</mat-label>
          <input matInput formControlName="Series_Name" />
          <mat-error>Required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Voucher Type</mat-label>
          <mat-select formControlName="VouTypeSno">
            @for (t of types(); track t.VouTypeSno) {
              <mat-option [value]="t.VouTypeSno">{{ t.VTyp_Name }}</mat-option>
            }
          </mat-select>
          <mat-error>Required</mat-error>
        </mat-form-field>
        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Prefix</mat-label>
            <input matInput formControlName="Prefix" maxlength="5" />
            <mat-error>Required</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Width (digits)</mat-label>
            <input matInput type="number" formControlName="Width" min="1" max="10" />
            <mat-error>Required (1-10)</mat-error>
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline">
          <mat-label>Numbering Method</mat-label>
          <mat-select formControlName="Numbering_Method">
            <mat-option value="AUTO">AUTO — System generates number automatically</mat-option>
            <mat-option value="SEMI">SEMI — System suggests; user can edit</mat-option>
            <mat-option value="MANUAL">MANUAL — User always types the number</mat-option>
          </mat-select>
          <mat-error>Required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Starting Number</mat-label>
          <input matInput type="number" formControlName="Current_No" />
          <mat-hint>Last used number (0 = start from 1)</mat-hint>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="saving">
        {{ saving ? "Saving…" : "Save" }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.dialog-form { display:flex; flex-direction:column; gap:4px; padding-top:8px; min-width:400px; }
            .row-2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; }`],
})
export class VoucherSeriesFormComponent implements OnInit {
  private svc      = inject(VoucherSeriesService);
  private typeSvc  = inject(VoucherTypesService);
  private fb       = inject(FormBuilder);
  private snack    = inject(MatSnackBar);
  private ref      = inject(MatDialogRef<VoucherSeriesFormComponent>);
  readonly row     = inject<VoucherSeries | undefined>(MAT_DIALOG_DATA);

  saving = false;
  types  = signal<VoucherType[]>([]);

  form = this.fb.nonNullable.group({
    Series_Name:      ["", Validators.required],
    VouTypeSno:       [0,  Validators.required],
    Prefix:           ["", Validators.required],
    Width:            [5,  [Validators.required, Validators.min(1), Validators.max(10)]],
    Numbering_Method: ["AUTO", Validators.required],
    Current_No:       [0],
  });

  ngOnInit() {
    this.typeSvc.list().subscribe(r => this.types.set(r.data ?? []));
    if (this.row) this.form.patchValue(this.row);
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const v   = this.form.getRawValue();
    const obs = this.row
      ? this.svc.update(this.row.SeriesSno, { ...v, CurrentRowVer: this.row.CurrentRowVer })
      : this.svc.create(v);
    obs.subscribe({
      next: () => { this.snack.open("Saved.", "OK"); this.ref.close(true); },
      error: () => { this.saving = false; },
    });
  }
}
