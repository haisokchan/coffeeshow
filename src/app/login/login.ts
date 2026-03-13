import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  error = '';
  loading = false;
  showVerifyModal = false;

  form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  ngOnInit(): void {
    // Check if coming from email verification
    this.route.queryParams.subscribe(params => {
      if (params['verified'] === 'true') {
        console.log('Verified query param detected');
        this.showVerifyModal = true;
        this.cdr.detectChanges();
        // Auto redirect after 2 seconds
        setTimeout(() => {
          this.closeVerifyModal();
        }, 2000);
      }
    });
  }

  submit(): void {
    this.error = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const { username, password } = this.form.getRawValue();

    this.auth.login(username, password).subscribe({
      next: (response) => {
        console.log('✅ Login successful:', response);
        this.loading = false;
        
        // Show the success modal
        this.showVerifyModal = true;
        console.log('✅ showVerifyModal set to:', this.showVerifyModal);
        
        // Force change detection
        this.cdr.detectChanges();
        
        // Auto redirect to dashboard after 2 seconds
        setTimeout(() => {
          console.log('⏰ Auto-redirecting to dashboard...');
          this.closeVerifyModal();
        }, 2000);
      },
      error: (err) => {
        console.error('❌ Login error:', err);
        this.loading = false;
        this.error = err?.error?.error || err?.error?.message || 'Login failed. Please try again.';
      },
    });
  }

  closeVerifyModal(): void {
    console.log('Closing modal and redirecting...');
    this.showVerifyModal = false;
    this.router.navigateByUrl('/dashboard');
  }
}