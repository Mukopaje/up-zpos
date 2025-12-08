import { Injectable, inject, signal } from '@angular/core';
import { Role, Permission } from '../../models';
import { DbService } from './db.service';

@Injectable({
  providedIn: 'root'
})
export class RolesService {
  private db = inject(DbService);
  
  roles = signal<Role[]>([]);
  loading = signal(false);
  
  // Default roles for new installations
  private readonly defaultRoles: Role[] = [
    {
      _id: 'role_admin',
      type: 'role',
      name: 'Admin',
      description: 'Full system access with all permissions',
      level: 100,
      permissions: [
        { module: 'pos', actions: ['view', 'create', 'edit', 'delete', 'void', 'discount'] },
        { module: 'products', actions: ['view', 'create', 'edit', 'delete'] },
        { module: 'inventory', actions: ['view', 'create', 'edit', 'delete', 'adjust'] },
        { module: 'customers', actions: ['view', 'create', 'edit', 'delete'] },
        { module: 'reports', actions: ['view', 'export', 'print'] },
        { module: 'users', actions: ['view', 'create', 'edit', 'delete'] },
        { module: 'roles', actions: ['view', 'create', 'edit', 'delete'] },
        { module: 'terminals', actions: ['view', 'create', 'edit', 'delete'] },
        { module: 'settings', actions: ['view', 'edit'] },
        { module: 'tables', actions: ['view', 'create', 'edit', 'delete'] },
        { module: 'waiters', actions: ['view', 'create', 'edit', 'delete'] }
      ],
      active: true,
      canAccessTerminals: 'all',
      canManageUsers: true,
      canVoidTransactions: true,
      canGiveDiscounts: true,
      maxDiscountPercent: 100,
      requiresApproval: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      _id: 'role_manager',
      type: 'role',
      name: 'Manager',
      description: 'Store management with limited admin rights',
      level: 50,
      permissions: [
        { module: 'pos', actions: ['view', 'create', 'void', 'discount'] },
        { module: 'products', actions: ['view', 'create', 'edit'] },
        { module: 'inventory', actions: ['view', 'adjust'] },
        { module: 'customers', actions: ['view', 'create', 'edit'] },
        { module: 'reports', actions: ['view', 'export', 'print'] },
        { module: 'users', actions: ['view'] },
        { module: 'settings', actions: ['view'] },
        { module: 'tables', actions: ['view', 'create', 'edit'] },
        { module: 'waiters', actions: ['view', 'create', 'edit'] }
      ],
      active: true,
      canAccessTerminals: 'all',
      canManageUsers: false,
      canVoidTransactions: true,
      canGiveDiscounts: true,
      maxDiscountPercent: 25,
      requiresApproval: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      _id: 'role_cashier',
      type: 'role',
      name: 'Cashier',
      description: 'POS operations and basic customer management',
      level: 30,
      permissions: [
        { module: 'pos', actions: ['view', 'create', 'discount'] },
        { module: 'products', actions: ['view'] },
        { module: 'customers', actions: ['view', 'create'] },
        { module: 'reports', actions: ['view'] }
      ],
      active: true,
      canAccessTerminals: 'assigned',
      canManageUsers: false,
      canVoidTransactions: false,
      canGiveDiscounts: true,
      maxDiscountPercent: 10,
      requiresApproval: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      _id: 'role_waiter',
      type: 'role',
      name: 'Waiter',
      description: 'Table service and order management for hospitality',
      level: 20,
      permissions: [
        { module: 'pos', actions: ['view', 'create'] },
        { module: 'products', actions: ['view'] },
        { module: 'customers', actions: ['view'] },
        { module: 'tables', actions: ['view', 'edit'] }
      ],
      active: true,
      canAccessTerminals: 'assigned',
      canManageUsers: false,
      canVoidTransactions: false,
      canGiveDiscounts: false,
      maxDiscountPercent: 0,
      requiresApproval: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      _id: 'role_kitchen',
      type: 'role',
      name: 'Kitchen',
      description: 'Kitchen display and order preparation',
      level: 10,
      permissions: [
        { module: 'pos', actions: ['view'] },
        { module: 'products', actions: ['view'] }
      ],
      active: true,
      canAccessTerminals: 'assigned',
      canManageUsers: false,
      canVoidTransactions: false,
      canGiveDiscounts: false,
      maxDiscountPercent: 0,
      requiresApproval: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ];

  async loadRoles(): Promise<void> {
    this.loading.set(true);
    try {
      const roles = await this.db.find<Role>({
        type: 'role'
      });
      
      // Initialize default roles if none exist
      if (roles.length === 0) {
        await this.initializeDefaultRoles();
      } else {
        this.roles.set(roles);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  async initializeDefaultRoles(): Promise<void> {
    try {
      for (const role of this.defaultRoles) {
        await this.db.put(role);
      }
      await this.loadRoles();
    } catch (error) {
      console.error('Error initializing default roles:', error);
      throw error;
    }
  }

  async getRole(id: string): Promise<Role | undefined> {
    try {
      const doc = await this.db.get<Role>(id);
      return doc && doc.type === 'role' ? doc : undefined;
    } catch (error) {
      console.error('Error getting role:', error);
      return undefined;
    }
  }

  async createRole(role: Omit<Role, '_id' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    const newRole: Role = {
      ...role,
      _id: `role_${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    try {
      await this.db.put(newRole);
      await this.loadRoles();
      return newRole;
    } catch (error) {
      console.error('Error creating role:', error);
      throw error;
    }
  }

  async updateRole(role: Role): Promise<void> {
    try {
      const existing: any = await this.db.get(role._id);
      if (!existing) throw new Error('Role not found');
      
      const updated = {
        ...role,
        _rev: existing._rev,
        updatedAt: Date.now()
      };
      
      await this.db.put(updated);
      await this.loadRoles();
    } catch (error) {
      console.error('Error updating role:', error);
      throw error;
    }
  }

  async deleteRole(id: string): Promise<void> {
    try {
      const doc = await this.db.get(id);
      if (!doc) throw new Error('Role not found');
      
      await this.db.delete(doc as any);
      await this.loadRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      throw error;
    }
  }

  hasPermission(role: Role, module: string, action: string): boolean {
    const permission = role.permissions.find(p => p.module === module);
    return permission ? permission.actions.includes(action) : false;
  }

  canGiveDiscount(role: Role, discountPercent: number): boolean {
    return (role.canGiveDiscounts ?? false) && (role.maxDiscountPercent ?? 0) >= discountPercent;
  }

  requiresManagerApproval(role: Role): boolean {
    return role.requiresApproval ?? false;
  }

  async getRolesByLevel(minLevel: number): Promise<Role[]> {
    return this.roles().filter(r => r.level >= minLevel);
  }
}
