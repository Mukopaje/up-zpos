import { Injectable, signal, inject } from '@angular/core';
import { StorageService } from './storage.service';

export interface AppMode {
  retail: boolean;
  category: boolean;
  restaurant: boolean;
  distributor: boolean;
  data?: any;
}

export interface AppSettings {
  mode: AppMode;
  businessName?: string;
  businessType?: string;
  defaultPosMode?: 'retail' | 'category' | 'hospitality';
  address?: string;
  phone?: string;
  email?: string;
  language: string;
  currency: string;
  taxRate: number;
  receiptHeader?: string;
  receiptFooter?: string;
  autoPrintReceipt?: boolean;
  showLogoOnReceipt?: boolean;
  printerEnabled: boolean;
  offlineMode: boolean;
  theme: 'light' | 'dark' | 'auto';
  // POS tile appearance settings
  categoryTileBackgroundColor?: string;
  productTileBackgroundColor?: string;
  // Post-payment UX
  showReceiptModalAfterPayment?: boolean;
  // Data safety
  autoBackupOnWorkperiodClose?: boolean;
  // How long to keep full transactional data locally (in days)
  transactionRetentionDays?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private storage = inject(StorageService);

  // Reactive settings state
  private settingsState = signal<AppSettings>({
    mode: {
      retail: false,
      category: true,
      restaurant: false,
      distributor: false
    },
    businessName: 'ZPOS',
    businessType: 'retail',
    defaultPosMode: 'category',
    address: '',
    phone: '',
    email: '',
    language: 'en',
    currency: 'ZMW',
    taxRate: 16,
    receiptHeader: 'Thank you for your purchase!',
    receiptFooter: 'Thank you! Call again.',
    autoPrintReceipt: false,
    showLogoOnReceipt: true,
    printerEnabled: true,
    offlineMode: true,
    theme: 'auto',
    categoryTileBackgroundColor: '#FF9800',
    productTileBackgroundColor: '#4CAF50',
    showReceiptModalAfterPayment: true,
    autoBackupOnWorkperiodClose: true,
    transactionRetentionDays: 365
  });

  // Public signals
  settings = this.settingsState.asReadonly();

  constructor() {
    this.loadSettings();
  }

  private async loadSettings(): Promise<void> {
    const saved = await this.storage.get<AppSettings>('app-settings');
    if (saved) {
      this.settingsState.set(saved);
    }
  }

  async updateSettings(updates: Partial<AppSettings>): Promise<void> {
    const current = this.settingsState();
    const updated = { ...current, ...updates };
    
    this.settingsState.set(updated);
    await this.storage.set('app-settings', updated);
  }

  async changeMode(mode: keyof AppMode): Promise<void> {
    const current = this.settingsState();
    const newMode: AppMode = {
      retail: mode === 'retail',
      category: mode === 'category',
      restaurant: mode === 'restaurant',
      distributor: mode === 'distributor',
      data: current.mode.data
    };

    await this.updateSettings({ mode: newMode });
  }

  getMode(): AppMode {
    return this.settingsState().mode;
  }

  async setTheme(theme: 'light' | 'dark' | 'auto'): Promise<void> {
    await this.updateSettings({ theme });
    this.applyTheme(theme);
  }

  private applyTheme(theme: 'light' | 'dark' | 'auto'): void {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    
    if (theme === 'auto') {
      document.body.classList.toggle('dark', prefersDark.matches);
    } else {
      document.body.classList.toggle('dark', theme === 'dark');
    }
  }

  /**
   * Get a specific setting by key
   */
  async get(key: string): Promise<any> {
    return await this.storage.get(key);
  }

  /**
   * Set a specific setting by key
   */
  async set(key: string, value: any): Promise<void> {
    await this.storage.set(key, value);
  }
}
