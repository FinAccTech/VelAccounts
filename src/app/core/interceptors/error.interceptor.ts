import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snack = inject(MatSnackBar);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // 401 is handled by auth interceptor; skip here
      if (err.status === 401) return throwError(() => err);

      let msg = 'An unexpected error occurred.';
      if (err.error?.message) msg = err.error.message;
      else if (err.status === 0) msg = 'Cannot connect to server. Check your network.';
      else if (err.status === 503) msg = 'Deadlock detected. Please try again.';
      else if (err.status === 429) msg = 'Too many requests. Please slow down.';

      snack.open(msg, 'Close', { duration: 5000, panelClass: 'snack-error' });
      return throwError(() => err);
    })
  );
};
