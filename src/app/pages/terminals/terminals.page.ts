import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
  IonMenuButton, IonButton, IonIcon, IonList, IonItem, 
  IonLabel, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonGrid, IonRow, IonCol, IonBadge, IonToggle, IonInput,
  AlertController, ToastController, IonSpinner, IonSelect,
  IonSelectOption
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, create, trash, desktop, power, wifi } from 'ionicons/icons';
import { Terminal } from '../../models';
import { TerminalsService } from '../../core/services/terminals.service';

@Component({
  selector: 'app-terminals',
  templateUrl: './terminals.page.html',
  styleUrls: ['./terminals.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
    IonMenuButton, IonButton, IonIcon, IonList, IonItem,
    IonLabel, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonGrid, IonRow, IonCol, IonBadge, IonToggle, IonInput,
    IonSpinner, IonSelect, IonSelectOption
  ]
})
export class TerminalsPage implements OnInit {
  terminals = signal<Terminal[]>([]);
  loading = signal(false);

  posModesOptions = [
    { value: 'retail', label: 'Retail POS', description: 'Barcode-focused for quick scanning' },
    { value: 'category', label: 'Category POS', description: 'Touch-optimized product grid' },
    { value: 'hospitality', label: 'Hospitality POS', description: 'Table management for restaurants' }
  ];

  terminalTypes = [
    { value: 'pos', label: 'POS Terminal' },
    { value: 'kitchen', label: 'Kitchen Display' },
    { value: 'display', label: 'Customer Display' },
    { value: 'kiosk', label: 'Self-Service Kiosk' }
  ];

  constructor(
    private terminalsService: TerminalsService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    addIcons({ add, create, trash, desktop, power, wifi });
  }

  ngOnInit() {
    this.loadTerminals();
  }

  async loadTerminals() {
    this.loading.set(true);
    try {
      await this.terminalsService.loadTerminals();
      this.terminals.set(this.terminalsService.terminals());
    } catch (error) {
      console.error('Error loading terminals:', error);
      this.showToast('Failed to load terminals', 'danger');
    } finally {
      this.loading.set(false);
    }
  }

  async createTerminal() {
    const alert = await this.alertCtrl.create({
      header: 'Register Terminal',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Terminal Name (e.g., Main Counter)'
        },
        {
          name: 'code',
          type: 'text',
          placeholder: 'Short Code (e.g., POS1)'
        },
        {
          name: 'location',
          type: 'text',
          placeholder: 'Location (e.g., Front Desk)'
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Register',
          handler: async (data) => {
            if (!data.name || !data.code) {
              this.showToast('Name and code are required', 'warning');
              return false;
            }

            const terminal: Terminal = {
              _id: `terminal_${Date.now()}`,
              type: 'terminal',
              name: data.name,
              code: data.code.toUpperCase(),
              terminalType: 'pos',
              location: data.location || '',
              posMode: 'category',
              active: true,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              createdBy: 'admin'
            };

            try {
              await this.terminalsService.registerTerminal(terminal);
              await this.loadTerminals();
              this.showToast('Terminal registered successfully', 'success');
              return true;
            } catch (error) {
              console.error('Error creating terminal:', error);
              this.showToast('Failed to register terminal', 'danger');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async editTerminal(terminal: Terminal) {
    const alert = await this.alertCtrl.create({
      header: 'Edit Terminal',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Terminal Name',
          value: terminal.name
        },
        {
          name: 'code',
          type: 'text',
          placeholder: 'Short Code',
          value: terminal.code
        },
        {
          name: 'location',
          type: 'text',
          placeholder: 'Location',
          value: terminal.location
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: async (data) => {
            const updated = {
              ...terminal,
              name: data.name,
              code: data.code.toUpperCase(),
              location: data.location
            };

            try {
              await this.terminalsService.updateTerminal(updated);
              await this.loadTerminals();
              this.showToast('Terminal updated successfully', 'success');
              return true;
            } catch (error) {
              console.error('Error updating terminal:', error);
              this.showToast('Failed to update terminal', 'danger');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async deleteTerminal(terminal: Terminal) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Terminal',
      message: `Are you sure you want to delete "${terminal.name}"? This cannot be undone.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              await this.terminalsService.deleteTerminal(terminal._id);
              await this.loadTerminals();
              this.showToast('Terminal deleted successfully', 'success');
            } catch (error) {
              console.error('Error deleting terminal:', error);
              this.showToast('Failed to delete terminal', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async toggleActive(terminal: Terminal) {
    const updated = {
      ...terminal,
      active: !terminal.active
    };

    try {
      await this.terminalsService.updateTerminal(updated);
      await this.loadTerminals();
    } catch (error) {
      console.error('Error toggling terminal:', error);
      this.showToast('Failed to update terminal', 'danger');
    }
  }

  async changePosMode(terminal: Terminal, event: any) {
    const updated = {
      ...terminal,
      posMode: event.detail.value
    };

    try {
      await this.terminalsService.updateTerminal(updated);
      await this.loadTerminals();
      this.showToast('POS mode updated', 'success');
    } catch (error) {
      console.error('Error updating POS mode:', error);
      this.showToast('Failed to update POS mode', 'danger');
    }
  }

  async changeTerminalType(terminal: Terminal, event: any) {
    const updated = {
      ...terminal,
      terminalType: event.detail.value
    };

    try {
      await this.terminalsService.updateTerminal(updated);
      await this.loadTerminals();
      this.showToast('Terminal type updated', 'success');
    } catch (error) {
      console.error('Error updating terminal type:', error);
      this.showToast('Failed to update terminal type', 'danger');
    }
  }

  getStatusColor(terminal: Terminal): string {
    if (!terminal.active) return 'medium';
    if (terminal.online) return 'success';
    const hoursSinceLastPing = terminal.lastPing 
      ? (Date.now() - terminal.lastPing) / (1000 * 60 * 60)
      : 999;
    return hoursSinceLastPing < 1 ? 'success' : 'warning';
  }

  getStatusText(terminal: Terminal): string {
    if (!terminal.active) return 'Inactive';
    if (terminal.online) return 'Online';
    const hoursSinceLastPing = terminal.lastPing 
      ? (Date.now() - terminal.lastPing) / (1000 * 60 * 60)
      : 999;
    return hoursSinceLastPing < 1 ? 'Online' : 'Offline';
  }

  getLastSeenText(terminal: Terminal): string {
    if (!terminal.lastPing) return 'Never';
    const minutes = Math.floor((Date.now() - terminal.lastPing) / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      color,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }
}
