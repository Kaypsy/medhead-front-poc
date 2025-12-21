import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
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
  private readonly tokenKey = 'auth_token';
  readonly dashboardUrl = '/dashboard';

  login(payload: LoginPayload, remember = false): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/api/auth/login`, payload).pipe(
      tap((res) => {
        this.storeToken(res.token, remember);
      })
    );
  }

  logout(): void {
    this.clearStoredToken();
  }

  get token(): string | null {
    return localStorage.getItem(this.tokenKey) ?? sessionStorage.getItem(this.tokenKey);
  }

  get isAuthenticated(): boolean {
    return Boolean(this.token);
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
