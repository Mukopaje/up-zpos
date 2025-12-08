import { Injectable, inject } from '@angular/core';
import { DbService } from './db.service';
import { RolesService } from './roles.service';
import { TerminalsService } from './terminals.service';
import { Role, Terminal, User } from '../../models';

@Injectable({
  providedIn: 'root'
})
export class InitDataService {
  private db = inject(DbService);
  private rolesService = inject(RolesService);
  private terminalsService = inject(TerminalsService);

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
    try {
      const result = await this.db.get('init_status');
      return !!(result && (result as any).initialized);
    } catch {
      return false;
    }
  }

  private async markInitialized(): Promise<void> {
    await this.db.put({
      _id: 'init_status',
      type: 'config',
      initialized: true,
      timestamp: Date.now()
    });
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

    // Check if user already exists
    try {
      const existing = await this.db.find({
        selector: { type: 'user', username: 'admin' }
      });
      if (existing && existing.length > 0) {
        console.log('Test user already exists');
        return;
      }
    } catch (error) {
      console.log('No existing test user found, creating...');
    }

    const testUser: User = {
      _id: `user_admin_${Date.now()}`,
      type: 'user',
      username: 'admin',
      pin: 'hashed_1234', // Default PIN is 1234
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@zpos.com',
      roleId: adminRole._id,
      role: 'admin',
      permissions: [],
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    try {
      await this.db.put(testUser);
      console.log('Created test user: admin (PIN: 1234)');
    } catch (error) {
      console.error('Error creating test user:', error);
    }
  }

  private async initializeTestTerminal(): Promise<void> {
    console.log('Creating test terminal...');

    // Check if terminal already exists
    try {
      const existing = await this.db.find({
        selector: { type: 'terminal', name: 'Main Counter' }
      });
      if (existing && existing.length > 0) {
        console.log('Test terminal already exists');
        return;
      }
    } catch (error) {
      console.log('No existing test terminal found, creating...');
    }

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
      // Delete init status
      try {
        const initDoc = await this.db.get('init_status') as any;
        if (initDoc?._id) {
          await this.db.delete(initDoc._id);
        }
      } catch (error) {
        console.log('No init status to delete');
      }

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
