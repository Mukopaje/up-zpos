import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from './storage.service';
import { DbService } from './db.service';
import { RolesService } from './roles.service';
import { TerminalsService } from './terminals.service';
import { User, Role, Terminal, BusinessLicense } from '../../models';

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

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private storage = inject(StorageService);
  private router = inject(Router);
  private db = inject(DbService);
  private rolesService = inject(RolesService);
  private terminalsService = inject(TerminalsService);

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
        const user = await this.db.get<User>(userId);
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
    try {
      const licenseId = await this.storage.get<string>('licenseId');
      if (licenseId) {
        const license = await this.db.get<BusinessLicense>(licenseId);
        if (license && license.type === 'license') {
          // Check if license is still valid
          const now = Date.now();
          const isActivated = license.status === 'active' && license.expiresAt > now;
          
          this.licenseState.set({ license, isActivated });
        }
      }
    } catch (error) {
      console.error('Error loading license:', error);
    }
  }

  // Simple hash function for PINs (for demo - use bcrypt in production)
  private async hashPin(pin: string): Promise<string> {
    // In production, use a proper crypto library like bcrypt
    // For now, just add a simple prefix to show it's "hashed"
    return `hashed_${pin}`;
  }

  private async verifyPin(pin: string, hash: string): Promise<boolean> {
    // In production, use bcrypt.compare()
    // Support both hashed and plain text PINs for backward compatibility
    return hash === `hashed_${pin}` || hash === pin;
  }

  // License Management
  async hasActiveLicense(): Promise<boolean> {
    await this.initLicense();
    return this.licenseState().isActivated;
  }

  async getBusinessSettings(): Promise<{ businessName: string } | null> {
    const license = this.licenseState().license;
    return license ? { businessName: license.businessName } : null;
  }

  async activateLicense(email: string, password: string): Promise<boolean> {
    try {
      // TODO: Call cloud API to verify credentials and get license
      // For now, create a mock license
      const deviceId = await this.getDeviceId();
      
      // Mock API call - in production, this would validate against server
      const mockLicense: BusinessLicense = {
        _id: 'license-1',
        type: 'license',
        businessEmail: email,
        passwordHash: await this.hashPin(password), // Use proper password hashing
        businessName: 'Demo Business',
        licenseKey: 'DEMO-LICENSE-KEY',
        activatedAt: Date.now(),
        expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
        deviceId,
        status: 'active',
        maxUsers: 10,
        features: ['pos', 'inventory', 'reports', 'cloud-sync'],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Save to database
      await this.db.put(mockLicense);
      await this.storage.set('licenseId', mockLicense._id);

      // Update state
      this.licenseState.set({ license: mockLicense, isActivated: true });

      return true;
    } catch (error) {
      console.error('License activation error:', error);
      return false;
    }
  }

  async logoutLicense(): Promise<void> {
    const license = this.licenseState().license;
    if (license) {
      // Deactivate license
      license.status = 'suspended';
      await this.db.put(license);
    }

    await this.storage.remove('licenseId');
    this.licenseState.set({ license: null, isActivated: false });
    
    // Also logout user
    await this.logout();
  }

  private async getDeviceId(): Promise<string> {
    let deviceId = await this.storage.get<string>('deviceId');
    if (!deviceId) {
      deviceId = 'device-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      await this.storage.set('deviceId', deviceId);
    }
    return deviceId;
  }

  // PIN-based login (for POS users)
  async loginWithPin(pin: string): Promise<boolean> {
    try {
      // Find user by PIN
      const users = await this.db.find<User>({
        type: 'user'
      });
      
      // Find user with matching PIN (await the async verifyPin)
      let user: User | undefined;
      for (const u of users) {
        if (u.active && await this.verifyPin(pin, u.pin)) {
          user = u;
          break;
        }
      }
      
      if (!user) {
        return false;
      }
      
      // Load role
      const role = await this.rolesService.getRole(user.roleId);
      if (!role) {
        console.error('User role not found');
        return false;
      }

      const mockToken = 'mock-jwt-token-' + Date.now();
      const expires = new Date().getTime() + (12 * 60 * 60 * 1000); // 12 hours for PIN login

      // Save to storage
      await this.storage.set('userId', user._id);
      await this.storage.set('token', mockToken);
      await this.storage.set('expires', expires);
      
      // Update last login
      user.lastLogin = Date.now();
      await this.db.put(user);

      // Update state
      this.authState.set({
        user,
        role,
        terminal: null,
        token: mockToken,
        expires
      });

      return true;
    } catch (error) {
      console.error('PIN login error:', error);
      return false;
    }
  }

  async login(username: string, password: string, pin?: string): Promise<boolean> {
    try {
      // Find user by username or pin
      const users = await this.db.find<User>({
        type: 'user'
      });
      
      const user = users.find(u => u.username === username || (pin && u.pin === pin));
      
      if (!user || !user.active) {
        return false;
      }
      
      // TODO: Verify password hash
      // For now, accept any password for development
      
      // Load role
      const role = await this.rolesService.getRole(user.roleId);
      if (!role) {
        console.error('User role not found');
        return false;
      }

      const mockToken = 'mock-jwt-token';
      const expires = new Date().getTime() + (24 * 60 * 60 * 1000); // 24 hours

      // Save to storage
      await this.storage.set('userId', user._id);
      await this.storage.set('token', mockToken);
      await this.storage.set('expires', expires);
      
      // Update last login
      user.lastLogin = Date.now();
      await this.db.put(user);

      // Update state
      this.authState.set({
        user,
        role,
        terminal: null,
        token: mockToken,
        expires
      });

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
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

  async logout(): Promise<void> {
    // Clear storage
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

  // RBAC Methods
  hasPermission(module: string, action: string): boolean {
    const user = this.currentUser();
    const role = this.currentRole();
    
    if (!user || !role) return false;
    
    // Check user-specific permission overrides first
    const userPermission = user.permissions.find(p => p.module === module);
    if (userPermission) {
      return userPermission.actions.includes(action);
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
