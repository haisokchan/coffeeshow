// ============================================
// src/app/models/user.model.ts
// ============================================
export interface User {
  _id?: string;
  id?: string;
  username: string;
  email: string;
  fullName?: string;
  role: 'admin' | 'manager' | 'staff';
  phone?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName?: string;
  role?: string;
  phone?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}