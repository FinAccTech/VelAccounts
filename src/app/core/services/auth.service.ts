import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenService } from './token.service';
import { ActiveAccountService } from './active-account.service';
import {
  LoginRequest, LoginResponse, AppUser,
  TokenResponse, ApiResponse
} from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http    = inject(HttpClient);
  private readonly router  = inject(Router);
  private readonly tokens  = inject(TokenService);
  private readonly account = inject(ActiveAccountService);

  private readonly _user = signal<AppUser | null>(this.restoreUser());

  readonly currentUser  = this._user.asReadonly();
  readonly isLoggedIn   = computed(() => !!this._user());
  readonly isAdmin      = computed(() => ['ADMIN','SUPERADMIN'].includes(this._user()?.Role ?? ''));

  // ── Login ──────────────────────────────────────────────────
  login(req: LoginRequest): Observable<ApiResponse<LoginResponse>> {
    return this.http
      .post<ApiResponse<LoginResponse>>(`${environment.apiUrl}/auth/login`, req)
      .pipe(tap(res => {
        if (res.success && res.data) {
          this.tokens.setTokens(res.data.accessToken, res.data.refreshToken);
          this._user.set(res.data.user);
          localStorage.setItem('vel_user', JSON.stringify(res.data.user));
        }
      }));
  }

  // ── Logout ─────────────────────────────────────────────────
  logout(): void {
    const rt = this.tokens.getRefreshToken();
    if (rt) {
      this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken: rt }).subscribe();
    }
    this.clearSession();
    this.router.navigate(['/login']);
  }

  logoutAll(): Observable<unknown> {
    return this.http
      .post(`${environment.apiUrl}/auth/logout-all`, {})
      .pipe(tap(() => {
        this.clearSession();
        this.router.navigate(['/login']);
      }));
  }

  // ── Token Refresh ──────────────────────────────────────────
  refreshToken(): Observable<ApiResponse<TokenResponse>> {
    const refreshToken = this.tokens.getRefreshToken();
    return this.http
      .post<ApiResponse<TokenResponse>>(`${environment.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(tap(res => {
        if (res.success && res.data) {
          this.tokens.setTokens(res.data.accessToken, res.data.refreshToken);
        }
      }));
  }

  // ── Change Password ────────────────────────────────────────
  changePassword(body: {
    CurrentPassword: string;
    NewPassword: string;
    CurrentRowVer: string;
  }): Observable<ApiResponse> {
    return this.http
      .put<ApiResponse>(`${environment.apiUrl}/auth/change-password`, body)
      .pipe(tap(res => {
        if (res.success) this.clearSession();
      }));
  }

  // ── Helpers ────────────────────────────────────────────────
  private clearSession(): void {
    this.tokens.clearTokens();
    this.account.clearAccount();
    this._user.set(null);
    localStorage.removeItem('vel_user');
  }

  private restoreUser(): AppUser | null {
    try {
      const raw = localStorage.getItem('vel_user');
      return raw ? (JSON.parse(raw) as AppUser) : null;
    } catch {
      return null;
    }
  }
}
