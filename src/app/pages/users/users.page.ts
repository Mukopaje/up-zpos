import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonSearchbar,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonBadge,
  IonChip,
  IonLabel,
  IonItem,
  IonList,
  IonToggle,
  AlertController,
  ToastController,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  searchOutline,
  personOutline,
  shieldOutline,
  terminalOutline,
  keyOutline,
  ellipsisVertical,
  createOutline,
  trashOutline,
  checkmarkCircle,
  closeCircle,
  mailOutline,
  callOutline,
  timeOutline
} from 'ionicons/icons';

import { User, Role, Terminal } from '../../models';
import { UsersService } from '../../core/services/users.service';
import { RolesService } from '../../core/services/roles.service';
import { TerminalsService } from '../../core/services/terminals.service';

@Component({
  selector: 'app-users',
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
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
    IonSearchbar,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonBadge,
    IonChip,
    IonLabel,
    IonItem,
    IonList,
    IonToggle
  ]
})
export class UsersPage implements OnInit {
  private usersService = inject(UsersService);
  private rolesService = inject(RolesService);
  private terminalsService = inject(TerminalsService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  users = signal<User[]>([]);
  filteredUsers = signal<User[]>([]);
  roles = signal<Role[]>([]);
  terminals = signal<Terminal[]>([]);
  searchTerm = signal('');

  constructor() {
    addIcons({
      'add-outline': addOutline,
      'search-outline': searchOutline,
      'person-outline': personOutline,
      'shield-outline': shieldOutline,
      'terminal-outline': terminalOutline,
      'key-outline': keyOutline,
      'ellipsis-vertical': ellipsisVertical,
      'create-outline': createOutline,
      'trash-outline': trashOutline,
      'checkmark-circle': checkmarkCircle,
      'close-circle': closeCircle,
      'mail-outline': mailOutline,
      'call-outline': callOutline,
      'time-outline': timeOutline
    });
  }

  async ngOnInit() {
    await this.loadData();
  }

  private async loadData() {
    try {
      await Promise.all([
        this.loadUsers(),
        this.loadRoles(),
        this.loadTerminals()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      await this.showToast('Failed to load data');
    }
  }

  async loadUsers() {
    try {
      await this.usersService.loadUsers();
      this.users.set(this.usersService.users());
      this.filterUsers();
    } catch (error) {
      console.error('Error loading users:', error);
      throw error;
    }
  }

  async loadRoles() {
    try {
      this.roles.set(this.rolesService.roles());
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  }

  async loadTerminals() {
    try {
      this.terminals.set(this.terminalsService.terminals());
    } catch (error) {
      console.error('Error loading terminals:', error);
    }
  }

  filterUsers() {
    const term = this.searchTerm().toLowerCase();
    if (!term) {
      this.filteredUsers.set(this.users());
      return;
    }

    const filtered = this.users().filter(user =>
      user.firstName.toLowerCase().includes(term) ||
      user.lastName.toLowerCase().includes(term) ||
      user.username.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term)
    );
    this.filteredUsers.set(filtered);
  }

  onSearchChange(event: any) {
    this.searchTerm.set(event.detail.value || '');
    this.filterUsers();
  }

  async createUser() {
    const alert = await this.alertCtrl.create({
      header: 'Create User',
      inputs: [
        {
          name: 'firstName',
          type: 'text',
          placeholder: 'First Name',
          attributes: {
            required: true
          }
        },
        {
          name: 'lastName',
          type: 'text',
          placeholder: 'Last Name',
          attributes: {
            required: true
          }
        },
        {
          name: 'username',
          type: 'text',
          placeholder: 'Username',
          attributes: {
            required: true
          }
        },
        {
          name: 'email',
          type: 'email',
          placeholder: 'Email',
          attributes: {
            required: true
          }
        },
        {
          name: 'phone',
          type: 'tel',
          placeholder: 'Phone (optional)'
        },
        {
          name: 'pin',
          type: 'password',
          placeholder: 'PIN Code (4-6 digits)',
          attributes: {
            minlength: 4,
            maxlength: 6,
            pattern: '[0-9]*'
          }
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Next',
          handler: async (data) => {
            if (!data.firstName || !data.lastName || !data.username || !data.email) {
              await this.showToast('Please fill in all required fields');
              return false;
            }
            if (data.pin && (data.pin.length < 4 || data.pin.length > 6)) {
              await this.showToast('PIN must be 4-6 digits');
              return false;
            }
            await this.selectRole(data);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  private async selectRole(userData: any) {
    const roleButtons = this.roles().map(role => ({
      text: `${role.name} (Level ${role.level})`,
      handler: async () => {
        await this.selectTerminals(userData, role._id);
      }
    }));

    const alert = await this.alertCtrl.create({
      header: 'Select Role',
      buttons: [
        ...roleButtons,
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  private async selectTerminals(userData: any, roleId: string) {
    const terminalInputs = this.terminals().map(terminal => ({
      type: 'checkbox' as const,
      label: `${terminal.name} (${terminal.code})`,
      value: terminal._id,
      checked: false
    }));

    const alert = await this.alertCtrl.create({
      header: 'Assign Terminals',
      message: 'Select which terminals this user can access (leave empty for all)',
      inputs: terminalInputs,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Create',
          handler: async (selectedTerminals: string[]) => {
            await this.saveUser(userData, roleId, selectedTerminals);
          }
        }
      ]
    });

    await alert.present();
  }

  private async saveUser(userData: any, roleId: string, allowedTerminals: string[]) {
    try {
      // Hash the PIN before saving
      const hashedPin = userData.pin ? await this.hashPin(userData.pin) : undefined;
      
      await this.usersService.createUser({
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username,
        email: userData.email,
        phone: userData.phone || '',
        roleId: roleId,
        role: roleId, // Deprecated but kept for compatibility
        permissions: [],
        pin: hashedPin || 'hashed_0000', // Default PIN if none provided
        active: true,
        allowedTerminals: allowedTerminals.length > 0 ? allowedTerminals : undefined
      });

      await this.loadUsers();
      await this.showToast(`User ${userData.firstName} ${userData.lastName} created successfully`);
    } catch (error) {
      console.error('Error creating user:', error);
      await this.showToast('Failed to create user');
    }
  }

  // Simple hash function - in production use bcrypt
  private async hashPin(pin: string): Promise<string> {
    return `hashed_${pin}`;
  }

  async editUser(user: User) {
    const alert = await this.alertCtrl.create({
      header: 'Edit User',
      inputs: [
        {
          name: 'firstName',
          type: 'text',
          placeholder: 'First Name',
          value: user.firstName
        },
        {
          name: 'lastName',
          type: 'text',
          placeholder: 'Last Name',
          value: user.lastName
        },
        {
          name: 'email',
          type: 'email',
          placeholder: 'Email',
          value: user.email
        },
        {
          name: 'phone',
          type: 'tel',
          placeholder: 'Phone',
          value: user.phone
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
            await this.updateUser(user, data);
          }
        }
      ]
    });

    await alert.present();
  }

  private async updateUser(user: User, data: any) {
    try {
      await this.usersService.updateUser({
        ...user,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone
      });

      await this.loadUsers();
      await this.showToast('User updated successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      await this.showToast('Failed to update user');
    }
  }

  async changeRole(user: User) {
    const roleButtons = this.roles().map(role => ({
      text: `${role.name} (Level ${role.level})`,
      handler: async () => {
        try {
          await this.usersService.updateUser({
            ...user,
            roleId: role._id,
            role: role._id
          });

          await this.loadUsers();
          await this.showToast(`Role changed to ${role.name}`);
        } catch (error) {
          console.error('Error changing role:', error);
          await this.showToast('Failed to change role');
        }
      }
    }));

    const alert = await this.alertCtrl.create({
      header: 'Change Role',
      subHeader: `${user.firstName} ${user.lastName}`,
      buttons: [
        ...roleButtons,
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  async changePIN(user: User) {
    const alert = await this.alertCtrl.create({
      header: 'Change PIN',
      subHeader: `${user.firstName} ${user.lastName}`,
      inputs: [
        {
          name: 'pin',
          type: 'password',
          placeholder: 'New PIN (4-6 digits)',
          attributes: {
            minlength: 4,
            maxlength: 6,
            pattern: '[0-9]*'
          }
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
            if (!data.pin || data.pin.length < 4 || data.pin.length > 6) {
              await this.showToast('PIN must be 4-6 digits');
              return false;
            }

            try {
              await this.usersService.updateUser({
                ...user,
                pin: data.pin
              });

              await this.loadUsers();
              await this.showToast('PIN changed successfully');
            } catch (error) {
              console.error('Error changing PIN:', error);
              await this.showToast('Failed to change PIN');
            }
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  async manageTerminals(user: User) {
    const terminalInputs = this.terminals().map(terminal => ({
      type: 'checkbox' as const,
      label: `${terminal.name} (${terminal.code})`,
      value: terminal._id,
      checked: user.allowedTerminals?.includes(terminal._id) || false
    }));

    const alert = await this.alertCtrl.create({
      header: 'Manage Terminals',
      subHeader: `${user.firstName} ${user.lastName}`,
      message: 'Select which terminals this user can access (leave empty for all)',
      inputs: terminalInputs,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save',
          handler: async (selectedTerminals: string[]) => {
            try {
              await this.usersService.updateUser({
                ...user,
                allowedTerminals: selectedTerminals.length > 0 ? selectedTerminals : undefined
              });

              await this.loadUsers();
              await this.showToast('Terminal access updated');
            } catch (error) {
              console.error('Error updating terminals:', error);
              await this.showToast('Failed to update terminals');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async toggleActive(user: User) {
    try {
      const newStatus = !user.active;
      await this.usersService.updateUser({
        ...user,
        active: newStatus
      });

      await this.loadUsers();
      await this.showToast(newStatus ? 'User activated' : 'User deactivated');
    } catch (error) {
      console.error('Error toggling user status:', error);
      await this.showToast('Failed to update user status');
    }
  }

  async deleteUser(user: User) {
    const alert = await this.alertCtrl.create({
      header: 'Delete User',
      message: `Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`,
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
              await this.usersService.deleteUser(user);
              await this.loadUsers();
              await this.showToast('User deleted successfully');
            } catch (error) {
              console.error('Error deleting user:', error);
              await this.showToast('Failed to delete user');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  getRoleName(roleId: string): string {
    const role = this.roles().find(r => r._id === roleId);
    return role?.name || 'Unknown';
  }

  getRoleLevel(roleId: string): number {
    const role = this.roles().find(r => r._id === roleId);
    return role?.level || 0;
  }

  getTerminalCount(user: User): string {
    if (!user.allowedTerminals || user.allowedTerminals.length === 0) {
      return 'All Terminals';
    }
    return `${user.allowedTerminals.length} Terminal${user.allowedTerminals.length > 1 ? 's' : ''}`;
  }

  getLastLoginText(user: User): string {
    if (!user.lastLogin) return 'Never';
    const date = new Date(user.lastLogin);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
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
