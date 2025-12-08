// Polyfill for PouchDB - 'global' is not defined in browser
(window as any).global = window;

import { enableProdMode, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { environment } from './environments/environment';

// Core services
import { StorageService } from './app/core/services/storage.service';
import { DbService } from './app/core/services/db.service';
import { AuthService } from './app/core/services/auth.service';
import { ProductsService } from './app/core/services/products.service';
import { CustomersService } from './app/core/services/customers.service';
import { BarcodeService } from './app/core/services/barcode.service';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({ mode: 'md' }),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations(),
    // Core services
    StorageService,
    DbService,
    AuthService,
    ProductsService,
    CustomersService,
    BarcodeService
  ],
}).catch(err => console.error(err));
