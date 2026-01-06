import { Injectable, inject, signal, computed } from '@angular/core';
import { SqliteService, WorkperiodRow } from './sqlite.service';
import { AuthService } from './auth.service';
import { SettingsService } from './settings.service';
import { SyncService } from './sync.service';

@Injectable({
  providedIn: 'root'
})
export class WorkperiodsService {
  private sqlite = inject(SqliteService);
  private auth = inject(AuthService);
  private settings = inject(SettingsService);
  private sync = inject(SyncService);

  currentWorkperiod = signal<WorkperiodRow | null>(null);
  recentWorkperiods = signal<WorkperiodRow[]>([]);
  loading = signal<boolean>(false);

  hasOpenWorkperiod = computed(() => !!this.currentWorkperiod());

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      await this.sqlite.ensureInitialized();
      const [open, recent] = await Promise.all([
        this.sqlite.getOpenWorkperiod(),
        this.sqlite.getRecentWorkperiods(20)
      ]);
      this.currentWorkperiod.set(open);
      this.recentWorkperiods.set(recent);
    } catch (error) {
      console.error('Error loading workperiods:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async openWorkperiod(openingNotes?: string): Promise<WorkperiodRow | null> {
    await this.sqlite.ensureInitialized();

    // If one is already open, just return it
    const existing = await this.sqlite.getOpenWorkperiod();
    if (existing) {
      this.currentWorkperiod.set(existing);
      return existing;
    }

    const user = this.auth.currentUser();
    const openedBy = user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || user._id
      : 'Unknown';

    const terminal = this.auth.currentTerminal?.();
    const terminalId = terminal?._id || null;

    const id = await this.sqlite.addWorkperiod({
      opened_by: openedBy,
      opening_notes: openingNotes || null,
      open_terminal_id: terminalId,
      name: undefined
    });

    const open = await this.sqlite.getOpenWorkperiod();
    await this.refreshRecent();
    this.currentWorkperiod.set(open);
    return open;
  }

  async closeCurrentWorkperiod(closingNotes?: string): Promise<void> {
    await this.sqlite.ensureInitialized();

    const current = await this.sqlite.getOpenWorkperiod();
    if (!current || !current.id) {
      this.currentWorkperiod.set(null);
      return;
    }

    const user = this.auth.currentUser();
    const closedBy = user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || user._id
      : 'Unknown';

    const terminal = this.auth.currentTerminal?.();
    const terminalId = terminal?._id || null;

    await this.sqlite.closeWorkperiod(current.id, {
      closed_by: closedBy,
      closing_notes: closingNotes || null,
      close_terminal_id: terminalId
    });

    this.currentWorkperiod.set(null);
    await this.refreshRecent();

    // Auto backup/sync at end of workperiod if enabled
    try {
      const appSettings = this.settings.settings();
      const autoBackup = appSettings.autoBackupOnWorkperiodClose ?? true;

      if (autoBackup) {
        await this.sync.syncToCloud();
      }
    } catch (error) {
      console.error('Auto backup after workperiod close failed:', error);
    }
  }

  async refreshRecent(limit: number = 20): Promise<void> {
    try {
      await this.sqlite.ensureInitialized();
      const recent = await this.sqlite.getRecentWorkperiods(limit);
      this.recentWorkperiods.set(recent);
    } catch (error) {
      console.error('Error refreshing recent workperiods:', error);
    }
  }
}
