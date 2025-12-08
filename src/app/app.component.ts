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
  chevronForwardOutline
} from 'ionicons/icons';
import { filter } from 'rxjs/operators';

import { StorageService } from './core/services/storage.service';
import { AuthService } from './core/services/auth.service';
import { SettingsService } from './core/services/settings.service';
import { InitDataService } from './core/services/init-data.service';

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

  // Signals
  menuCollapsed = signal(false);
  currentRoute = signal('');
  
  // Auto-hide menu in POS routes
  private posRoutes = ['/pos', '/pos-retail', '/pos-category', '/pos-hospitality'];

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
          { title: 'Products', url: '/products', icon: 'cube-outline', permission: 'products' },
          { title: 'Modifier Groups', url: '/modifier-groups', icon: 'layers-outline', permission: 'products' },
          { title: 'Inventory', url: '/inventory', icon: 'layers-outline', permission: 'inventory' },
        ]
      },
      {
        title: 'Customers',
        permission: 'customers',
        items: [
          { title: 'Customers', url: '/customers', icon: 'people-outline', permission: 'customers' },
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
          { title: 'Roles', url: '/roles', icon: 'shield-outline', permission: 'roles' },
          { title: 'Users', url: '/users', icon: 'person-outline', permission: 'users' },
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
        this.currentRoute.set(event.url);
        
        // Start menu collapsed in POS routes but keep it enabled
        if (this.posRoutes.some(route => event.url.startsWith(route))) {
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
      'chevron-forward-outline': chevronForwardOutline
    });
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
}
