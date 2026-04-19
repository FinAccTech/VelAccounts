import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ActiveAccountService } from '../services/active-account.service';
import { TokenService } from '../services/token.service';

/** Redirects to /login if user has no valid token. */
export const authGuard: CanActivateFn = () => {
  const tokens = inject(TokenService);
  const router = inject(Router);

  if (tokens.isAccessTokenPresent()) return true;
  return router.createUrlTree(['/login']);
};

/** Redirects to /select-account if no book of accounts is selected. */
export const accountGuard: CanActivateFn = () => {
  const account = inject(ActiveAccountService);
  const tokens  = inject(TokenService);
  const router  = inject(Router);

  if (!tokens.isAccessTokenPresent()) return router.createUrlTree(['/login']);
  if (account.accSno())               return true;
  return router.createUrlTree(['/select-account']);
};
