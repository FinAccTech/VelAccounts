import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly auth    = inject(AuthService);
  private readonly router  = inject(Router);
  private readonly snack   = inject(MatSnackBar);
  private readonly fb      = inject(FormBuilder);

  readonly loading      = signal(false);
  readonly hidePassword = signal(true);

  readonly form = this.fb.nonNullable.group({
    Client_Code: ['', [Validators.required, Validators.maxLength(20)]],
    User_Name:   ['', [Validators.required, Validators.maxLength(50)]],
    Password:    ['', [Validators.required, Validators.minLength(6)]],
  });

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: res => {
        this.loading.set(false);
        if (res.success && res.data) {
          if (res.data.user.MustChangePwd) {
            this.snack.open('Please change your password.', 'OK', { duration: 6000 });
          }
          this.router.navigate(['/select-account']);
        }
      },
      error: err => {
        this.loading.set(false);
        const msg = err.error?.message ?? 'Login failed.';
        if (err.error?.attemptsRemaining) {
          this.snack.open(`${msg} ${err.error.attemptsRemaining} attempt(s) remaining.`, 'Close', { duration: 6000 });
        } else {
          this.snack.open(msg, 'Close', { duration: 5000 });
        }
      },
    });
  }
}
