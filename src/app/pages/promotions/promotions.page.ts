import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonFab,
  IonFabButton,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonInput,
  IonButtons,
  IonBackButton,
  IonToggle,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, create, trash, arrowBack, pricetagOutline } from 'ionicons/icons';
import { PromotionsService } from '../../core/services/promotions.service';
import { Promotion } from '../../models';

@Component({
  selector: 'app-promotions',
  templateUrl: './promotions.page.html',
  styleUrls: ['./promotions.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
    IonFab,
    IonFabButton,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonInput,
    IonButtons,
    IonBackButton,
    IonToggle
  ]
})
export class PromotionsPage implements OnInit {
  private promotionsService = inject(PromotionsService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  promotions = this.promotionsService.promotions;
  isLoading = this.promotionsService.isLoading;

  constructor() {
    addIcons({ add, create, trash, 'arrow-back': arrowBack, 'pricetag-outline': pricetagOutline });
  }

  async ngOnInit() {
    await this.promotionsService.loadPromotions();
  }

  async handleRefresh(event: any) {
    await this.promotionsService.loadPromotions();
    event.target.complete();
  }

  async addPromotion() {
    const alert = await this.alertCtrl.create({
      header: 'New Promotion',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Name'
        },
        {
          name: 'description',
          type: 'text',
          placeholder: 'Description (optional)'
        },
        {
          name: 'type',
          type: 'radio',
          label: 'Percent %',
          value: 'PERCENT',
          checked: true
        },
        {
          name: 'typeAmount',
          type: 'radio',
          label: 'Amount',
          value: 'AMOUNT'
        },
        {
          name: 'value',
          type: 'number',
          placeholder: 'Value'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Create',
          handler: async (data: any) => {
            const name = (data.name || '').trim();
            if (!name) {
              await this.showToast('Name is required');
              return false;
            }
            const type = data.type === 'AMOUNT' || data.typeAmount === 'AMOUNT' ? 'AMOUNT' : 'PERCENT';
            const rawValue = parseFloat(data.value);
            if (isNaN(rawValue) || rawValue <= 0) {
              await this.showToast('Enter a valid value');
              return false;
            }
            try {
              await this.promotionsService.createPromotion({
                name,
                description: data.description || undefined,
                type,
                value: rawValue,
                active: true
              } as Partial<Promotion>);
              await this.showToast('Promotion created');
              return true;
            } catch (error) {
              console.error('Error creating promotion', error);
              await this.showToast('Failed to create promotion');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async editPromotion(promo: Promotion) {
    const alert = await this.alertCtrl.create({
      header: 'Edit Promotion',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Name',
          value: promo.name
        },
        {
          name: 'description',
          type: 'text',
          placeholder: 'Description (optional)',
          value: promo.description || ''
        },
        {
          name: 'type',
          type: 'radio',
          label: 'Percent %',
          value: 'PERCENT',
          checked: promo.type === 'PERCENT'
        },
        {
          name: 'typeAmount',
          type: 'radio',
          label: 'Amount',
          value: 'AMOUNT',
          checked: promo.type === 'AMOUNT'
        },
        {
          name: 'value',
          type: 'number',
          placeholder: 'Value',
          value: promo.value.toString()
        },
        {
          name: 'active',
          type: 'checkbox',
          label: 'Active',
          checked: promo.active
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save',
          handler: async (data: any) => {
            const name = (data.name || '').trim();
            if (!name) {
              await this.showToast('Name is required');
              return false;
            }
            const type = data.type === 'AMOUNT' || data.typeAmount === 'AMOUNT' ? 'AMOUNT' : 'PERCENT';
            const rawValue = parseFloat(data.value);
            if (isNaN(rawValue) || rawValue <= 0) {
              await this.showToast('Enter a valid value');
              return false;
            }
            const active = !!data.active;
            try {
              await this.promotionsService.updatePromotion(promo.id, {
                name,
                description: data.description || undefined,
                type,
                value: rawValue,
                active
              });
              await this.showToast('Promotion updated');
              return true;
            } catch (error) {
              console.error('Error updating promotion', error);
              await this.showToast('Failed to update promotion');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async deletePromotion(promo: Promotion) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Promotion',
      message: `Delete promotion "${promo.name}"?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              await this.promotionsService.deletePromotion(promo.id);
              await this.showToast('Promotion deleted');
            } catch (error) {
              console.error('Error deleting promotion', error);
              await this.showToast('Failed to delete promotion');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }
}
