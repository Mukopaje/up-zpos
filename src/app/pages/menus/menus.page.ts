import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonMenuButton,
  IonButton,
  IonIcon,
  IonLabel,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonSpinner,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, createOutline, trashOutline, restaurantOutline, colorPaletteOutline } from 'ionicons/icons';

import { ProductsService } from '../../core/services/products.service';
import { Menu } from '../../models';

@Component({
  selector: 'app-menus',
  templateUrl: './menus.page.html',
  styleUrls: ['./menus.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonMenuButton,
    IonButton,
    IonIcon,
    IonLabel,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonSpinner
  ]
})
export class MenusPage implements OnInit {
  private productsService = inject(ProductsService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  menus = this.productsService.menus;
  loading = signal(false);

  constructor() {
    addIcons({
      'add-outline': addOutline,
      'create-outline': createOutline,
      'trash-outline': trashOutline,
      'restaurant-outline': restaurantOutline,
      'color-palette-outline': colorPaletteOutline
    });
  }

  async ngOnInit() {
    await this.loadMenus();
  }

  private async loadMenus() {
    this.loading.set(true);
    try {
      await this.productsService.loadMenus();
    } catch (error) {
      console.error('Error loading menus:', error);
      await this.showToast('Failed to load menus', 'danger');
    } finally {
      this.loading.set(false);
    }
  }

  async openCreateMenuDialog() {
    const alert = await this.alertCtrl.create({
      header: 'Create Menu',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Menu name (e.g., Kitchen)'
        },
        {
          name: 'description',
          type: 'textarea',
          placeholder: 'Description (optional)'
        },
        {
          name: 'color',
          type: 'text',
          placeholder: 'Color (e.g., #FF6B6B)'
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Create',
          handler: async data => {
            if (!data.name || !data.name.trim()) {
              await this.showToast('Menu name is required', 'warning');
              return false;
            }

            try {
              await this.productsService.createMenu(
                data.name.trim(),
                data.description?.trim() || '',
                data.color?.trim() || undefined
              );
              await this.showToast('Menu created', 'success');
              return true;
            } catch (error: any) {
              console.error('Error creating menu:', error);
              const message = error?.message?.includes('UNIQUE')
                ? 'A menu with that name already exists'
                : 'Failed to create menu';
              await this.showToast(message, 'danger');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async openEditMenuDialog(menu: Menu) {
    const alert = await this.alertCtrl.create({
      header: 'Edit Menu',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Menu name',
          value: menu.name
        },
        {
          name: 'description',
          type: 'textarea',
          placeholder: 'Description (optional)',
          value: menu.description || ''
        },
        {
          name: 'color',
          type: 'text',
          placeholder: 'Color (e.g., #FF6B6B)',
          value: menu.color || ''
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: async data => {
            if (!data.name || !data.name.trim()) {
              await this.showToast('Menu name is required', 'warning');
              return false;
            }

            try {
              await this.productsService.updateMenu(menu._id, {
                name: data.name.trim(),
                description: data.description?.trim() || '',
                color: data.color?.trim() || undefined
              });
              await this.showToast('Menu updated', 'success');
              return true;
            } catch (error: any) {
              console.error('Error updating menu:', error);
              const message = error?.message?.includes('UNIQUE')
                ? 'A menu with that name already exists'
                : 'Failed to update menu';
              await this.showToast(message, 'danger');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async toggleActive(menu: Menu) {
    try {
      await this.productsService.updateMenu(menu._id, { active: menu.active ? 0 : 1 });
    } catch (error) {
      console.error('Error toggling menu:', error);
      await this.showToast('Failed to update menu', 'danger');
    }
  }

  async deleteMenu(menu: Menu) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Menu',
      message: `Delete "${menu.name}"? Categories assigned to this menu must be moved first.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              await this.productsService.deleteMenu(menu._id);
              await this.showToast('Menu deleted', 'success');
            } catch (error: any) {
              console.error('Error deleting menu:', error);
              const message = error?.message || 'Failed to delete menu';
              await this.showToast(message, 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger' = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
