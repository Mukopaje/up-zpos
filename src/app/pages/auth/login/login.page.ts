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
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
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
export class LoginPage implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);

  // Two-step authentication
  step: 'license' | 'pin' = 'license';
  licenseKey = '';
  pin = '';
  tenantId = '';
  businessName = '';
  isLoading = signal(false);

  ngOnInit() {
    this.checkExistingAuth();
    this.checkExistingLicense();
  }

  private async checkExistingAuth() {
    const isAuth = await this.authService.isAuthenticated();
    if (isAuth) {
      this.router.navigate(['/data-loader']);
    }
  }

  private async checkExistingLicense() {
    // Check if we already have a validated license
    const tenantId = await this.authService.getTenantId();
    const businessName = await this.authService.getBusinessName();
    
    if (tenantId && businessName) {
      this.tenantId = tenantId;
      this.businessName = businessName;
      this.step = 'pin'; // Skip to PIN entry
    }
  }

  async onValidateLicense() {
    if (!this.licenseKey || this.licenseKey.length < 10) {
      this.showToast('Please enter a valid license key');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Validating license...'
    });
    await loading.present();

    try {
      const result = await this.authService.validateLicense(this.licenseKey);
      
      if (result) {
        this.tenantId = result.tenantId;
        this.businessName = result.businessName;
        this.step = 'pin';
        await loading.dismiss();
        this.showToast(`Welcome to ${result.businessName}`, 'success');
      } else {
        await loading.dismiss();
        this.showToast('Invalid or expired license key');
      }
    } catch (error) {
      await loading.dismiss();
      this.showToast('License validation failed. Please try again.');
      console.error('License validation error:', error);
    }
  }

  async onLogin() {
    if (!this.pin || this.pin.length < 4) {
      this.showToast('Please enter your PIN');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Logging in...'
    });
    await loading.present();

    try {
      const success = await this.authService.loginWithPin(this.pin, this.tenantId);
      
      if (success) {
        await loading.dismiss();
        this.router.navigate(['/data-loader']);
      } else {
        await loading.dismiss();
        this.showToast('Invalid PIN');
      }
    } catch (error) {
      await loading.dismiss();
      this.showToast('Login failed. Please try again.');
      console.error('Login error:', error);
    }
  }

  goBack() {
    this.step = 'license';
    this.pin = '';
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
