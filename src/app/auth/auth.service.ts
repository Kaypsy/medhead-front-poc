import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../environments/environment';

export type AuthResponse = {
  token: string;
  type: string;
  username: string;
};

export type LoginPayload = {
  username: string;
  password: string;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenKey = 'auth_token';
  private readonly noticeKey = 'auth_notice';
  readonly dashboardUrl = '/emergency';

  login(payload: LoginPayload, remember = false): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/api/auth/login`, payload).pipe(
      tap((res) => {
        this.storeToken(res.token, remember);
      })
    );
  }

  logout(): void {
    this.clearSession();
    void this.router.navigate(['/login']);
  }

  get token(): string | null {
    return this.getToken();
  }

  get isAuthenticated(): boolean {
    return this.isTokenValid(this.token);
  }

  resolveRedirectUrl(returnUrl?: string | null): string {
    if (!returnUrl || !returnUrl.startsWith('/')) {
      return this.dashboardUrl;
    }
    if (returnUrl === '/login' || returnUrl.startsWith('/login?')) {
      return this.dashboardUrl;
    }
    return returnUrl;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey) ?? sessionStorage.getItem(this.tokenKey);
  }

  isTokenValid(token?: string | null): boolean {
    return this.getTokenStatus(token) === 'valid';
  }

  getTokenStatus(token?: string | null): 'missing' | 'valid' | 'expired' | 'invalid' {
    if (!token) {
      return 'missing';
    }
    const decoded = this.decodeToken(token);
    if (!decoded || typeof decoded.exp !== 'number') {
      return 'invalid';
    }
    return this.isTokenExpired(token) ? 'expired' : 'valid';
  }

  clearSession(message?: string): void {
    this.clearStoredToken();
    if (message) {
      this.setAuthNotice(message);
    }
  }

  consumeAuthNotice(): string | null {
    const notice = sessionStorage.getItem(this.noticeKey);
    if (notice) {
      sessionStorage.removeItem(this.noticeKey);
    }
    return notice;
  }

  decodeToken(token: string): { exp?: number } | null {
    try {
      return jwtDecode<{ exp?: number }>(token);
    } catch {
      return null;
    }
  }

  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || typeof decoded.exp !== 'number') {
      return true;
    }
    const expirationDate = decoded.exp * 1000;
    return Date.now() >= expirationDate;
  }

  private setAuthNotice(message: string): void {
    sessionStorage.setItem(this.noticeKey, message);
  }

  private storeToken(token: string, remember: boolean): void {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(this.tokenKey, token);
    this.clearStoredToken(storage === localStorage ? sessionStorage : localStorage);
  }

  private clearStoredToken(storage: Storage | 'both' = 'both'): void {
    if (storage === 'both') {
      localStorage.removeItem(this.tokenKey);
      sessionStorage.removeItem(this.tokenKey);
      return;
    }
    storage.removeItem(this.tokenKey);
  }
}
