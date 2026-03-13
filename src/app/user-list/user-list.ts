import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-list.html',
})
export class UserListComponent implements OnInit {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private router = inject(Router);

  users: User[] = [];
  loading = false;
  error = '';
  currentUser = this.authService.user;

  get isAdmin(): boolean {
    return this.authService.hasRole(['admin']);
  }

  get isManager(): boolean {
    return this.authService.hasRole(['manager']);
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.error = '';

    this.userService.getUsers().subscribe({
      next: (response) => {
        this.users = response.users;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.error || 'Failed to load users';
        this.loading = false;
        console.error('Error loading users:', err);
      }
    });
  }

  deleteUser(userId: string, username: string): void {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
      return;
    }

    this.userService.deleteUser(userId).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (err) => {
        alert('Failed to delete user: ' + (err?.error?.error || 'Unknown error'));
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: () => {
        this.authService.clearSession();
        this.router.navigate(['/login']);
      }
    });
  }
}