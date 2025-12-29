import { Injectable, inject } from '@angular/core';
import { RolesService } from './roles.service';
import { TerminalsService } from './terminals.service';
import { UsersService } from './users.service';
import { StorageService } from './storage.service';
import { Role, Terminal } from '../../models';

@Injectable({
  providedIn: 'root'
})
export class InitDataService {
  private rolesService = inject(RolesService);
  private terminalsService = inject(TerminalsService);
  private usersService = inject(UsersService);
  private storage = inject(StorageService);

  async initializeDefaultData(): Promise<void> {
    try {
      console.log('Checking initialization status...');

      // Check if already initialized
      const initialized = await this.isInitialized();
      if (initialized) {
        console.log('Data already initialized');
        // Still load roles and terminals into memory
        await this.rolesService.loadRoles();
        await this.terminalsService.loadTerminals();
        return;
      }

      console.log('Initializing default data...');

      // Initialize default roles (they auto-create via RolesService)
      await this.rolesService.loadRoles();
      
      // Wait a bit for roles to be created
      await new Promise(resolve => setTimeout(resolve, 500));

      // Initialize default test user
      await this.initializeTestUser();

      // Initialize default terminal
      await this.initializeTestTerminal();

      // Mark as initialized
      await this.markInitialized();

      console.log('Default data initialization complete');
    } catch (error) {
      console.error('Error initializing default data:', error);
      throw error;
    }
  }

  private async isInitialized(): Promise<boolean> {
    const flag = await this.storage.get('data_initialized');
    return !!flag;
  }

  private async markInitialized(): Promise<void> {
    await this.storage.set('data_initialized', true);
  }

  private async initializeTestUser(): Promise<void> {
    console.log('Creating test user...');

    // Get admin role
    const roles = this.rolesService.roles();
    const adminRole = roles.find(r => r.name === 'Admin');
    
    if (!adminRole) {
      console.error('Admin role not found, skipping user creation');
      return;
    }

    try {
      const existing = await this.usersService.getUserByUsername('admin');
      if (existing) {
        console.log('Test user already exists');
        return;
      }

      await this.usersService.createUser({
        tenantId: 'default-tenant',
        username: 'admin',
        email: 'admin@zpos.com',
        firstName: 'System',
        lastName: 'Administrator',
        roleId: adminRole._id,
        role: 'admin',
        permissions: [],
        pin: '1234',
        active: true
      });

      console.log('Created test user: admin (PIN: 1234)');
    } catch (error) {
      console.error('Error creating test user:', error);
    }
  }

  private async initializeTestTerminal(): Promise<void> {
    console.log('Creating test terminal...');

    const testTerminal: Terminal = {
      _id: `terminal_main_${Date.now()}`,
      type: 'terminal',
      name: 'Main Counter',
      code: 'POS1',
      terminalType: 'pos',
      location: 'Front Counter',
      posMode: 'category',
      active: true,
      lastPing: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'system'
    };

    try {
      // If a terminal with the same code/name already exists, skip creation
      await this.terminalsService.loadTerminals();
      const existing = this.terminalsService.terminals()
        .find(t => t.name === 'Main Counter' || t.code === 'POS1');
      if (existing) {
        console.log('Test terminal already exists');
        return;
      }

      await this.terminalsService.registerTerminal(testTerminal);
      console.log('Created test terminal: Main Counter');
    } catch (error) {
      console.error('Error creating test terminal:', error);
    }
  }

  async resetData(): Promise<void> {
    const confirm = window.confirm(
      'This will delete ALL data and reinitialize. This cannot be undone. Continue?'
    );

    if (!confirm) return;

    try {
      await this.storage.remove('data_initialized');
      // Reinitialize
      await this.initializeDefaultData();

      console.log('Data reset complete');
      alert('Data has been reset. Please refresh the page.');
    } catch (error) {
      console.error('Error resetting data:', error);
      alert('Error resetting data. Check console for details.');
    }
  }
}
