
import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { MatSnackBar } from "@angular/material/snack-bar";
import { VoucherTypesService } from "../../../core/services/api.services";
import { VoucherType } from "../../../core/models";

@Component({
  selector: "app-voucher-type-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule,
            MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ row ? "Edit" : "New" }} Voucher Type</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Code</mat-label>
          <input matInput formControlName="VTyp_Code" />
          <mat-error>Required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <input matInput formControlName="VTyp_Name" />
          <mat-error>Required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Cash Type</mat-label>
          <mat-select formControlName="Cash_Type">
            <mat-option value="IN">IN — Credit (money received)</mat-option>
            <mat-option value="OUT">OUT — Debit (money paid)</mat-option>
          </mat-select>
          <mat-error>Required</mat-error>
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
  styles: [".dialog-form { display:flex; flex-direction:column; gap:4px; padding-top:8px; min-width:340px; }"],
})
export class VoucherTypeFormComponent implements OnInit {
  private svc   = inject(VoucherTypesService);
  private fb    = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  private ref   = inject(MatDialogRef<VoucherTypeFormComponent>);
  readonly row  = inject<VoucherType | undefined>(MAT_DIALOG_DATA);

  saving = false;
  form   = this.fb.nonNullable.group({
    VTyp_Code:  ["", Validators.required],
    VTyp_Name:  ["", Validators.required],
    Cash_Type:  ["OUT", Validators.required],
  });

  ngOnInit() { if (this.row) this.form.patchValue(this.row); }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const v   = this.form.getRawValue();
    const obs = this.row
      ? this.svc.update(this.row.VouTypeSno, { ...v, CurrentRowVer: this.row.CurrentRowVer })
      : this.svc.create(v);
    obs.subscribe({
      next: () => { this.snack.open("Saved.", "OK"); this.ref.close(true); },
      error: () => { this.saving = false; },
    });
  }
}
