import { Injectable } from '@angular/core';

const ACCESS_KEY  = 'vel_access_token';
const REFRESH_KEY = 'vel_refresh_token';

@Injectable({ providedIn: 'root' })
export class TokenService {

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_KEY,  accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  }

  clearTokens(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }

  isAccessTokenPresent(): boolean {
    return !!this.getAccessToken();
  }

  /** Decode the JWT payload without verifying signature (client-side only). */
  decodePayload(): Record<string, unknown> | null {
    const token = this.getAccessToken();
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  }

  isExpired(): boolean {
    const payload = this.decodePayload();
    if (!payload?.['exp']) return true;
    return Date.now() >= (payload['exp'] as number) * 1000;
  }
}
