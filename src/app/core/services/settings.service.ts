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
  language: string;
  currency: string;
  taxRate: number;
  printerEnabled: boolean;
  offlineMode: boolean;
  theme: 'light' | 'dark' | 'auto';
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
    language: 'en',
    currency: 'ZMW',
    taxRate: 16,
    printerEnabled: true,
    offlineMode: true,
    theme: 'auto'
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
}
