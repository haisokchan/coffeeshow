// ============================================
// src/app/services/user.service.ts
// ============================================
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../models/user.model';

interface UsersResponse {
  message: string;
  count: number;
  users: User[];
}

interface UserResponse {
  message: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private http: HttpClient) {}

  getUsers(): Observable<UsersResponse> {
    return this.http.get<UsersResponse>(`${environment.apiUrl}/users`);
  }

  getUser(id: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${environment.apiUrl}/users/${id}`);
  }

  createUser(user: Partial<User>): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${environment.apiUrl}/users`, user);
  }

  updateUser(id: string, updates: Partial<User>): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${environment.apiUrl}/users/${id}`, updates);
  }

  deleteUser(id: string): Observable<UserResponse> {
    return this.http.delete<UserResponse>(`${environment.apiUrl}/users/${id}`);
  }
}