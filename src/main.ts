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
import { AuthService } from './app/core/services/auth.service';
import { ProductsService } from './app/core/services/products.service';
import { CustomersService } from './app/core/services/customers.service';
import { BarcodeService } from './app/core/services/barcode.service';
import { SqliteService } from './app/core/services/sqlite.service';
import { SyncService } from './app/core/services/sync.service';
import { addIcons } from 'ionicons';
import { mapOutline } from 'ionicons/icons';

if (environment.production) {
  enableProdMode();
}

// Register any Ionicons that are not available by default
addIcons({ mapOutline });

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({ mode: 'md' }),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations(),
    // Core services
    StorageService,
    AuthService,
    ProductsService,
    CustomersService,
    BarcodeService,
    SqliteService,
    SyncService
  ],
}).catch(err => console.error(err));
