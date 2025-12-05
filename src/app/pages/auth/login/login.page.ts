import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

  username = '';
  password = '';
  isLoading = signal(false);

  ngOnInit() {
    this.checkExistingAuth();
  }

  private async checkExistingAuth() {
    const isAuth = await this.authService.isAuthenticated();
    if (isAuth) {
      this.router.navigate(['/data-loader']);
    }
  }

  async onLogin() {
    if (!this.username || !this.password) {
      this.showToast('Please enter username and password');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Logging in...'
    });
    await loading.present();

    try {
      const success = await this.authService.login(this.username, this.password);
      
      if (success) {
        await loading.dismiss();
        this.router.navigate(['/data-loader']);
      } else {
        await loading.dismiss();
        this.showToast('Invalid credentials');
      }
    } catch (error) {
      await loading.dismiss();
      this.showToast('Login failed. Please try again.');
      console.error('Login error:', error);
    }
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
