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
  IonSegment,
  IonSegmentButton,
  IonLabel,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  restaurantOutline,
  checkmarkCircleOutline,
  peopleOutline,
  timeOutline,
  createOutline,
  trashOutline,
  personAddOutline,
  receiptOutline,
  closeOutline,
  locationOutline,
  layersOutline,
  personOutline,
  personCircleOutline,
  cashOutline,
  squareOutline,
  ellipseOutline,
  removeOutline
} from 'ionicons/icons';

import { Table } from '../../models';
import { TablesService } from '../../core/services/tables.service';
import { WaitersService } from '../../core/services/waiters.service';

@Component({
  selector: 'app-tables',
  templateUrl: './tables.page.html',
  styleUrls: ['./tables.page.scss'],
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
    IonSegment,
    IonSegmentButton,
    IonLabel
  ]
})
export class TablesPage implements OnInit {
  private tablesService = inject(TablesService);
  private waitersService = inject(WaitersService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  tables = this.tablesService.tables;
  waiters = this.waitersService.waiters;
  
  filterSection = 'all';
  filteredTables = signal<Table[]>([]);
  
  sections = computed(() => {
    const sectionsSet = new Set<string>();
    this.tables().forEach(table => {
      if (table.section) sectionsSet.add(table.section);
    });
    return Array.from(sectionsSet).sort();
  });

  constructor() {
    addIcons({
      'add-outline': addOutline,
      'restaurant-outline': restaurantOutline,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'people-outline': peopleOutline,
      'time-outline': timeOutline,
      'create-outline': createOutline,
      'trash-outline': trashOutline,
      'person-add-outline': personAddOutline,
      'receipt-outline': receiptOutline,
      'close-outline': closeOutline,
      'location-outline': locationOutline,
      'layers-outline': layersOutline,
      'person-outline': personOutline,
      'person-circle-outline': personCircleOutline,
      'cash-outline': cashOutline,
      'square-outline': squareOutline,
      'ellipse-outline': ellipseOutline,
      'remove-outline': removeOutline
    });
  }

  async ngOnInit() {
    await this.loadData();
    this.filterTables();
  }

  async loadData() {
    await Promise.all([
      this.tablesService.loadTables(),
      this.waitersService.loadWaiters()
    ]);
  }

  filterTables() {
    if (this.filterSection === 'all') {
      this.filteredTables.set(this.tables());
    } else {
      this.filteredTables.set(
        this.tables().filter(table => table.section === this.filterSection)
      );
    }
  }

  getTablesByStatus(status: string): Table[] {
    return this.tables().filter(table => table.status === status);
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      free: 'success',
      occupied: 'warning',
      reserved: 'tertiary',
      cleaning: 'medium'
    };
    return colors[status] || 'medium';
  }

  getShapeIcon(shape?: string): string {
    const icons: Record<string, string> = {
      square: 'square-outline',
      round: 'ellipse-outline',
      rectangular: 'remove-outline'
    };
    return icons[shape || 'square'] || 'square-outline';
  }

  async createTable() {
    const alert = await this.alertCtrl.create({
      header: 'Create Table',
      inputs: [
        {
          name: 'number',
          type: 'text',
          placeholder: 'Table Number (e.g., T1, T2)',
          attributes: {
            required: true
          }
        },
        {
          name: 'name',
          type: 'text',
          placeholder: 'Table Name (optional)'
        },
        {
          name: 'capacity',
          type: 'number',
          placeholder: 'Capacity',
          value: '4',
          attributes: {
            min: 1,
            required: true
          }
        },
        {
          name: 'section',
          type: 'text',
          placeholder: 'Section (e.g., Main Floor, Terrace)'
        },
        {
          name: 'floor',
          type: 'number',
          placeholder: 'Floor Number',
          value: '1'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Select Shape',
          handler: async (data) => {
            if (!data.number || !data.capacity) {
              await this.showToast('Please fill in required fields');
              return false;
            }
            await this.selectShape(data);
            return false;
          }
        }
      ]
    });

    await alert.present();
  }

  async selectShape(tableData: any) {
    const alert = await this.alertCtrl.create({
      header: 'Select Table Shape',
      inputs: [
        {
          type: 'radio',
          label: 'Square',
          value: 'square',
          checked: true
        },
        {
          type: 'radio',
          label: 'Round',
          value: 'round'
        },
        {
          type: 'radio',
          label: 'Rectangular',
          value: 'rectangular'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Create',
          handler: async (shape) => {
            await this.saveTable({
              ...tableData,
              shape
            });
          }
        }
      ]
    });

    await alert.present();
  }

  async saveTable(data: any) {
    try {
      await this.tablesService.createTable({
        type: 'table',
        number: data.number,
        name: data.name || undefined,
        capacity: parseInt(data.capacity),
        section: data.section || undefined,
        floor: data.floor ? parseInt(data.floor) : undefined,
        shape: data.shape || 'square',
        terminalId: localStorage.getItem('currentTerminalId') || 'default',
        active: true
      });

      await this.loadData();
      this.filterTables();
      await this.showToast('Table created successfully');
    } catch (error) {
      console.error('Error creating table:', error);
      await this.showToast('Failed to create table');
    }
  }

  async editTable(table: Table) {
    const alert = await this.alertCtrl.create({
      header: 'Edit Table',
      inputs: [
        {
          name: 'number',
          type: 'text',
          placeholder: 'Table Number',
          value: table.number
        },
        {
          name: 'name',
          type: 'text',
          placeholder: 'Table Name',
          value: table.name || ''
        },
        {
          name: 'capacity',
          type: 'number',
          placeholder: 'Capacity',
          value: table.capacity.toString()
        },
        {
          name: 'section',
          type: 'text',
          placeholder: 'Section',
          value: table.section || ''
        },
        {
          name: 'floor',
          type: 'number',
          placeholder: 'Floor',
          value: table.floor?.toString() || '1'
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
            await this.updateTable(table, data);
          }
        }
      ]
    });

    await alert.present();
  }

  async updateTable(table: Table, data: any) {
    try {
      await this.tablesService.updateTable({
        ...table,
        number: data.number,
        name: data.name || undefined,
        capacity: parseInt(data.capacity),
        section: data.section || undefined,
        floor: data.floor ? parseInt(data.floor) : undefined
      });

      await this.loadData();
      this.filterTables();
      await this.showToast('Table updated successfully');
    } catch (error) {
      console.error('Error updating table:', error);
      await this.showToast('Failed to update table');
    }
  }

  async occupyTable(table: Table) {
    const waiterInputs = this.waiters()
      .filter(w => w.active)
      .map(waiter => ({
        type: 'radio' as const,
        label: waiter.name,
        value: waiter._id
      }));

    const alert = await this.alertCtrl.create({
      header: 'Seat Guests',
      inputs: [
        {
          name: 'guestName',
          type: 'text',
          placeholder: 'Guest Name',
          attributes: {
            required: true
          }
        },
        {
          name: 'guestCount',
          type: 'number',
          placeholder: 'Number of Guests',
          value: '2',
          attributes: {
            min: 1,
            required: true
          }
        },
        ...(waiterInputs.length > 0 ? [
          {
            type: 'text' as const,
            label: 'Assign Waiter',
            disabled: true
          },
          ...waiterInputs
        ] : [])
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Confirm',
          handler: async (data) => {
            if (!data.guestName || !data.guestCount) {
              await this.showToast('Please fill in required fields');
              return false;
            }

            try {
              const waiter = this.waiters().find(w => w._id === data.waiterId);
              
              await this.tablesService.occupyTable(
                table._id,
                data.guestName,
                parseInt(data.guestCount),
                waiter?._id,
                waiter?.name
              );

              if (waiter) {
                await this.waitersService.assignTable(waiter._id, table._id);
              }

              await this.loadData();
              this.filterTables();
              await this.showToast('Table occupied successfully');
              return true;
            } catch (error) {
              console.error('Error occupying table:', error);
              await this.showToast('Failed to occupy table');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async viewTableOrder(table: Table) {
    // Navigate to POS hospitality with this table
    await this.showToast('Opening table order...');
    // TODO: Implement navigation to POS hospitality page with table context
  }

  async clearTable(table: Table) {
    const alert = await this.alertCtrl.create({
      header: 'Clear Table',
      message: `Are you sure you want to clear ${table.number}?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Clear',
          role: 'destructive',
          handler: async () => {
            try {
              if (table.waiterId) {
                await this.waitersService.unassignTable(table.waiterId, table._id);
              }

              await this.tablesService.clearTable(table._id);
              await this.loadData();
              this.filterTables();
              await this.showToast('Table cleared successfully');
            } catch (error) {
              console.error('Error clearing table:', error);
              await this.showToast('Failed to clear table');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async toggleActive(table: Table) {
    try {
      await this.tablesService.updateTable({
        ...table,
        active: !table.active
      });

      await this.loadData();
      this.filterTables();
      await this.showToast(table.active ? 'Table deactivated' : 'Table activated');
    } catch (error) {
      console.error('Error toggling table status:', error);
      await this.showToast('Failed to update table status');
    }
  }

  async deleteTable(table: Table) {
    if (table.status === 'occupied') {
      await this.showToast('Cannot delete occupied table');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Delete Table',
      message: `Are you sure you want to delete ${table.number}?`,
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
              await this.tablesService.deleteTable(table._id);
              await this.loadData();
              this.filterTables();
              await this.showToast('Table deleted successfully');
            } catch (error) {
              console.error('Error deleting table:', error);
              await this.showToast('Failed to delete table');
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
