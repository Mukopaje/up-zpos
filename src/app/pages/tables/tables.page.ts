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
  IonTextarea,
  IonModal,
  IonItem,
  IonInput,
  IonList,
  IonChip,
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
  removeOutline,
  listOutline
} from 'ionicons/icons';

import { Table } from '../../models';
import { TablesService } from '../../core/services/tables.service';
import { WaitersService } from '../../core/services/waiters.service';
import { AuthService } from '../../core/services/auth.service';

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
    IonLabel,
    IonTextarea,
    IonModal,
    IonItem,
    IonInput,
    IonList,
    IonChip
  ]
})
export class TablesPage implements OnInit {
  private tablesService = inject(TablesService);
  private waitersService = inject(WaitersService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private auth = inject(AuthService);

  tables = this.tablesService.tables;
  waiters = this.waitersService.waiters;
  
  filterSection = 'all';
  filteredTables = signal<Table[]>([]);

  // Bulk create state
  showBulkForm = signal<boolean>(false);
  bulkText = `#Main Floor\nT1\nT2\nT3\nT4\nT5\nT6\nT7\nT8\nT9\nT10\nT11\nT12\nT13\nT14\nT15\nT16`;

  // Table form state
  showTableForm = signal<boolean>(false);
  formMode: 'create' | 'edit' = 'create';
  editingTable: Table | null = null;
  tableForm: {
    number: string;
    name: string;
    capacity: number;
    section: string;
    floor: number;
    shape: 'square' | 'round' | 'rectangular';
  } = {
    number: '',
    name: '',
    capacity: 4,
    section: '',
    floor: 1,
    shape: 'square'
  };
  
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
      'remove-outline': removeOutline,
      'list-outline': listOutline
    });
  }

  async ngOnInit() {
    await this.loadData();
    this.filterTables();
  }

  async loadData() {
    const terminal = this.auth.currentTerminal();
    const terminalId = terminal?._id;
    const location = terminal?.location;
    // Ensure locations start with sensible defaults (e.g. T1–T16)
    // when tables are first managed/configured. The service will
    // infer a suitable terminal/location if needed and then load
    // the tables signal.
    await this.tablesService.ensureDefaultTablesForLocation(terminalId, location);

    await this.waitersService.loadWaiters();
  }

  filterTables() {
    if (this.filterSection === 'all') {
      this.filteredTables.set(this.tables());
      return;
    }

    if (this.filterSection === 'unassigned') {
      this.filteredTables.set(
        this.tables().filter(table => !table.section)
      );
      return;
    }

    this.filteredTables.set(
      this.tables().filter(table => table.section === this.filterSection)
    );
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
    // Open modern table form modal instead of generic alert
    this.formMode = 'create';
    this.editingTable = null;
    this.tableForm = {
      number: '',
      name: '',
      capacity: 4,
      section: this.filterSection === 'all' ? '' : this.filterSection,
      floor: 1,
      shape: 'square'
    };
    this.showTableForm.set(true);
  }

  async saveTable(data: any) {
    try {
      const terminal = this.auth.currentTerminal();
      // Tables are scoped by location but still require a terminal_id
      // in the database. Prefer the currently selected terminal, but
      // fall back to the terminal associated with existing tables so
      // admins can manage tables even if they opened this screen
      // without explicitly picking a terminal first.
      let terminalId = terminal?._id;

      if (!terminalId && this.tables().length > 0) {
        terminalId = this.tables()[0].terminalId;
      }

      if (!terminalId) {
        await this.showToast(
          'No hospitality location selected. Please select or create a hospitality terminal for this location first.'
        );
        return;
      }

      await this.tablesService.createTable({
        type: 'table',
        number: data.number,
        name: data.name || undefined,
        capacity: parseInt(data.capacity),
        section: data.section || undefined,
        floor: data.floor ? parseInt(data.floor) : undefined,
        shape: data.shape || 'square',
        terminalId,
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

  openBulkForm() {
    this.showBulkForm.set(true);
  }

  closeBulkForm() {
    this.showBulkForm.set(false);
  }

  async submitBulkForm() {
    const terminal = this.auth.currentTerminal();
    // Try to ensure we have sensible defaults and a usable terminal
    // context before bulk-creating tables. This will seed T1–T16 for
    // a suitable terminal/location if none exist yet.
    await this.tablesService.ensureDefaultTablesForLocation(
      terminal?._id,
      terminal?.location
    );

    // Prefer the active terminal, but if tables already exist we can
    // safely reuse the terminalId from those tables so bulk management
    // still works at a location level.
    let terminalId = terminal?._id;

    if ((!terminalId || this.tables().length === 0) && this.tables().length > 0) {
      terminalId = this.tables()[0].terminalId;
    }

    if (!terminalId) {
      await this.showToast(
        'No terminals are configured for hospitality yet. Please register a terminal for this location in the Terminals screen first.'
      );
      return;
    }

    const lines = this.bulkText.split(/\r?\n/);
    let currentSection: string | undefined;
    const toCreate: { number: string; section?: string }[] = [];

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith('#')) {
        currentSection = line.slice(1).trim() || undefined;
        continue;
      }
      toCreate.push({ number: line, section: currentSection });
    }

    if (toCreate.length === 0) {
      await this.showToast('No tables found in bulk input');
      return;
    }

    const existing = this.tables();
    const existingKeys = new Set(
      existing.map(t => `${(t.number || '').trim().toUpperCase()}|${(t.section || '').trim().toUpperCase()}`)
    );
    const pendingKeys = new Set<string>();
    let createdCount = 0;
    let skippedCount = 0;

    for (const entry of toCreate) {
      const key = `${entry.number.trim().toUpperCase()}|${(entry.section || '').trim().toUpperCase()}`;
      if (existingKeys.has(key) || pendingKeys.has(key)) {
        skippedCount++;
        continue;
      }

      try {
        await this.tablesService.createTable({
          type: 'table',
          number: entry.number,
          name: undefined,
          capacity: 4,
          section: entry.section,
          floor: 1,
          shape: 'square',
          terminalId,
          active: true
        });
        pendingKeys.add(key);
        createdCount++;
      } catch (error) {
        console.error('Error bulk-creating table', entry.number, error);
      }
    }

    await this.loadData();
    this.filterTables();
    this.closeBulkForm();

    if (createdCount > 0) {
      const msg = skippedCount > 0
        ? `Created ${createdCount} tables, skipped ${skippedCount} existing`
        : `Created ${createdCount} tables`;
      await this.showToast(msg);
    } else {
      await this.showToast('No new tables created (all already exist)');
    }
  }

  async editTable(table: Table) {
    // Open modern table form modal pre-filled with table data
    this.formMode = 'edit';
    this.editingTable = table;
    this.tableForm = {
      number: table.number,
      name: table.name || '',
      capacity: table.capacity,
      section: table.section || '',
      floor: table.floor || 1,
      shape: (table.shape as 'square' | 'round' | 'rectangular') || 'square'
    };
    this.showTableForm.set(true);
  }

  async updateTable(table: Table, data: any) {
    try {
      await this.tablesService.updateTable({
        ...table,
        number: data.number,
        name: data.name || undefined,
        capacity: parseInt(data.capacity),
        section: data.section || undefined,
        floor: data.floor ? parseInt(data.floor) : undefined,
        shape: data.shape || table.shape
      });

      await this.loadData();
      this.filterTables();
      await this.showToast('Table updated successfully');
    } catch (error) {
      console.error('Error updating table:', error);
      await this.showToast('Failed to update table');
    }
  }

  async clearSection(table: Table) {
    try {
      await this.tablesService.updateTable({
        ...table,
        section: undefined
      });

      await this.loadData();
      this.filterTables();
      await this.showToast('Table moved to Unassigned');
    } catch (error) {
      console.error('Error clearing table section:', error);
      await this.showToast('Failed to clear table section');
    }
  }

  closeTableForm() {
    this.showTableForm.set(false);
    this.editingTable = null;
  }

  async submitTableForm() {
    if (!this.tableForm.number || !this.tableForm.capacity) {
      await this.showToast('Please fill in required fields');
      return;
    }

    const data = {
      ...this.tableForm
    };

    if (this.formMode === 'create') {
      await this.saveTable(data);
    } else if (this.editingTable) {
      await this.updateTable(this.editingTable, data);
    }

    this.closeTableForm();
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
