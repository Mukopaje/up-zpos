import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { SettingsService } from '../services/settings.service';

/**
 * Guard to ensure user has set their location (country + city)
 * Redirects to location setup if not configured
 */
export const locationSetupGuard: CanActivateFn = async (route, state) => {
  const settingsService = inject(SettingsService);
  const router = inject(Router);

  const settings = settingsService.settings();
  
  // Check if country is set
  if (!settings.country || !settings.city) {
    // Redirect to location setup
    await router.navigate(['/location-setup'], { 
      queryParams: { returnUrl: state.url } 
    });
    return false;
  }

  return true;
};
