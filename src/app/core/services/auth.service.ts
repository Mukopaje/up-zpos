import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { StorageService } from './storage.service';
import { RolesService } from './roles.service';
import { TerminalsService } from './terminals.service';
import { UsersService } from './users.service';
import { User, Role, Terminal, BusinessLicense } from '../../models';
import { environment } from '../../../environments/environment';

export interface AuthState {
  user: User | null;
  role: Role | null;
  terminal: Terminal | null;
  token: string | null;
  expires: number | null;
}

export interface LicenseState {
  license: BusinessLicense | null;
  isActivated: boolean;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

export interface LicenseValidationResponse {
  tenantId: string;
  businessName: string;
}

export interface RegisterTenantResponse {
  licenseKey: string;
  tenant: {
    id: string;
    businessName: string;
  };
  access_token: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

export interface RecoverLicenseResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private storage = inject(StorageService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private rolesService = inject(RolesService);
  private terminalsService = inject(TerminalsService);
  private usersService = inject(UsersService);
  
  private readonly API_URL = environment.apiUrl;

  // Signals for reactive state
  private authState = signal<AuthState>({
    user: null,
    role: null,
    terminal: null,
    token: null,
    expires: null
  });

  private licenseState = signal<LicenseState>({
    license: null,
    isActivated: false
  });

  // Track initialization status
  private initPromise: Promise<void>;
  private initialized = false;

  // Computed values
  currentUser = computed(() => this.authState().user);
  currentRole = computed(() => this.authState().role);
  currentTerminal = computed(() => this.authState().terminal);
  currentLicense = computed(() => this.licenseState().license);
  isLoggedIn = computed(() => !!this.authState().user && !!this.authState().token);
  isLicenseActive = computed(() => this.licenseState().isActivated);
  posMode = computed(() => {
    const terminal = this.authState().terminal;
    const user = this.authState().user;
    return terminal?.posMode || user?.posMode || 'category';
  });
  
  constructor() {
    this.initPromise = this.initialize();
  }

  private async initialize() {
    await Promise.all([this.initAuth(), this.initLicense()]);
    this.initialized = true;
  }

  // Wait for initialization to complete
  async waitForInit(): Promise<void> {
    await this.initPromise;
  }

  private async initAuth() {
    const token = await this.storage.get<string>('token');
    const userId = await this.storage.get<string>('userId');
    const terminalId = await this.storage.get<string>('terminalId');
    const expires = await this.storage.get<number>('expires');

    if (token && userId && expires) {
      // Load user from DB
      try {
        const user = await this.usersService.getUserById(userId);
        if (user && user.type === 'user') {
          // Load role
          const role = await this.rolesService.getRole(user.roleId);
          
          // Load terminal if available
          let terminal: Terminal | null = null;
          if (terminalId) {
            const t = await this.terminalsService.getTerminal(terminalId);
            if (t) terminal = t;
          }
          
          this.authState.set({ user, role: role || null, terminal, token, expires });
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
    }
  }

  private async initLicense() {
    // License persistence is now driven by backend + storage (tenantId/businessName)
    this.licenseState.set({ license: null, isActivated: await this.hasActiveLicense() });
  }

  /**
   * Hash password using Web Crypto API (secure in browser)
   */
  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  /**
   * Verify password against hash
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const passwordHash = await this.hashPassword(password);
    return passwordHash === hash;
  }

  /**
   * Hash PIN (simpler for 4-6 digit codes)
   */
  private async hashPin(pin: string): Promise<string> {
    return await this.hashPassword(pin);
  }

  /**
   * Verify PIN against hash
   */
  private async verifyPin(pin: string, hash: string): Promise<boolean> {
    return await this.verifyPassword(pin, hash);
  }

  // License Management
  async hasActiveLicense(): Promise<boolean> {
    // In new multi-tenant architecture, having a tenantId means license is validated
    const tenantId = await this.storage.get<string>('tenantId');
    return !!tenantId;
  }

  async getBusinessSettings(): Promise<{ businessName: string } | null> {
    // Prefer in-memory license state if it is ever populated
    const license = this.licenseState().license;
    if (license) {
      return { businessName: license.businessName };
    }

    // Fallback to persisted business name from storage (set during
    // license validation / tenant registration)
    const storedName = await this.storage.get<string>('businessName');
    return storedName ? { businessName: storedName } : null;
  }

  // Deprecated: Use registerTenant and validateLicense instead
  async activateLicense(email: string, password: string): Promise<boolean> {
    console.warn('activateLicense is deprecated. Use the new registration flow.');
    return false;
  }

  // Deprecated: Use logout instead
  async logoutLicense(): Promise<void> {
    console.warn('logoutLicense is deprecated. Use logout instead.');
    await this.logout();
  }

  /**
   * Validate license key and get tenant information
   * Step 1 of multi-tenant authentication
   */
  async validateLicense(licenseKey: string): Promise<LicenseValidationResponse | null> {
    try {
      const response = await firstValueFrom(
        this.http.post<LicenseValidationResponse>(`${this.API_URL}/auth/validate-license`, { licenseKey })
      );

      if (response.tenantId) {
        // Store tenant info for subsequent authentication
        await this.storage.set('tenantId', response.tenantId);
        await this.storage.set('businessName', response.businessName);
        return response;
      }
      return null;
    } catch (error) {
      console.error('License validation error:', error);
      return null;
    }
  }

  private extractBackendMessage(error: any): string {
    const httpError = error as HttpErrorResponse;

    if (httpError && httpError.error) {
      const payload = httpError.error as any;

      if (typeof payload === 'string') {
        return payload;
      }

      if (Array.isArray(payload.message)) {
        return payload.message.join(' ');
      }

      if (typeof payload.message === 'string') {
        return payload.message;
      }

      if (typeof payload.detail === 'string') {
        return payload.detail;
      }
    }

    if (httpError && typeof httpError.message === 'string') {
      return httpError.message;
    }

    if (error && typeof error.message === 'string') {
      return error.message;
    }

    return '';
  }

  private mapToFriendlyMessage(error: any): string {
    const original = this.extractBackendMessage(error) || '';
    const raw = original.toLowerCase();

    if ((raw.includes('duplicate key value') || raw.includes('already exists')) && raw.includes('email')) {
      return 'An account with this email already exists. Please log in instead, or reset your password if you have forgotten it.';
    }

    // If backend already provided a human-friendly message, surface it
    if (original) {
      return original;
    }

    return 'Something went wrong. Please try again.';
  }

  async recoverLicenseKey(ownerEmail: string, pin: string): Promise<RecoverLicenseResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<RecoverLicenseResponse>(`${this.API_URL}/auth/recover-license`, {
          ownerEmail,
          pin,
        })
      );

      return (
        response || {
          success: true,
          message:
            'If an account with this email and PIN exists, we have sent your license key to the registered owner email address.',
        }
      );
    } catch (error) {
      console.error('License recovery error:', error);
      return {
        success: false,
        message: this.mapToFriendlyMessage(error),
      };
    }
  }

  /**
   * PIN-based login with tenant context
   * Step 2 of multi-tenant authentication
   */
  async loginWithPin(pin: string, tenantId?: string): Promise<boolean> {
    try {
      // Get tenantId from parameter or storage
      const tenant = tenantId || await this.storage.get<string>('tenantId');
      
      if (!tenant) {
        console.error('No tenant context - validate license first');
        return false;
      }

      // Call backend validate-pin endpoint
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(`${this.API_URL}/auth/validate-pin`, { 
          tenantId: tenant, 
          pin 
        })
      );

      if (response.access_token && response.user) {
        console.log('PIN validation successful, saving auth data...');
        
        // Save tokens and tenant info
        await this.storage.set('token', response.access_token);
        await this.storage.set('tenantId', tenant);
        
        const expires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
        await this.storage.set('expires', expires);
        await this.storage.set('userId', response.user.id);

        // Map backend role to frontend role ID (backend: "admin", frontend: "role_admin")
        const roleMapping: Record<string, string> = {
          'admin': 'role_admin',
          'manager': 'role_manager',
          'cashier': 'role_cashier',
          'waiter': 'role_waiter',
          'kitchen': 'role_kitchen'
        };
        
        const mappedRoleId = roleMapping[response.user.role] || `role_${response.user.role}`;
        
        // Convert backend user format to local User model
        const user: User = {
          _id: response.user.id,
          type: 'user',
          tenantId: tenant,
          firstName: response.user.firstName,
          lastName: response.user.lastName,
          email: response.user.email,
          roleId: mappedRoleId,
          active: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastLogin: Date.now()
        };

        console.log('Saving user to local store:', user._id);
        const existingUser = await this.usersService.getUserById(user._id);
        if (existingUser) {
          await this.usersService.updateUser({ ...existingUser, ...user });
        } else {
          await this.usersService.createUser({
            tenantId: user.tenantId,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            email: user.email,
            phone: user.phone,
            roleId: user.roleId,
            role: user.role,
            permissions: user.permissions,
            pin: user.pin,
            active: user.active,
            allowedTerminals: user.allowedTerminals,
            defaultTerminal: user.defaultTerminal,
            posMode: user.posMode,
            language: user.language,
            avatar: user.avatar,
            passwordHash: user.passwordHash,
            pinHash: user.pinHash
          });
        }

        // Load or create role
        console.log('Loading role:', user.roleId);
        let role = await this.rolesService.getRole(user.roleId);
        if (!role) {
          console.log('Role not found, initializing default roles');
          // Initialize default roles if they don't exist
          await this.rolesService.initializeDefaultRoles();
          // Try loading the role again
          role = await this.rolesService.getRole(user.roleId);
          
          if (!role) {
            console.error('Failed to load role after initialization:', user.roleId);
            // This shouldn't happen, but create a fallback
            throw new Error(`Role ${user.roleId} not found`);
          }
          console.log('Role loaded after initialization:', role.name);
        } else {
          console.log('Role loaded:', role.name);
        }

        // Update state
        console.log('Updating auth state');
        this.authState.set({
          user,
          role: role || null,
          terminal: null,
          token: response.access_token,
          expires
        });

        console.log('Login completed successfully');
        return true;
      }
      console.log('No access token or user in response');
      return false;
    } catch (error) {
      console.error('PIN login error:', error);
      return false;
    }
  }

  /**
   * Register a new tenant (business)
   * Creates tenant account, generates license key, and creates admin user
   */
  async registerTenant(data: {
    businessName: string;
    ownerEmail: string;
    ownerPhone?: string;
    adminPin: string;
    adminFirstName: string;
    adminLastName: string;
  }): Promise<RegisterTenantResponse | null> {
    try {
      const response = await firstValueFrom(
        this.http.post<RegisterTenantResponse>(`${this.API_URL}/auth/register`, data)
      );

      if (response.licenseKey && response.access_token) {
        // Store license and tenant info
        await this.storage.set('licenseKey', response.licenseKey);
        await this.storage.set('tenantId', response.tenant.id);
        await this.storage.set('businessName', response.tenant.businessName);
        await this.storage.set('token', response.access_token);
        
        const expires = Date.now() + (24 * 60 * 60 * 1000);
        await this.storage.set('expires', expires);
        await this.storage.set('userId', response.user.id);

        // Map backend role to frontend role ID
        const roleMapping: Record<string, string> = {
          'admin': 'role_admin',
          'manager': 'role_manager',
          'cashier': 'role_cashier',
          'waiter': 'role_waiter',
          'kitchen': 'role_kitchen'
        };
        
        const mappedRoleId = roleMapping[response.user.role] || `role_${response.user.role}`;

        // Convert to local User model
        const user: User = {
          _id: response.user.id,
          type: 'user',
          tenantId: response.tenant.id,
          firstName: response.user.firstName,
          lastName: response.user.lastName,
          email: response.user.email,
          roleId: mappedRoleId,
          active: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        const existingUser = await this.usersService.getUserById(user._id);
        if (existingUser) {
          await this.usersService.updateUser({ ...existingUser, ...user });
        } else {
          await this.usersService.createUser({
            tenantId: user.tenantId,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            email: user.email,
            phone: user.phone,
            roleId: user.roleId,
            role: user.role,
            permissions: user.permissions,
            pin: user.pin,
            active: user.active,
            allowedTerminals: user.allowedTerminals,
            defaultTerminal: user.defaultTerminal,
            posMode: user.posMode,
            language: user.language,
            avatar: user.avatar,
            passwordHash: user.passwordHash,
            pinHash: user.pinHash
          });
        }
        
        // Initialize default roles
        await this.rolesService.initializeDefaultRoles();
        
        // Load the admin role
        const role = await this.rolesService.getRole(user.roleId);
        if (!role) {
          throw new Error('Failed to load admin role after initialization');
        }

        this.authState.set({
          user,
          role,
          terminal: null,
          token: response.access_token,
          expires
        });

        return response;
      }
      return null;
    } catch (error) {
      console.error('Tenant registration error:', error);
      const message = this.mapToFriendlyMessage(error);
      throw new Error(message);
    }
  }

  async selectTerminal(terminalId: string): Promise<boolean> {
    const user = this.currentUser();
    if (!user) return false;
    
    // Check if user can access this terminal
    if (user.allowedTerminals && !user.allowedTerminals.includes(terminalId)) {
      console.error('User not allowed to access this terminal');
      return false;
    }
    
    const terminal = await this.terminalsService.getTerminal(terminalId);
    if (!terminal || !terminal.active) {
      return false;
    }
    
    // Save terminal selection
    await this.storage.set('terminalId', terminalId);
    this.authState.update(state => ({ ...state, terminal }));
    
    // Ping terminal
    await this.terminalsService.pingTerminal(terminalId);
    
    return true;
  }

  /**
   * Create new user within current tenant
   * Requires admin privileges
   */
  async createUser(userData: {
    firstName: string;
    lastName: string;
    email: string;
    pin: string;
    role?: string;
  }): Promise<{ success: boolean; message?: string; userId?: string }> {
    try {
      const currentUser = this.currentUser();
      const tenantId = await this.storage.get<string>('tenantId');
      
      if (!currentUser || !tenantId) {
        return { success: false, message: 'Not authenticated or no tenant context' };
      }

      const response = await firstValueFrom(
        this.http.post<{ access_token: string; user: any }>(`${this.API_URL}/auth/create-user`, userData)
      );

      if (response.user) {
        // Save new user to local DB
        const newUser: User = {
          _id: response.user.id,
          type: 'user',
          tenantId,
          firstName: response.user.firstName,
          lastName: response.user.lastName,
          email: response.user.email,
          roleId: response.user.role,
          active: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        const existingUser = await this.usersService.getUserById(newUser._id);
        if (existingUser) {
          await this.usersService.updateUser({ ...existingUser, ...newUser });
        } else {
          await this.usersService.createUser({
            tenantId: newUser.tenantId,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            username: newUser.username,
            email: newUser.email,
            phone: newUser.phone,
            roleId: newUser.roleId,
            role: newUser.role,
            permissions: newUser.permissions,
            pin: newUser.pin,
            active: newUser.active,
            allowedTerminals: newUser.allowedTerminals,
            defaultTerminal: newUser.defaultTerminal,
            posMode: newUser.posMode,
            language: newUser.language,
            avatar: newUser.avatar,
            passwordHash: newUser.passwordHash,
            pinHash: newUser.pinHash
          });
        }

        return {
          success: true,
          message: 'User created successfully',
          userId: newUser._id
        };
      }
      
      return { success: false, message: 'Failed to create user' };
    } catch (error: any) {
      console.error('User creation error:', error);
      return {
        success: false,
        message: this.mapToFriendlyMessage(error)
      };
    }
  }

  /**
   * Get current tenant ID
   */
  async getTenantId(): Promise<string | null> {
    return await this.storage.get<string>('tenantId');
  }

  /**
   * Get business name from tenant
   */
  async getBusinessName(): Promise<string | null> {
    return await this.storage.get<string>('businessName');
  }

  /**
   * Logout and clear all auth data
   * Note: Backend doesn't have logout endpoint yet
   */
  async logout(): Promise<void> {
    // Clear storage (keep tenantId and licenseKey for re-login)
    await this.storage.remove('userId');
    await this.storage.remove('token');
    await this.storage.remove('expires');
    await this.storage.remove('terminalId');

    // Reset state
    this.authState.set({
      user: null,
      role: null,
      terminal: null,
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

  async getTokenAsync(): Promise<string | null> {
    // First check in-memory state
    const memoryToken = this.authState().token;
    if (memoryToken) return memoryToken;
    
    // Fallback to storage (in case app just restarted)
    return await this.storage.get<string>('token');
  }

  // RBAC Methods
  hasPermission(module: string, action: string): boolean {
    const user = this.currentUser();
    const role = this.currentRole();
    
    if (!user || !role) return false;
    
    // Check user-specific permission overrides first
    if (user.permissions) {
      const userPermission = user.permissions.find(p => p.module === module);
      if (userPermission) {
        return userPermission.actions.includes(action);
      }
    }
    
    // Fall back to role permissions
    return this.rolesService.hasPermission(role, module, action);
  }

  canAccessModule(module: string): boolean {
    return this.hasPermission(module, 'view');
  }

  canEdit(module: string): boolean {
    return this.hasPermission(module, 'edit');
  }

  canCreate(module: string): boolean {
    return this.hasPermission(module, 'create');
  }

  canDelete(module: string): boolean {
    return this.hasPermission(module, 'delete');
  }

  canVoidTransactions(): boolean {
    const role = this.currentRole();
    return role?.canVoidTransactions ?? false;
  }

  canGiveDiscount(discountPercent: number): boolean {
    const role = this.currentRole();
    return role ? this.rolesService.canGiveDiscount(role, discountPercent) : false;
  }

  requiresManagerApproval(): boolean {
    const role = this.currentRole();
    return role ? this.rolesService.requiresManagerApproval(role) : true;
  }

  canAccessTerminal(terminalId: string): boolean {
    const user = this.currentUser();
    const role = this.currentRole();
    
    if (!user || !role) return false;
    
    // Admins and managers can access all terminals
    if (role.canAccessTerminals === 'all') return true;
    
    // Check if terminal is in user's allowed list
    return user.allowedTerminals?.includes(terminalId) ?? false;
  }

  isAdmin(): boolean {
    const role = this.currentRole();
    return role?.level === 100;
  }

  isManager(): boolean {
    const role = this.currentRole();
    return (role?.level ?? 0) >= 50;
  }

  getUserRole(): string {
    return this.currentRole()?.name ?? 'Unknown';
  }

  getUserLevel(): number {
    return this.currentRole()?.level ?? 0;
  }
}
