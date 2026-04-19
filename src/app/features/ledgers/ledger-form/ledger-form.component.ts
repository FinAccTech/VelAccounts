
import { Component, inject, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { MatSnackBar } from "@angular/material/snack-bar";
import { LedgersService, LedgerGroupsService } from "../../../core/services/api.services";
import { Ledger, LedgerGroup } from "../../../core/models";

@Component({
  selector: "app-ledger-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
            MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ row ? "Edit" : "New" }} Ledger</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Code</mat-label>
          <input matInput formControlName="Led_Code" />
          <mat-error>Required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <input matInput formControlName="Led_Name" />
          <mat-error>Required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Group</mat-label>
          <mat-select formControlName="GrpSno">
            @for (g of groups(); track g.GrpSno) {
              <mat-option [value]="g.GrpSno">{{ g.Grp_Name }}</mat-option>
            }
          </mat-select>
          <mat-error>Required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Remarks</mat-label>
          <input matInput formControlName="Remarks" />
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
  styles: [".dialog-form { display:flex; flex-direction:column; gap:4px; padding-top:8px; min-width:360px; }"],
})
export class LedgerFormComponent implements OnInit {
  private svc      = inject(LedgersService);
  private grpSvc   = inject(LedgerGroupsService);
  private fb       = inject(FormBuilder);
  private snack    = inject(MatSnackBar);
  private ref      = inject(MatDialogRef<LedgerFormComponent>);
  readonly row     = inject<Ledger | undefined>(MAT_DIALOG_DATA);

  saving = false;
  groups = signal<LedgerGroup[]>([]);

  form = this.fb.nonNullable.group({
    Led_Code: ["", Validators.required],
    Led_Name: ["", Validators.required],
    GrpSno:   [0,  Validators.required],
    Remarks:  [""],
  });

  ngOnInit() {
    this.grpSvc.list().subscribe(r => this.groups.set(r.data ?? []));
    if (this.row) this.form.patchValue(this.row);
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const v   = this.form.getRawValue();
    const obs = this.row
      ? this.svc.update(this.row.LedSno, { ...v, CurrentRowVer: this.row.CurrentRowVer })
      : this.svc.create(v);
    obs.subscribe({
      next: () => { this.snack.open("Saved.", "OK"); this.ref.close(true); },
      error: () => { this.saving = false; },
    });
  }
}
