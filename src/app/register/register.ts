import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { finalize, timeout } from 'rxjs/operators';


@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrls: ['./register.css'],
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  error = '';
  loading = false;

  form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]],
    phone: [''],
    // role optional; backend defaults to staff
    role: ['staff'],
  });


submit(): void {
  this.error = '';
  if (this.form.invalid) {
    this.form.markAllAsTouched();
    return;
  }

  this.loading = true;
  const { username, email, password, phone, role } = this.form.getRawValue();

  this.auth
    .register({ username, email, password, phone, role: role as any })
    .pipe(
      timeout(10000), // 10s
      finalize(() => (this.loading = false))
    )
    .subscribe({
      next: () => this.router.navigateByUrl('/dashboard'),
      error: (err) => {
        this.error =
          err?.name === 'TimeoutError'
            ? 'Request timeout. Check backend/CORS.'
            : err?.error?.error || err?.error?.message || err?.message || 'Register failed';
      },
    });
}}

