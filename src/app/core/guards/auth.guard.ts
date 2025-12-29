import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const AuthGuard = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('AuthGuard: Checking authentication...');

  // Wait for auth service to initialize
  await authService.waitForInit();

  // Check if user is authenticated (includes license validation)
  const isAuthenticated = await authService.isAuthenticated();
  console.log('AuthGuard: isAuthenticated =', isAuthenticated);
  
  if (!isAuthenticated) {
    console.log('AuthGuard: Not authenticated, redirecting to /login');
    router.navigate(['/login']);
    return false;
  }

  console.log('AuthGuard: Access granted');
  return true;
};
