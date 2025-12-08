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
      header: 'Logout License',
      message: 'This will deactivate the POS license on this device. You will need to login again with your email and password. Continue?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Logout',
          role: 'destructive',
          handler: async () => {
            await this.authService.logoutLicense();
            this.router.navigate(['/license-login'], { replaceUrl: true });
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
