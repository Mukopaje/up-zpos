import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
  IonMenuButton, IonButton, IonIcon, IonList, IonItem, 
  IonLabel, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonGrid, IonRow, IonCol, IonChip, IonBadge, IonToggle,
  AlertController, ToastController, IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, create, trash, shield, checkmark, close } from 'ionicons/icons';
import { Role } from '../../models';
import { RolesService } from '../../core/services/roles.service';

@Component({
  selector: 'app-roles',
  templateUrl: './roles.page.html',
  styleUrls: ['./roles.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
    IonMenuButton, IonButton, IonIcon, IonList, IonItem,
    IonLabel, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonGrid, IonRow, IonCol, IonChip, IonBadge, IonToggle, IonSpinner
  ]
})
export class RolesPage implements OnInit {
  roles = signal<Role[]>([]);
  loading = signal(false);

  // Permission modules
  modules = [
    { key: 'pos', name: 'Point of Sale' },
    { key: 'inventory', name: 'Inventory' },
    { key: 'products', name: 'Products' },
    { key: 'customers', name: 'Customers' },
    { key: 'reports', name: 'Reports' },
    { key: 'settings', name: 'Settings' },
    { key: 'users', name: 'Users' },
    { key: 'roles', name: 'Roles' },
    { key: 'terminals', name: 'Terminals' },
    { key: 'tables', name: 'Tables' },
    { key: 'waiters', name: 'Waiters' },
    { key: 'kitchen', name: 'Kitchen' }
  ];

  actions = ['view', 'create', 'edit', 'delete', 'manage'];

  constructor(
    private rolesService: RolesService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    addIcons({ add, create, trash, shield, checkmark, close });
  }

  ngOnInit() {
    this.loadRoles();
  }

  async loadRoles() {
    this.loading.set(true);
    try {
      await this.rolesService.loadRoles();
      this.roles.set(this.rolesService.roles());
    } catch (error) {
      console.error('Error loading roles:', error);
      this.showToast('Failed to load roles', 'danger');
    } finally {
      this.loading.set(false);
    }
  }

  async createRole() {
    const alert = await this.alertCtrl.create({
      header: 'Create Role',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Role Name'
        },
        {
          name: 'level',
          type: 'number',
          placeholder: 'Level (1-100)',
          min: 1,
          max: 100,
          value: 50
        },
        {
          name: 'description',
          type: 'textarea',
          placeholder: 'Description'
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Create',
          handler: async (data) => {
            if (!data.name || !data.level) {
              this.showToast('Name and level are required', 'warning');
              return false;
            }

            const role: Role = {
              _id: `role_${Date.now()}`,
              type: 'role',
              name: data.name,
              level: parseInt(data.level),
              description: data.description || '',
              permissions: [],
              active: true,
              canGiveDiscounts: false,
              maxDiscountPercent: 0,
              requiresApproval: true,
              canVoidTransactions: false,
              createdAt: Date.now(),
              updatedAt: Date.now()
            };

            try {
              await this.rolesService.createRole(role);
              await this.loadRoles();
              this.showToast('Role created successfully', 'success');
              return true;
            } catch (error) {
              console.error('Error creating role:', error);
              this.showToast('Failed to create role', 'danger');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async editRole(role: Role) {
    const alert = await this.alertCtrl.create({
      header: 'Edit Role',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Role Name',
          value: role.name
        },
        {
          name: 'level',
          type: 'number',
          placeholder: 'Level (1-100)',
          min: 1,
          max: 100,
          value: role.level
        },
        {
          name: 'description',
          type: 'textarea',
          placeholder: 'Description',
          value: role.description
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: async (data) => {
            const updated = {
              ...role,
              name: data.name,
              level: parseInt(data.level),
              description: data.description
            };

            try {
              await this.rolesService.updateRole(updated);
              await this.loadRoles();
              this.showToast('Role updated successfully', 'success');
              return true;
            } catch (error) {
              console.error('Error updating role:', error);
              this.showToast('Failed to update role', 'danger');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async deleteRole(role: Role) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Role',
      message: `Are you sure you want to delete "${role.name}"? This cannot be undone.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              await this.rolesService.deleteRole(role._id);
              await this.loadRoles();
              this.showToast('Role deleted successfully', 'success');
            } catch (error) {
              console.error('Error deleting role:', error);
              this.showToast('Failed to delete role', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async toggleModuleAction(role: Role, module: string, action: string) {
    const permission = role.permissions.find(p => p.module === module);
    let updated: Role;

    if (permission) {
      // Permission exists - toggle action
      const hasAction = permission.actions.includes(action);
      if (hasAction) {
        // Remove action
        const newActions = permission.actions.filter(a => a !== action);
        if (newActions.length === 0) {
          // Remove entire permission if no actions left
          updated = {
            ...role,
            permissions: role.permissions.filter(p => p.module !== module)
          };
        } else {
          updated = {
            ...role,
            permissions: role.permissions.map(p =>
              p.module === module ? { ...p, actions: newActions } : p
            )
          };
        }
      } else {
        // Add action
        updated = {
          ...role,
          permissions: role.permissions.map(p =>
            p.module === module ? { ...p, actions: [...p.actions, action] } : p
          )
        };
      }
    } else {
      // Create new permission with this action
      updated = {
        ...role,
        permissions: [...role.permissions, { module, actions: [action] }]
      };
    }

    try {
      await this.rolesService.updateRole(updated);
      await this.loadRoles();
    } catch (error) {
      console.error('Error toggling permission:', error);
      this.showToast('Failed to update permission', 'danger');
    }
  }

  async toggleCapability(role: Role, capability: keyof Role) {
    const updated = {
      ...role,
      [capability]: !(role[capability] as boolean)
    };

    try {
      await this.rolesService.updateRole(updated);
      await this.loadRoles();
    } catch (error) {
      console.error('Error toggling capability:', error);
      this.showToast('Failed to update capability', 'danger');
    }
  }

  hasAction(role: Role, module: string, action: string): boolean {
    const permission = role.permissions.find(p => p.module === module);
    return permission ? permission.actions.includes(action) : false;
  }

  getLevelColor(level: number): string {
    if (level >= 80) return 'danger';
    if (level >= 50) return 'warning';
    if (level >= 30) return 'primary';
    return 'medium';
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
