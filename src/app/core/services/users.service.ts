import { Injectable, signal, inject, computed } from '@angular/core';
import { DbService } from './db.service';
import { User } from '../../models';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private db = inject(DbService);

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
      const result = await this.db.query<User>({
        selector: { type: 'user' },
        sort: [{ firstName: 'asc' }]
      });

      const users = 'docs' in result ? result.docs : result;
      this.users.set(users as User[]);
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

    await this.db.put(newUser);
    await this.loadUsers();
    return newUser;
  }

  async updateUser(user: User): Promise<void> {
    const updated = {
      ...user,
      updatedAt: Date.now()
    };

    await this.db.put(updated);
    await this.loadUsers();
  }

  async deleteUser(user: User): Promise<void> {
    // Fetch latest version to get current _rev
    const latest = await this.db.get<User>(user._id);
    if (latest && latest._rev) {
      await this.db.delete(latest as any);
      await this.loadUsers();
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      return await this.db.get<User>(id);
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const result = await this.db.query<User>({
        selector: { 
          type: 'user',
          username: username 
        },
        limit: 1
      });

      const users = 'docs' in result ? result.docs : result;
      return users.length > 0 ? users[0] : null;
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
}
