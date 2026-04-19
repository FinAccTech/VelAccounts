import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AccountsService } from '../../../core/services/api.services';
import { Account } from '../../../core/models';

@Component({
  selector: 'app-account-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatProgressSpinnerModule, MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon style="vertical-align:middle;margin-right:8px">menu_book</mat-icon>
      {{ row ? 'Edit' : 'New' }} Book of Accounts
    </h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="form">

        <mat-form-field appearance="outline">
          <mat-label>Account Code</mat-label>
          <input matInput formControlName="Acc_Code"
                 placeholder="e.g. FY2425" />
          <mat-hint>Short unique identifier</mat-hint>
          @if (form.controls['Acc_Code'].hasError('required')) {
            <mat-error>Code is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Account Name</mat-label>
          <input matInput formControlName="Acc_Name"
                 placeholder="e.g. Financial Year 2024-25" />
          @if (form.controls['Acc_Name'].hasError('required')) {
            <mat-error>Name is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Remarks</mat-label>
          <input matInput formControlName="Remarks"
                 placeholder="Optional notes" />
        </mat-form-field>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="saving">
        @if (saving) {
          <mat-spinner diameter="18" style="display:inline-block" />
        } @else {
          {{ row ? 'Update' : 'Create' }}
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.form { display:flex; flex-direction:column; gap:8px; padding-top:8px; min-width:360px; }`],
})
export class AccountFormDialogComponent implements OnInit {
  private svc   = inject(AccountsService);
  private fb    = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  private ref   = inject(MatDialogRef<AccountFormDialogComponent>);
  readonly row  = inject<Account | null>(MAT_DIALOG_DATA);

  saving = false;

  form = this.fb.group({
    Acc_Code: ['', [Validators.required, Validators.maxLength(20)]],
    Acc_Name: ['', [Validators.required, Validators.maxLength(100)]],
    Remarks:  ['', Validators.maxLength(100)],
  });

  ngOnInit() {
    if (this.row) this.form.patchValue(this.row);
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const v = this.form.getRawValue();

    const obs = this.row
      ? this.svc.update(this.row.AccSno, {
          Acc_Code: v.Acc_Code!,
          Acc_Name: v.Acc_Name!,
          Remarks:  v.Remarks ?? '',
          CurrentRowVer: this.row.CurrentRowVer,
        })
      : this.svc.create({
          Acc_Code: v.Acc_Code!,
          Acc_Name: v.Acc_Name!,
          Remarks:  v.Remarks ?? '',
        });

    obs.subscribe({
      next: () => {
        this.snack.open(
          this.row ? 'Account updated.' : 'Account created.',
          'OK'
        );
        this.ref.close(true);
      },
      error: () => { this.saving = false; },
    });
  }
}
