import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
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
  Platform,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  browsers, 
  analytics, 
  sync, 
  colorWand, 
  calculator, 
  stats,
  pin,
  people,
  settings,
  logOut
} from 'ionicons/icons';

import { StorageService } from './core/services/storage.service';
import { AuthService } from './core/services/auth.service';
import { SettingsService } from './core/services/settings.service';

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
    IonRouterOutlet
  ],
})
export class AppComponent implements OnInit {
  private platform = inject(Platform);
  private router = inject(Router);
  private storage = inject(StorageService);
  private authService = inject(AuthService);
  private settingsService = inject(SettingsService);
  private alertCtrl = inject(AlertController);

  public appPages = [
    { title: 'POS', url: '/pos', icon: 'browsers' },
    { title: 'Transactions', url: '/orders', icon: 'analytics' },
    { title: 'Products', url: '/products', icon: 'sync' },
    { title: 'Inventory', url: '/inventory', icon: 'color-wand' },
    { title: 'Customer Accounts', url: '/accounts', icon: 'calculator' },
    { title: 'Reports', url: '/reports', icon: 'stats' },
    { title: 'Locations', url: '/locations', icon: 'pin' },
    { title: 'Users', url: '/users', icon: 'people' },
    { title: 'Settings', url: '/settings', icon: 'settings' },
  ];

  constructor() {
    this.initializeApp();
    this.registerIcons();
  }

  ngOnInit() {
    this.handleBackButton();
  }

  private registerIcons() {
    addIcons({ 
      browsers, 
      analytics, 
      sync, 
      'color-wand': colorWand, 
      calculator, 
      stats,
      pin,
      people,
      settings,
      'log-out': logOut
    });
  }

  private async initializeApp() {
    await this.platform.ready();
    console.log('Platform ready!');
    await this.checkAuth();
  }

  private async checkAuth() {
    const isAuthenticated = await this.authService.isAuthenticated();
    if (!isAuthenticated) {
      this.router.navigate(['/login']);
    }
  }

  private handleBackButton() {
    this.platform.backButton.subscribeWithPriority(10, async () => {
      const url = this.router.url;
      
      if (url === '/pos' || url === '/pos-products' || url === '/menu') {
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
            this.router.navigate(['/login']);
          }
        }
      ]
    });
    await alert.present();
  }
}
