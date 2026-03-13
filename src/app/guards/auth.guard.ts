import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // ✅ Use AuthService which reads 'managecoffee_token' key
  const token = auth.getToken();

  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  // ✅ Check role if route has required roles
  const requiredRoles = route.data?.['roles'];
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRole = auth.hasRole(requiredRoles);
    if (!hasRole) {
      router.navigate(['/dashboard']);
      return false;
    }
  }

  return true;
};