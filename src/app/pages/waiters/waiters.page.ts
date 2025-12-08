import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonBadge,
  IonSearchbar,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  searchOutline,
  personOutline,
  checkmarkCircleOutline,
  restaurantOutline,
  cashOutline,
  createOutline,
  trashOutline,
  locationOutline,
  listOutline,
  receiptOutline,
  trendingUpOutline,
  checkmarkCircle,
  closeCircle
} from 'ionicons/icons';

import { Waiter, Table } from '../../models';
import { WaitersService } from '../../core/services/waiters.service';
import { TablesService } from '../../core/services/tables.service';
import { UsersService } from '../../core/services/users.service';

@Component({
  selector: 'app-waiters',
  templateUrl: './waiters.page.html',
  styleUrls: ['./waiters.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonBadge,
    IonSearchbar
  ]
})
export class WaitersPage implements OnInit {
  private waitersService = inject(WaitersService);
  private tablesService = inject(TablesService);
  private usersService = inject(UsersService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  waiters = this.waitersService.waiters;
  tables = this.tablesService.tables;
  users = this.usersService.users;
  
  searchTerm = signal<string>('');
  filteredWaiters = signal<Waiter[]>([]);

  activeWaiters = computed(() => 
    this.waiters().filter(w => w.active)
  );

  constructor() {
    addIcons({
      'add-outline': addOutline,
      'search-outline': searchOutline,
      'person-outline': personOutline,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'restaurant-outline': restaurantOutline,
      'cash-outline': cashOutline,
      'create-outline': createOutline,
      'trash-outline': trashOutline,
      'location-outline': locationOutline,
      'list-outline': listOutline,
      'receipt-outline': receiptOutline,
      'trending-up-outline': trendingUpOutline,
      'checkmark-circle': checkmarkCircle,
      'close-circle': closeCircle
    });
  }

  async ngOnInit() {
    await this.loadData();
    this.filterWaiters();
  }

  async loadData() {
    await Promise.all([
      this.waitersService.loadWaiters(),
      this.tablesService.loadTables(),
      this.usersService.loadUsers()
    ]);
  }

  onSearchChange(event: any) {
    this.searchTerm.set(event.target.value?.toLowerCase() || '');
    this.filterWaiters();
  }

  filterWaiters() {
    const term = this.searchTerm();
    if (!term) {
      this.filteredWaiters.set(this.waiters());
    } else {
      this.filteredWaiters.set(
        this.waiters().filter(waiter =>
          waiter.name.toLowerCase().includes(term) ||
          waiter.code?.toLowerCase().includes(term) ||
          waiter.section?.toLowerCase().includes(term)
        )
      );
    }
  }

  getTotalActiveTables(): number {
    return this.activeWaiters().reduce((sum, w) => sum + w.currentTables.length, 0);
  }

  getTotalSales(): number {
    return this.activeWaiters().reduce((sum, w) => 
      sum + (w.stats?.salesTotal || 0), 0
    );
  }

  getTableNumber(tableId: string): string {
    const table = this.tables().find(t => t._id === tableId);
    return table?.number || tableId.substring(0, 3);
  }

  async createWaiter() {
    const availableUsers = this.users().filter(user => {
      const isWaiter = this.waiters().some(w => w.userId === user._id);
      return !isWaiter && user.active;
    });

    if (availableUsers.length === 0) {
      await this.showToast('No available users. Create users first.');
      return;
    }

    const userInputs = availableUsers.map(user => ({
      type: 'radio' as const,
      label: `${user.firstName} ${user.lastName}`,
      value: user._id
    }));

    const alert = await this.alertCtrl.create({
      header: 'Create Waiter',
      inputs: [
        {
          type: 'text' as const,
          label: 'Select User',
          disabled: true
        },
        ...userInputs,
        {
          name: 'code',
          type: 'text' as const,
          placeholder: 'Waiter Code (e.g., W1, W2)'
        },
        {
          name: 'section',
          type: 'text' as const,
          placeholder: 'Assigned Section (optional)'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Create',
          handler: async (data) => {
            if (!data.userId) {
              await this.showToast('Please select a user');
              return false;
            }
            await this.saveWaiter(data);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  async saveWaiter(data: any) {
    try {
      const user = this.users().find(u => u._id === data.userId);
      if (!user) {
        await this.showToast('User not found');
        return;
      }

      await this.waitersService.createWaiter({
        type: 'waiter',
        userId: user._id,
        name: `${user.firstName} ${user.lastName}`,
        code: data.code || undefined,
        section: data.section || undefined,
        active: true
      });

      await this.loadData();
      this.filterWaiters();
      await this.showToast('Waiter created successfully');
    } catch (error) {
      console.error('Error creating waiter:', error);
      await this.showToast('Failed to create waiter');
    }
  }

  async editWaiter(waiter: Waiter) {
    const alert = await this.alertCtrl.create({
      header: 'Edit Waiter',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Name',
          value: waiter.name
        },
        {
          name: 'code',
          type: 'text',
          placeholder: 'Code',
          value: waiter.code || ''
        },
        {
          name: 'section',
          type: 'text',
          placeholder: 'Section',
          value: waiter.section || ''
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save',
          handler: async (data) => {
            await this.updateWaiter(waiter, data);
          }
        }
      ]
    });

    await alert.present();
  }

  async updateWaiter(waiter: Waiter, data: any) {
    try {
      await this.waitersService.updateWaiter({
        ...waiter,
        name: data.name,
        code: data.code || undefined,
        section: data.section || undefined
      });

      await this.loadData();
      this.filterWaiters();
      await this.showToast('Waiter updated successfully');
    } catch (error) {
      console.error('Error updating waiter:', error);
      await this.showToast('Failed to update waiter');
    }
  }

  async assignSection(waiter: Waiter) {
    const sections = new Set<string>();
    this.tables().forEach(table => {
      if (table.section) sections.add(table.section);
    });

    const sectionInputs = Array.from(sections).map(section => ({
      type: 'radio' as const,
      label: section,
      value: section,
      checked: waiter.section === section
    }));

    if (sectionInputs.length === 0) {
      await this.showToast('No sections available. Configure tables first.');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Assign Section',
      inputs: sectionInputs,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Assign',
          handler: async (section) => {
            try {
              await this.waitersService.updateWaiter({
                ...waiter,
                section
              });

              await this.loadData();
              this.filterWaiters();
              await this.showToast('Section assigned successfully');
            } catch (error) {
              console.error('Error assigning section:', error);
              await this.showToast('Failed to assign section');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async viewTables(waiter: Waiter) {
    if (waiter.currentTables.length === 0) {
      await this.showToast('No active tables');
      return;
    }

    const tablesList = waiter.currentTables
      .map(tableId => {
        const table = this.tables().find(t => t._id === tableId);
        return table ? `${table.number} - ${table.guestName || 'Unknown'}` : tableId;
      })
      .join('\n');

    const alert = await this.alertCtrl.create({
      header: `${waiter.name}'s Tables`,
      message: tablesList,
      buttons: ['OK']
    });

    await alert.present();
  }

  async toggleActive(waiter: Waiter) {
    try {
      await this.waitersService.updateWaiter({
        ...waiter,
        active: !waiter.active
      });

      await this.loadData();
      this.filterWaiters();
      await this.showToast(waiter.active ? 'Waiter deactivated' : 'Waiter activated');
    } catch (error) {
      console.error('Error toggling waiter status:', error);
      await this.showToast('Failed to update waiter status');
    }
  }

  async deleteWaiter(waiter: Waiter) {
    if (waiter.currentTables.length > 0) {
      await this.showToast('Cannot delete waiter with active tables');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Delete Waiter',
      message: `Are you sure you want to delete ${waiter.name}?`,
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
              await this.waitersService.deleteWaiter(waiter._id);
              await this.loadData();
              this.filterWaiters();
              await this.showToast('Waiter deleted successfully');
            } catch (error) {
              console.error('Error deleting waiter:', error);
              await this.showToast('Failed to delete waiter');
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
