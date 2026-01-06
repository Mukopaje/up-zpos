import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonText,
  IonSpinner,
  LoadingController,
  ToastController
} from '@ionic/angular/standalone';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-license-login',
  templateUrl: './license-login.page.html',
  styleUrls: ['./license-login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonText,
    IonSpinner
  ]
})
export class LicenseLoginPage implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);

  // License activation state
  licenseCode = '';
  isLoading = signal(false);

  // License recovery state (forgot license code)
  showRecovery = false;
  recoverEmail = '';
  recoverPin = '';

  async ngOnInit() {
    // Wait for auth service to initialize
    await this.authService.waitForInit();
    
    // Check if already has license
    const hasLicense = await this.authService.hasActiveLicense();
    if (hasLicense) {
      // Has license, redirect to PIN login (they should login with PIN)
      this.router.navigate(['/pin-login'], { replaceUrl: true });
    }
  }

  toggleRecovery() {
    this.showRecovery = !this.showRecovery;
  }

  async onLogin() {
    if (!this.licenseCode) {
      this.showToast('Please enter your license code');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Validating license...'
    });
    await loading.present();

    try {
      const result = await this.authService.validateLicense(this.licenseCode.trim());

      await loading.dismiss();

      if (result) {
        await this.showToast('License validated. You can now log in with your PIN.', 'success');
        this.router.navigate(['/pin-login'], { replaceUrl: true });
      } else {
        this.showToast('Invalid or expired license key');
      }
    } catch (error) {
      await loading.dismiss();
      this.showToast('License validation failed. Please check your internet connection.');
      console.error('License validation error:', error);
    }
  }

  async onRecoverLicense() {
    if (!this.recoverEmail) {
      this.showToast('Please enter the owner email');
      return;
    }

    if (!this.recoverPin || this.recoverPin.length < 4) {
      this.showToast('Please enter the owner PIN (4-6 digits)');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Sending license details...'
    });
    await loading.present();

    try {
      const result = await this.authService.recoverLicenseKey(this.recoverEmail, this.recoverPin);
      await loading.dismiss();
      this.showToast(result.message, result.success ? 'success' : 'danger');

      if (result.success) {
        // Reset recovery state
        this.showRecovery = false;
        this.recoverEmail = '';
        this.recoverPin = '';
      }
    } catch (error) {
      await loading.dismiss();
      this.showToast('Unable to process license recovery. Please try again.');
      console.error('License recovery error:', error);
    }
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
