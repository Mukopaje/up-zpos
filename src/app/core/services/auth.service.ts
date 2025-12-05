import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from './storage.service';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: any[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  expires: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private storage = inject(StorageService);
  private router = inject(Router);

  // Signals for reactive state
  private authState = signal<AuthState>({
    user: null,
    token: null,
    expires: null
  });

  // Computed values
  currentUser = computed(() => this.authState().user);
  isLoggedIn = computed(() => !!this.authState().user && !!this.authState().token);
  
  constructor() {
    this.initAuth();
  }

  private async initAuth() {
    const token = await this.storage.get<string>('token');
    const user = await this.storage.get<User>('user');
    const expires = await this.storage.get<number>('expires');

    if (token && user && expires) {
      this.authState.set({ user, token, expires });
    }
  }

  async login(username: string, password: string): Promise<boolean> {
    try {
      // TODO: Implement actual API call
      // For now, mock authentication
      const mockUser: User = {
        id: '1',
        username,
        email: `${username}@zpos.co.zm`,
        role: 'admin',
        permissions: []
      };

      const mockToken = 'mock-jwt-token';
      const expires = new Date().getTime() + (24 * 60 * 60 * 1000); // 24 hours

      // Save to storage
      await this.storage.set('user', mockUser);
      await this.storage.set('token', mockToken);
      await this.storage.set('expires', expires);

      // Update state
      this.authState.set({
        user: mockUser,
        token: mockToken,
        expires
      });

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  async logout(): Promise<void> {
    // Clear storage
    await this.storage.remove('user');
    await this.storage.remove('token');
    await this.storage.remove('expires');

    // Reset state
    this.authState.set({
      user: null,
      token: null,
      expires: null
    });
  }

  async isAuthenticated(): Promise<boolean> {
    const state = this.authState();
    
    if (!state.token || !state.expires) {
      return false;
    }

    // Check if token is expired
    if (new Date().getTime() > state.expires) {
      await this.logout();
      return false;
    }

    return true;
  }

  getToken(): string | null {
    return this.authState().token;
  }

  getUserPermissions(): any[] {
    return this.authState().user?.permissions || [];
  }

  hasPermission(permission: string): boolean {
    const permissions = this.getUserPermissions();
    return permissions.some((p: any) => p.name === permission);
  }
}
