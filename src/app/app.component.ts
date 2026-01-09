import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { 
  IonApp, 
  IonSplitPane, 
  IonMenu, 
  IonContent, 
  IonList, 
  IonListHeader, 
  IonNote, 
  IonMenuToggle,
  IonItem, 
  IonIcon, 
  IonLabel, 
  IonRouterOutlet,
  IonRouterLink,
  IonButton,
  IonButtons,
  Platform,
  AlertController,
  MenuController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  cartOutline,
  receiptOutline,
  cubeOutline,
  layersOutline,
  peopleOutline,
  barChartOutline,
  printOutline,
  settingsOutline,
  personOutline,
  locationOutline,
  logOutOutline,
  menuOutline,
  restaurantOutline,
  cashOutline,
  walletOutline,
  shieldOutline,
  desktopOutline,
  bagHandleOutline,
  chevronBackOutline,
  chevronForwardOutline,
  pricetagOutline
} from 'ionicons/icons';
import { filter } from 'rxjs/operators';

import { StorageService } from './core/services/storage.service';
import { AuthService } from './core/services/auth.service';
import { SettingsService } from './core/services/settings.service';
import { InitDataService } from './core/services/init-data.service';
import { PrintJobsClientService } from './core/services/print-jobs-client.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonApp, 
    IonSplitPane, 
    IonMenu, 
    IonContent, 
    IonList, 
    IonListHeader, 
    IonNote, 
    IonMenuToggle,
    IonItem, 
    IonIcon, 
    IonLabel, 
    IonRouterLink,
    IonRouterOutlet,
    IonButton,
    IonButtons
  ],
})
export class AppComponent implements OnInit {
  private platform = inject(Platform);
  private router = inject(Router);
  private storage = inject(StorageService);
  private authService = inject(AuthService);
  private settingsService = inject(SettingsService);
  private initDataService = inject(InitDataService);
  private alertCtrl = inject(AlertController);
  private menuCtrl = inject(MenuController);
  private printJobsClient = inject(PrintJobsClientService);
  private syncService: any;  // Lazy inject to avoid circular dependency

  // Signals
  menuCollapsed = signal(false);
  currentRoute = signal('');
  // Hide menu completely on auth/onboarding routes and whenever user is not logged in
  isMenuCompletelyHidden = computed(() => {
    const routeHidden = this.menuHiddenRoutes.some(route => this.currentRoute().startsWith(route));
    const notLoggedIn = !this.authService.isLoggedIn();
    return notLoggedIn || routeHidden;
  });
  
  // Auto-hide menu in POS routes
  private posRoutes = ['/pos', '/pos-retail', '/pos-category', '/pos-hospitality'];
  // Fully hide menu in specific routes where it is not useful
  private menuHiddenRoutes = ['/onboarding', '/login', '/register', '/data-loader', '/license-login', '/pin-login', '/checkout'];

  // Computed - Filter menu by permissions
  public menuSections = computed(() => {
    const sections = [
      {
        title: 'Sales',
        permission: 'pos',
        items: [
          { title: 'POS', url: '/pos', icon: 'cart-outline', permission: 'pos' },
          { title: 'Orders', url: '/orders', icon: 'receipt-outline', permission: 'pos' },
        ]
      },
      {
        title: 'Inventory',
        permission: 'products',
        items: [
          { title: 'Products', url: '/products-management', icon: 'cube-outline', permission: 'products' },
          { title: 'Categories', url: '/categories', icon: 'pricetags-outline', permission: 'products' },
          { title: 'Modifier Groups', url: '/modifier-groups', icon: 'layers-outline', permission: 'products' },
          { title: 'Inventory', url: '/inventory', icon: 'layers-outline', permission: 'inventory' },
        ]
      },
      {
        title: 'Customers',
        permission: 'customers',
        items: [
          { title: 'Customers', url: '/customers', icon: 'people-outline', permission: 'customers' },
          { title: 'Accounts', url: '/accounts', icon: 'wallet-outline', permission: 'customers' },
        ]
      },
      {
        title: 'Hospitality',
        permission: 'tables',
        items: [
          { title: 'Tables', url: '/tables', icon: 'restaurant-outline', permission: 'tables' },
          { title: 'Waiters', url: '/waiters', icon: 'person-outline', permission: 'waiters' },
        ]
      },
      {
        title: 'Reports',
        permission: 'reports',
        items: [
          { title: 'Analytics', url: '/reports', icon: 'bar-chart-outline', permission: 'reports' },
        ]
      },
      {
        title: 'System',
        permission: 'settings',
        items: [
          { title: 'Settings', url: '/settings', icon: 'settings-outline', permission: 'settings' },
          { title: 'Printer Settings', url: '/printer-settings', icon: 'print-outline', permission: 'settings' },
          { title: 'Locations', url: '/locations', icon: 'location-outline', permission: 'settings' },
          { title: 'Promotions', url: '/promotions', icon: 'pricetag-outline', permission: 'settings' },
          { title: 'Roles', url: '/roles', icon: 'shield-outline', permission: 'roles' },
          { title: 'Users', url: '/users', icon: 'person-outline', permission: 'users' },
          { title: 'Menus', url: '/menus', icon: 'restaurant-outline', permission: 'settings' },
          { title: 'Terminals', url: '/terminals', icon: 'desktop-outline', permission: 'terminals' },
        ]
      },
    ];

    // Filter sections and items by permission
    return sections
      .filter(section => this.authService.canAccessModule(section.permission))
      .map(section => ({
        ...section,
        items: section.items.filter(item => this.authService.canAccessModule(item.permission))
      }))
      .filter(section => section.items.length > 0);
  });

  constructor() {
    this.initializeApp();
    this.registerIcons();
    this.setupRouteListener();
    this.startPrintJobsPolling();
    this.startAutoSync();
  }
  async ngOnInit() {
    await this.initDataService.initializeDefaultData();
    this.setupRouteListener();
    this.handleBackButton();
  }

  private setupRouteListener() {
    // Auto-hide menu in POS routes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const url = event.url;
        this.currentRoute.set(url);

        // Routes where the menu should be completely hidden/disabled
        if (this.menuHiddenRoutes.some(route => url.startsWith(route))) {
          this.menuCollapsed.set(true);
          this.menuCtrl.enable(false);
          this.menuCtrl.close();
          return;
        }

        // For all other routes, ensure the menu is enabled
        this.menuCtrl.enable(true);

        // Start menu collapsed in POS routes but keep it enabled
        if (this.posRoutes.some(route => url.startsWith(route))) {
          this.menuCollapsed.set(true);
          this.menuCtrl.close();
          // Keep menu enabled so it can be opened
        } else {
          this.menuCollapsed.set(false);
        }
      });
  }

  private registerIcons() {
    addIcons({ 
      'cart-outline': cartOutline,
      'receipt-outline': receiptOutline,
      'cube-outline': cubeOutline,
      'layers-outline': layersOutline,
      'people-outline': peopleOutline,
      'bar-chart-outline': barChartOutline,
      'print-outline': printOutline,
      'settings-outline': settingsOutline,
      'person-outline': personOutline,
      'location-outline': locationOutline,
      'log-out-outline': logOutOutline,
      'menu-outline': menuOutline,
      'restaurant-outline': restaurantOutline,
      'cash-outline': cashOutline,
      'wallet-outline': walletOutline,
      'shield-outline': shieldOutline,
      'desktop-outline': desktopOutline,
      'barcode-outline': bagHandleOutline,
      'chevron-back-outline': chevronBackOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'pricetag-outline': pricetagOutline
    });
  }

  private printJobsIntervalId: any;
  private autoSyncIntervalId: any;

  private startPrintJobsPolling() {
    if (this.printJobsIntervalId) {
      return;
    }

    // Poll periodically and only process jobs when in a POS route
    this.printJobsIntervalId = setInterval(async () => {
      try {
        const current = this.currentRoute();
        if (this.posRoutes.some(route => current.startsWith(route))) {
          await this.printJobsClient.processPendingJobsOnce(5);
        }
      } catch (error) {
        console.error('Error processing print jobs:', error);
      }
    }, 15000);
  }

  private async startAutoSync() {
    // Lazy inject SyncService to avoid circular dependency
    if (!this.syncService) {
      const { inject } = await import('@angular/core');
      const { SyncService } = await import('./core/services/sync.service');
      this.syncService = inject(SyncService);
    }

    if (this.autoSyncIntervalId) {
      return;
    }

    // Auto sync every 1 minute (60000ms) for online systems
    this.autoSyncIntervalId = setInterval(async () => {
      try {
        // Only sync if authenticated and not already syncing
        const isAuth = await this.authService.isAuthenticated();
        if (isAuth && !this.syncService.isSyncInProgress()) {
          console.log('🔄 Auto sync: Starting bidirectional sync...');
          
          // Pull updates from cloud (get new products/categories)
          const pullResult = await this.syncService.pullUpdates();
          if (pullResult.success && pullResult.pulled > 0) {
            console.log(`✅ Auto sync: Pulled ${pullResult.pulled} items from cloud`);
          }

          // Push local changes to cloud (sync sales/products)
          const pushResult = await this.syncService.syncToCloud();
          if (pushResult.success && pushResult.synced > 0) {
            console.log(`✅ Auto sync: Pushed ${pushResult.synced} items to cloud`);
          }
        }
      } catch (error) {
        console.error('❌ Auto sync failed:', error);
      }
    }, 60000); // 1 minute for immediate sync when online

    // Run sync immediately on app start (after 3 seconds to allow init)
    setTimeout(async () => {
      try {
        const isAuth = await this.authService.isAuthenticated();
        if (isAuth && !this.syncService.isSyncInProgress()) {
          console.log('🔄 Initial auto sync on app start...');
          await this.syncService.pullUpdates();
          await this.syncService.syncToCloud();
        }
      } catch (error) {
        console.error('Initial sync failed:', error);
      }
    }, 3000);
  }

  private async initializeApp() {
    await this.platform.ready();
    console.log('Platform ready!');
    await this.checkAuth();
  }

  private async checkAuth() {
    // Wait for auth service to initialize
    await this.authService.waitForInit();
    
    // Check license first
    const hasLicense = await this.authService.hasActiveLicense();
    if (!hasLicense) {
      this.router.navigate(['/license-login'], { replaceUrl: true });
      return;
    }
    
    // Then check user authentication
    const isAuthenticated = await this.authService.isAuthenticated();
    if (!isAuthenticated) {
      this.router.navigate(['/pin-login'], { replaceUrl: true });
      return;
    }
  }

  private handleBackButton() {
    this.platform.backButton.subscribeWithPriority(10, async () => {
      const url = this.router.url;
      
      if (url === '/pos-retail' || url === '/pos-category' || url === '/pos-hospitality' || url === '/pos-products' || url === '/menu') {
        const alert = await this.alertCtrl.create({
          header: 'Exit ZPOS',
          message: 'Would you like to close the app?',
          buttons: [
            {
              text: 'Cancel',
              role: 'cancel'
            },
            {
              text: 'Close ZPOS',
              handler: () => {
                (navigator as any)['app']?.exitApp();
              }
            }
          ]
        });
        await alert.present();
      }
    });
  }

  toggleMenu() {
    this.menuCollapsed.update(val => !val);
  }

  getUserInfo() {
    const user = this.authService.currentUser();
    const role = this.authService.getUserRole();
    return user ? `${user.firstName} ${user.lastName} (${role})` : 'Guest';
  }

  async logout() {
    const alert = await this.alertCtrl.create({
      header: 'Logout',
      message: 'Are you sure you want to sign out?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Logout',
          handler: async () => {
            await this.authService.logout();
            this.router.navigate(['/pin-login'], { replaceUrl: true });
          }
        }
      ]
    });
    await alert.present();
  }

  navigateTo(url: string) {
    console.log('Navigating to:', url);
    this.router.navigate([url]).then(success => {
      console.log('Navigation success:', success);
    }).catch(error => {
      console.error('Navigation error:', error);
    });
  }
}
