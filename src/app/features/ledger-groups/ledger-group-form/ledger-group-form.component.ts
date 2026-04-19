
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LedgerGroupsService } from '../../../core/services/api.services';
import { LedgerGroup } from '../../../core/models';

@Component({
  selector: 'app-ledger-group-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ row ? 'Edit' : 'New' }} Ledger Group</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Code</mat-label>
          <input matInput formControlName="Grp_Code" />
          <mat-error>Required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <input matInput formControlName="Grp_Name" />
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
        {{ saving ? 'Saving…' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.dialog-form { display:flex; flex-direction:column; gap:4px; padding-top:8px; min-width:320px; }`],
})
export class LedgerGroupFormComponent implements OnInit {
  private svc   = inject(LedgerGroupsService);
  private fb    = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  private ref   = inject(MatDialogRef<LedgerGroupFormComponent>);
  readonly row  = inject<LedgerGroup | undefined>(MAT_DIALOG_DATA);

  saving = false;
  form   = this.fb.nonNullable.group({
    Grp_Code: ['', Validators.required],
    Grp_Name: ['', Validators.required],
    Remarks:  [''],
  });

  ngOnInit() { if (this.row) this.form.patchValue(this.row); }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const v   = this.form.getRawValue();
    const obs = this.row
      ? this.svc.update(this.row.GrpSno, { ...v, CurrentRowVer: this.row.CurrentRowVer })
      : this.svc.create(v);
    obs.subscribe({
      next: () => { this.snack.open('Saved.', 'OK'); this.ref.close(true); },
      error: () => { this.saving = false; },
    });
  }
}
