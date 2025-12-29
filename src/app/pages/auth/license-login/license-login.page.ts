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

  email = '';
  password = '';
  isLoading = signal(false);

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

  async onLogin() {
    if (!this.email || !this.password) {
      this.showToast('Please enter email and password');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Activating license...'
    });
    await loading.present();

    try {
      const success = await this.authService.activateLicense(this.email, this.password);
      
      if (success) {
        await loading.dismiss();
        await this.showToast('License activated successfully!', 'success');
        this.router.navigate(['/pin-login'], { replaceUrl: true });
      } else {
        await loading.dismiss();
        this.showToast('Invalid credentials or license expired');
      }
    } catch (error) {
      await loading.dismiss();
      this.showToast('License activation failed. Please check your internet connection.');
      console.error('License activation error:', error);
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
