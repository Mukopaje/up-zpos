import { Injectable, signal, inject, computed } from '@angular/core';
import { User } from '../../models';
import { SqliteService, UserRow } from './sqlite.service';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private sqlite = inject(SqliteService);

  users = signal<User[]>([]);
  
  // Computed values
  activeUsers = computed(() => 
    this.users().filter(user => user.active)
  );

  constructor() {
    this.loadUsers();
  }

  async loadUsers() {
    try {
      await this.sqlite.ensureInitialized();
      const rows = await this.sqlite.getUsers();
      const users = rows.map(r => this.mapRowToUser(r));
      this.users.set(users);
    } catch (error) {
      console.error('Error loading users:', error);
      this.users.set([]);
    }
  }

  async createUser(user: Omit<User, '_id' | 'type' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const newUser: User = {
      ...user,
      _id: `user_${Date.now()}`,
      type: 'user',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await this.sqlite.ensureInitialized();
    await this.sqlite.addUser(this.mapUserToRow(newUser));
    await this.loadUsers();
    return newUser;
  }

  async updateUser(user: User): Promise<void> {
    const updated = {
      ...user,
      updatedAt: Date.now()
    };

    await this.sqlite.ensureInitialized();
    await this.sqlite.updateUser(updated._id, this.mapUserToRow(updated));
    await this.loadUsers();
  }

  async deleteUser(user: User): Promise<void> {
    await this.sqlite.ensureInitialized();
    await this.sqlite.deleteUser(user._id);
    await this.loadUsers();
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      await this.sqlite.ensureInitialized();
      const row = await this.sqlite.getUserById(id);
      return row ? this.mapRowToUser(row) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      await this.sqlite.ensureInitialized();
      const row = await this.sqlite.getUserByUsername(username);
      return row ? this.mapRowToUser(row) : null;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  }

  async validatePIN(username: string, pin: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (user && user.pin === pin) {
      // Update last login
      await this.updateUser({
        ...user,
        lastLogin: Date.now()
      });
      return user;
    }
    return null;
  }

  async getActiveUsersByTenant(tenantId: string): Promise<User[]> {
    try {
      await this.sqlite.ensureInitialized();
      const rows = await this.sqlite.getUsers();
      const users = rows
        .filter(row => row.tenant_id === tenantId && (row.active === undefined ? true : row.active === 1))
        .map(row => this.mapRowToUser(row));
      return users;
    } catch (error) {
      console.error('Error getting users by tenant:', error);
      return [];
    }
  }

  private mapRowToUser(row: UserRow): User {
    const permissions = row.permissions ? JSON.parse(row.permissions) : undefined;
    const allowedTerminals = row.allowed_terminals
      ? JSON.parse(row.allowed_terminals)
      : undefined;

    const createdAt = row.created_at ? Date.parse(row.created_at) : Date.now();
    const updatedAt = row.updated_at ? Date.parse(row.updated_at) : createdAt;
    const lastLogin = row.last_login ? Date.parse(row.last_login) : undefined;

    return {
      _id: row.id!,
      type: 'user',
      tenantId: row.tenant_id,
      username: row.username,
      passwordHash: row.password_hash,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      roleId: row.role_id,
      role: row.role,
      permissions,
      pin: row.pin,
      pinHash: row.pin_hash,
      active: row.active === undefined ? true : row.active === 1,
      allowedTerminals,
      defaultTerminal: row.default_terminal,
      posMode: row.pos_mode as any,
      language: row.language,
      avatar: row.avatar,
      phone: row.phone,
      createdAt,
      updatedAt,
      lastLogin
    };
  }

  private mapUserToRow(user: User): UserRow {
    return {
      id: user._id,
      tenant_id: user.tenantId,
      username: user.username,
      password_hash: user.passwordHash,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      role_id: user.roleId,
      role: user.role,
      permissions: user.permissions ? JSON.stringify(user.permissions) : undefined,
      pin: user.pin,
      pin_hash: user.pinHash,
      active: user.active === false ? 0 : 1,
      allowed_terminals: user.allowedTerminals ? JSON.stringify(user.allowedTerminals) : undefined,
      default_terminal: user.defaultTerminal,
      pos_mode: user.posMode,
      language: user.language,
      avatar: user.avatar,
      phone: user.phone,
      created_at: new Date(user.createdAt).toISOString(),
      updated_at: new Date(user.updatedAt).toISOString(),
      last_login: user.lastLogin ? new Date(user.lastLogin).toISOString() : undefined
    };
  }
}
