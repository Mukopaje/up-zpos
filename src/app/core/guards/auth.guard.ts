import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const AuthGuard = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth service to initialize
  await authService.waitForInit();

  // First check if license is activated
  const hasLicense = await authService.hasActiveLicense();
  if (!hasLicense) {
    router.navigate(['/license-login']);
    return false;
  }

  // Then check if user is authenticated
  const isAuthenticated = await authService.isAuthenticated();
  if (!isAuthenticated) {
    router.navigate(['/pin-login']);
    return false;
  }

  return true;
};
