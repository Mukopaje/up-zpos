import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonText,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  ToastController,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { backspaceOutline, logOutOutline } from 'ionicons/icons';

import { AuthService } from '../../../core/services/auth.service';
import { SyncService } from '../../../core/services/sync.service';
import { SqliteService } from '../../../core/services/sqlite.service';

@Component({
  selector: 'app-pin-login',
  templateUrl: './pin-login.page.html',
  styleUrls: ['./pin-login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonText,
    IonGrid,
    IonRow,
    IonCol,
    IonIcon
  ]
})
export class PinLoginPage implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private syncService = inject(SyncService);
  private sqlite = inject(SqliteService);

  pin = signal('');
  displayPin = signal('');
  businessName = signal('Loading...');
  isLoading = signal(false);

  constructor() {
    addIcons({ backspaceOutline, logOutOutline });
  }

  async ngOnInit() {
    // Wait for auth service to initialize
    await this.authService.waitForInit();
    
    // Check if license is activated
    const hasLicense = await this.authService.hasActiveLicense();
    if (!hasLicense) {
      this.router.navigate(['/license-login'], { replaceUrl: true });
      return;
    }

    // Check if user is already authenticated
    const isAuth = await this.authService.isAuthenticated();
    if (isAuth) {
      // Already logged in, go to app
      this.router.navigate(['/data-loader'], { replaceUrl: true });
      return;
    }

    // Load business name
    const settings = await this.authService.getBusinessSettings();
    this.businessName.set(settings?.businessName || 'ZPOS');
  }

  onNumberClick(num: string) {
    this.pin.update(p => p + num);
    this.displayPin.update(p => p + '•');
  }

  onBackspace() {
    this.pin.update(p => p.slice(0, -1));
    this.displayPin.update(p => p.slice(0, -1));
  }

  onClear() {
    this.pin.set('');
    this.displayPin.set('');
  }

  async onSubmit() {
    const pinValue = this.pin();
    
    if (pinValue.length < 4) {
      await this.showToast('PIN must be at least 4 digits');
      return;
    }

    this.isLoading.set(true);

    try {
      const success = await this.authService.loginWithPin(pinValue);
      
      if (success) {
        // Get user to show welcome message
        const user = this.authService.currentUser();
        await this.showToast(`Welcome ${user?.firstName || 'User'}!`, 'success');
        
        // Navigate to data loader then POS
        this.router.navigate(['/data-loader'], { replaceUrl: true });
      } else {
        await this.showToast('Invalid PIN. Please try again.');
        this.onClear();
      }
    } catch (error) {
      console.error('PIN login error:', error);
      await this.showToast('Login failed. Please try again.');
      this.onClear();
    } finally {
      this.isLoading.set(false);
    }
  }

  async onLogoutLicense() {
    const alert = await this.alertCtrl.create({
      header: 'Deactivate License',
      message:
        'This will attempt to sync any unsent sales, then clear all local POS data and remove this license from the device so a different business can activate it. You must enter an ADMIN PIN and be online for this to continue.',
      inputs: [
        {
          name: 'adminPin',
          type: 'password',
          placeholder: 'Admin PIN (4-6 digits)',
          attributes: {
            inputmode: 'numeric',
            maxlength: 6
          }
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Deactivate',
          role: 'destructive',
          handler: async (data) => {
            const pin = (data?.adminPin || '').trim();

            if (!pin || pin.length < 4) {
              await this.showToast('Please enter a valid admin PIN');
              return false;
            }

            // Check for unsynced data and try to sync before deactivation
            try {
              await this.sqlite.ensureInitialized();
              const unsynced = await this.sqlite.getUnsyncedOutboxItems();

              if (unsynced.length > 0) {
                const syncResult = await this.syncService.syncToCloud();

                if (!syncResult.success) {
                  await this.showToast(
                    'Cannot deactivate license while there is unsynced data. Please connect to the internet and try again.'
                  );
                  return false;
                }
              }
            } catch (error) {
              console.error('Error checking/syncing data before license deactivation:', error);
              await this.showToast('Unable to verify sync status. Please try again.');
              return false;
            }

            // Validate admin PIN against backend
            const isAdmin = await this.authService.validateAdminPin(pin);
            if (!isAdmin) {
              await this.showToast('Invalid admin PIN. License was not changed.');
              return false;
            }

            // Deactivate license and clear local data
            try {
              await this.authService.deactivateLicense();
              await this.showToast(
                'License deactivated. You can now activate this device for a different business.',
                'success'
              );
              this.router.navigate(['/license-login'], { replaceUrl: true });
            } catch (error) {
              console.error('Error deactivating license:', error);
              await this.showToast('Failed to deactivate license. Please try again.');
              return false;
            }

            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  private async showToast(message: string, color: 'danger' | 'success' = 'danger') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'top',
      color
    });
    await toast.present();
  }
}
