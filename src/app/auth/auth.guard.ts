import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const tokenStatus = auth.getTokenStatus(auth.getToken());

  if (tokenStatus === 'valid') {
    return true;
  }

  if (tokenStatus === 'expired') {
    auth.clearSession('Votre session a expiré. Veuillez vous reconnecter.');
  } else if (tokenStatus === 'invalid') {
    auth.clearSession('Token invalide. Veuillez vous authentifier.');
  }

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
