import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonText,
  IonIcon,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircle, copy, warning } from 'ionicons/icons';

@Component({
  selector: 'app-success-modal',
  template: `
    <ion-header>
      <ion-toolbar color="success">
        <ion-title>Registration Successful!</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="success-container">
        <div class="icon-section">
          <ion-icon name="checkmark-circle" color="success"></ion-icon>
        </div>

        <div class="message-section">
          <h2>Welcome to ZPOS!</h2>
          <p>Your account has been created successfully.</p>
        </div>

        <div class="info-card">
          <div class="info-item">
            <ion-text color="medium">
              <strong>License Key:</strong>
            </ion-text>
            <div class="license-key" (click)="copyToClipboard(licenseKey)">
              <code>{{ licenseKey }}</code>
              <ion-icon name="copy" size="small"></ion-icon>
            </div>
            <ion-text color="medium">
              <small>Tap to copy</small>
            </ion-text>
          </div>

          <div class="info-item">
            <ion-text color="medium">
              <strong>Admin PIN:</strong>
            </ion-text>
            <div class="pin-display">
              <code>{{ pin }}</code>
            </div>
          </div>
        </div>

        <div class="warning-section">
          <ion-icon name="warning" color="warning"></ion-icon>
          <ion-text color="medium">
            <p><strong>Important:</strong> Save your license key in a safe place. You'll need it to login from other devices.</p>
          </ion-text>
        </div>

        <div class="tip-section">
          <ion-text color="primary">
            <p><strong>💡 Tip:</strong> You can change your PIN anytime from Settings → Users.</p>
          </ion-text>
        </div>

        <ion-button expand="block" color="primary" (click)="dismiss()">
          Get Started
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    .success-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 500px;
      margin: 0 auto;
    }

    .icon-section {
      text-align: center;
      
      ion-icon {
        font-size: 80px;
      }
    }

    .message-section {
      text-align: center;
      
      h2 {
        margin: 0 0 8px 0;
        font-size: 1.5rem;
        font-weight: 600;
      }

      p {
        margin: 0;
        color: var(--ion-color-medium);
      }
    }

    .info-card {
      background: var(--ion-color-light);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 8px;

      strong {
        font-size: 0.9rem;
      }
    }

    .license-key {
      display: flex;
      align-items: center;
      gap: 12px;
      background: white;
      padding: 12px 16px;
      border-radius: 8px;
      border: 2px solid var(--ion-color-primary);
      cursor: pointer;
      transition: all 0.2s;

      &:active {
        transform: scale(0.98);
        background: var(--ion-color-light);
      }

      code {
        flex: 1;
        font-size: 1rem;
        font-weight: 600;
        color: var(--ion-color-primary);
        letter-spacing: 1px;
      }

      ion-icon {
        color: var(--ion-color-primary);
      }
    }

    .pin-display {
      background: white;
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid var(--ion-color-medium-tint);

      code {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--ion-color-dark);
        letter-spacing: 2px;
      }
    }

    .warning-section {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      background: rgba(255, 193, 7, 0.1);
      border-radius: 8px;
      border-left: 4px solid var(--ion-color-warning);

      ion-icon {
        font-size: 24px;
        margin-top: 2px;
      }

      p {
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.5;
      }
    }

    .tip-section {
      padding: 12px;
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      border-radius: 8px;

      p {
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.5;
      }
    }
  `],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonText,
    IonIcon
  ]
})
export class SuccessModalComponent {
  @Input() licenseKey!: string;
  @Input() pin!: string;

  constructor(private modalCtrl: ModalController) {
    addIcons({ checkmarkCircle, copy, warning });
  }

  async copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
      console.log('License key copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
