import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { filter, map, take } from 'rxjs/operators';

export const authGuard = (route: any) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.authState$.pipe(
    filter(user => user !== undefined),
    take(1),
    map(user => {
      if (user) return true;

      const guestAllowed = route?.data?.['guestAllowed'] === true;
      const isGuest = sessionStorage.getItem('guestMode') === 'true';
      if (guestAllowed && isGuest) return true;

      return router.createUrlTree(['/login']);
    })
  );
};