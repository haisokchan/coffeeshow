import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

export type Role = 'admin' | 'manager' | 'staff';

export type AuthUser = {
  _id: string;
  id: string;
  username: string;
  role: Role;
  fullName?: string;
  email?: string;
};

type LoginResponse = {
  message: string;
  user: AuthUser;
  token: string;
};

type RegisterResponse = {
  message: string;
  user: AuthUser & { email?: string };
  token: string;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'managecoffee_token';
  private readonly USER_KEY = 'managecoffee_user';

  private _user = signal<AuthUser | null>(this.readUser());
  user = computed(() => this._user());
  isLoggedIn = computed(() => !!this.getToken());

  constructor(private http: HttpClient) {}

  // ✅ FIX: implement all stub methods properly
  isAdmin(): boolean {
    return this.hasRole(['admin']);
  }

  isManager(): boolean {
    return this.hasRole(['manager']);
  }

  canManageUsers(): boolean {
    return this.hasRole(['admin', 'manager']);
  }

  hasRole(requiredRoles: string[] = []): boolean {
    const u = this._user();
    if (!u) return false;
    const role = String(u.role ?? '').toLowerCase();
    const allowed = requiredRoles.map(r => String(r).toLowerCase());
    return allowed.includes(role);
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { username, password })
      .pipe(tap((res) => this.saveSession(res.token, res.user)));
  }

  register(data: {
    username: string;
    email: string;
    password: string;
    phone?: string;
    role?: Role;
    fullName?: string;
  }): Observable<RegisterResponse> {
    return this.http
      .post<RegisterResponse>(`${environment.apiUrl}/auth/register`, data)
      .pipe(tap((res) => this.saveSession(res.token, res.user)));
  }

  // ✅ FIX: return Observable so callers can subscribe (used in user-list.ts & dashboard.ts)
  logout(): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${environment.apiUrl}/auth/logout`, {})
      .pipe(tap(() => this.clearSession()));
  }

  clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._user.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private saveSession(token: string, user: AuthUser): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this._user.set(user);
  }

  private readUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }
}