import {
  HttpInterceptorFn, HttpRequest, HttpHandlerFn,
  HttpErrorResponse, HttpEvent
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  Observable, throwError, BehaviorSubject, filter, take, switchMap, catchError
} from 'rxjs';
import { TokenService } from '../services/token.service';
import { ActiveAccountService } from '../services/active-account.service';
import { AuthService } from '../services/auth.service';

// Shared refresh state — prevents multiple concurrent refresh calls
let isRefreshing = false;
const refreshDone$ = new BehaviorSubject<string | null>(null);

function addHeaders(req: HttpRequest<unknown>, token: string | null, accSno: number | null) {
  let headers = req.headers;
  if (token)  headers = headers.set('Authorization', `Bearer ${token}`);
  if (accSno) headers = headers.set('X-Acc-Sno', String(accSno));
  return req.clone({ headers });
}

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const tokens  = inject(TokenService);
  const account = inject(ActiveAccountService);
  const auth    = inject(AuthService);
  const router  = inject(Router);

  // Skip auth header for auth endpoints
  if (req.url.includes('/auth/login') || req.url.includes('/auth/refresh')) {
    return next(req);
  }

  const enriched = addHeaders(req, tokens.getAccessToken(), account.accSno());

  return next(enriched).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && err.error?.code === 'TOKEN_EXPIRED') {
        return handle401(req, next, tokens, account, auth, router);
      }
      if (err.status === 401) {
        auth.logout();
      }
      return throwError(() => err);
    })
  );
};

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  tokens: TokenService,
  account: ActiveAccountService,
  auth: AuthService,
  router: Router
): Observable<HttpEvent<unknown>> {
  if (isRefreshing) {
    // Queue this request until refresh completes
    return refreshDone$.pipe(
      filter(t => t !== null),
      take(1),
      switchMap(newToken =>
        next(addHeaders(req, newToken, account.accSno()))
      )
    );
  }

  isRefreshing = true;
  refreshDone$.next(null);

  return auth.refreshToken().pipe(
    switchMap(res => {
      isRefreshing = false;
      const newToken = res.data!.accessToken;
      refreshDone$.next(newToken);
      return next(addHeaders(req, newToken, account.accSno()));
    }),
    catchError(err => {
      isRefreshing = false;
      auth.logout();
      return throwError(() => err);
    })
  );
}
