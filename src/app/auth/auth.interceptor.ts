import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();

  const shouldAttachToken = token && auth.isTokenValid(token);
  const request = shouldAttachToken
    ? req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    })
    : req;

  return next(request).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        if (!req.url.includes('/api/auth/login')) {
          auth.clearSession('Votre session a expiré. Veuillez vous reconnecter.');
          if (!router.url.startsWith('/login')) {
            void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
          }
        }
      }
      return throwError(() => error);
    })
  );
};
