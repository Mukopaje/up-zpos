import { Component, inject, signal } from '@angular/core';
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
  IonBackButton,
  IonButtons,
  LoadingController,
  ToastController,
  ModalController
} from '@ionic/angular/standalone';

import { AuthService } from '../../../core/services/auth.service';
import { SuccessModalComponent } from './success-modal.component';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
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
    IonSpinner,
    IonBackButton,
    IonButtons
  ]
})
export class RegisterPage {
  private authService = inject(AuthService);
  private router = inject(Router);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);
  private modalCtrl = inject(ModalController);

  // Multi-step form
  currentStep = signal<1 | 2 | 3>(1);

  // Registration form data
  businessName = '';
  ownerEmail = '';
  ownerPhone = '';
  adminFirstName = '';
  adminLastName = '';
  adminPin = '';
  confirmPin = '';
  
  isLoading = signal(false);

  nextStep() {
    if (this.currentStep() < 3) {
      this.currentStep.set((this.currentStep() + 1) as 1 | 2 | 3);
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.set((this.currentStep() - 1) as 1 | 2 | 3);
    }
  }

  canProceedStep1(): boolean {
    return !!(this.businessName && this.ownerEmail);
  }

  canProceedStep2(): boolean {
    return !!(this.adminFirstName && this.adminLastName);
  }

  async onRegister() {
    // Validation
    if (!this.businessName || !this.ownerEmail || !this.adminFirstName || !this.adminLastName) {
      this.showToast('Please fill in all required fields');
      return;
    }

    if (!this.adminPin || this.adminPin.length < 4 || this.adminPin.length > 6) {
      this.showToast('PIN must be 4-6 digits');
      return;
    }

    if (this.adminPin !== this.confirmPin) {
      this.showToast('PINs do not match');
      return;
    }

    if (!/^\d+$/.test(this.adminPin)) {
      this.showToast('PIN must contain only numbers');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.ownerEmail)) {
      this.showToast('Please enter a valid email address');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Creating your account...'
    });
    await loading.present();

    try {
      const result = await this.authService.registerTenant({
        businessName: this.businessName,
        ownerEmail: this.ownerEmail,
        ownerPhone: this.ownerPhone || undefined,
        adminPin: this.adminPin,
        adminFirstName: this.adminFirstName,
        adminLastName: this.adminLastName
      });

      await loading.dismiss();

      if (result) {
        // Show success with license key
        await this.showSuccessModal(result.licenseKey, this.adminPin);
        // Navigate to data loader
        this.router.navigate(['/data-loader']);
      } else {
        this.showToast('Registration failed. Please try again.');
      }
    } catch (error: any) {
      await loading.dismiss();
      const message = error?.message || 'Registration failed. Please try again.';
      this.showToast(message);
      console.error('Registration error:', error);
    }
  }

  private async showSuccessModal(licenseKey: string, pin: string) {
    const modal = await this.modalCtrl.create({
      component: SuccessModalComponent,
      componentProps: {
        licenseKey,
        pin
      },
      backdropDismiss: false
    });
    
    await modal.present();
    await modal.onWillDismiss();
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'top',
      color: 'danger'
    });
    await toast.present();
  }
}
