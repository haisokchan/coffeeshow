// import { HttpInterceptorFn } from '@angular/common/http';
// import { inject } from '@angular/core';
// import { AuthService } from '../services/auth.service';

// export const authInterceptor: HttpInterceptorFn = (req, next) => {
//   const auth = inject(AuthService);
//   const token = auth.getToken();

//   if (!token) return next(req);

//   return next(
//     req.clone({
//       setHeaders: { Authorization: `Bearer ${token}` },
//     })
//   );
// };
// src/app/interceptors/auth.interceptor.ts
// ✅ NEW FILE: Centralized token injection for all HTTP requests.
// This replaces the broken per-service getHeaders() pattern in payment.service.ts
// which read from localStorage key 'token' instead of the correct key 'managecoffee_token'.
//
// Register in app.config.ts:
//   provideHttpClient(withInterceptors([authInterceptor]))

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  if (token) {
    const cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    return next(cloned);
  }

  return next(req);
};