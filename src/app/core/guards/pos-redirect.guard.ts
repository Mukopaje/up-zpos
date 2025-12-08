import { inject } from '@angular/core';
import { Router, UrlTree, CanActivateFn } from '@angular/router';
import { SettingsService } from '../services/settings.service';

/**
 * Guard that redirects /pos route to the appropriate POS mode
 * based on the configured default POS mode in Settings
 */
export const posRedirectGuard: CanActivateFn = (): UrlTree => {
  const router = inject(Router);
  const settingsService = inject(SettingsService);
  
  // Get the configured default POS mode from settings
  const defaultMode = settingsService.settings().defaultPosMode || 'category';
  
  // Redirect to the appropriate POS route
  return router.createUrlTree([`/pos-${defaultMode}`]);
};
