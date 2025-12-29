import { Injectable, inject, signal } from '@angular/core';
import { Terminal } from '../../models';
import { SqliteService, TerminalRow } from './sqlite.service';

@Injectable({
  providedIn: 'root'
})
export class TerminalsService {
  private sqlite = inject(SqliteService);
  
  terminals = signal<Terminal[]>([]);
  currentTerminal = signal<Terminal | null>(null);
  loading = signal(false);
  
  async loadTerminals(): Promise<void> {
    this.loading.set(true);
    try {
      const rows = await this.sqlite.getTerminals();
      const terminals = rows.map(r => this.mapRowToTerminal(r));
      this.terminals.set(terminals);
    } catch (error) {
      console.error('Error loading terminals:', error);
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  async getTerminal(id: string): Promise<Terminal | undefined> {
    try {
      const row = await this.sqlite.getTerminalById(id);
      return row ? this.mapRowToTerminal(row) : undefined;
    } catch (error) {
      console.error('Error getting terminal:', error);
      return undefined;
    }
  }

  async registerTerminal(
    terminal: Omit<Terminal, '_id' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ): Promise<Terminal> {
    const newTerminal: Terminal = {
      ...terminal,
      _id: `terminal_${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'system', // Should be current user
      online: true,
      lastPing: Date.now()
    };
    
    try {
      await this.sqlite.addTerminal(this.mapTerminalToRow(newTerminal));
      await this.loadTerminals();
      return newTerminal;
    } catch (error) {
      console.error('Error registering terminal:', error);
      throw error;
    }
  }

  async updateTerminal(terminal: Terminal): Promise<void> {
    try {
      const updated: Terminal = {
        ...terminal,
        updatedAt: Date.now()
      };

      await this.sqlite.updateTerminal(updated._id, this.mapTerminalToRow(updated));
      await this.loadTerminals();
    } catch (error) {
      console.error('Error updating terminal:', error);
      throw error;
    }
  }

  async deleteTerminal(id: string): Promise<void> {
    try {
      await this.sqlite.deleteTerminal(id);
      await this.loadTerminals();
    } catch (error) {
      console.error('Error deleting terminal:', error);
      throw error;
    }
  }

  async setCurrentTerminal(terminalId: string): Promise<void> {
    const terminal = await this.getTerminal(terminalId);
    if (terminal) {
      this.currentTerminal.set(terminal);
      localStorage.setItem('currentTerminalId', terminalId);
      await this.pingTerminal(terminalId);
    }
  }

  async pingTerminal(terminalId: string): Promise<void> {
    try {
      const terminal = await this.getTerminal(terminalId);
      if (terminal) {
        terminal.online = true;
        terminal.lastPing = Date.now();
        await this.updateTerminal(terminal);
      }
    } catch (error) {
      console.error('Error pinging terminal:', error);
    }
  }

  getCurrentTerminal(): Terminal | null {
    return this.currentTerminal();
  }

  async loadCurrentTerminal(): Promise<void> {
    const terminalId = localStorage.getItem('currentTerminalId');
    if (terminalId) {
      await this.setCurrentTerminal(terminalId);
    }
  }

  getTerminalsByMode(mode: 'retail' | 'category' | 'hospitality'): Terminal[] {
    return this.terminals().filter(t => t.posMode === mode && t.active);
  }

  getTerminalsByLocation(location: string): Terminal[] {
    return this.terminals().filter(t => t.location === location && t.active);
  }

  isHospitalityTerminal(terminal: Terminal): boolean {
    return terminal.posMode === 'hospitality' && terminal.hospitalityConfig !== undefined;
  }

  getKitchenPrinters(terminal: Terminal, category?: string): string[] {
    if (!this.isHospitalityTerminal(terminal) || !terminal.hospitalityConfig) {
      return [];
    }
    
    const printers = terminal.hospitalityConfig.printers.kitchen;
    if (!printers) return [];
    
    if (category && printers[category]) {
      return [printers[category]];
    }
    
    return Object.values(printers);
  }

  getReceiptPrinter(terminal: Terminal): string | undefined {
    if (terminal.posMode === 'hospitality' && terminal.hospitalityConfig) {
      return terminal.hospitalityConfig.printers.receipt;
    }
    return terminal.printerAddress;
  }

  private mapRowToTerminal(row: TerminalRow): Terminal {
    const hospitalityConfig = row.hospitality_config
      ? JSON.parse(row.hospitality_config)
      : undefined;

    const createdAt = row.created_at ? Date.parse(row.created_at) : Date.now();
    const updatedAt = row.updated_at ? Date.parse(row.updated_at) : createdAt;

    const terminal: Terminal = {
      _id: row.id!,
      type: 'terminal',
      name: row.name,
      code: row.code,
      terminalType: row.terminal_type as any,
      location: row.location,
      posMode: row.pos_mode as any,
      hospitalityConfig,
      printerAddress: row.printer_address,
      active: row.active === undefined ? true : row.active === 1,
      online: row.online === 1,
      lastPing: row.last_ping ? Date.parse(row.last_ping) : undefined,
      createdAt,
      updatedAt,
      createdBy: 'system'
    };

    // If extra metadata was stored inside hospitalityConfig.meta, surface it
    if (hospitalityConfig && hospitalityConfig.meta) {
      terminal.ipAddress = hospitalityConfig.meta.ipAddress;
      terminal.macAddress = hospitalityConfig.meta.macAddress;
      terminal.deviceInfo = hospitalityConfig.meta.deviceInfo;
      terminal.createdBy = hospitalityConfig.meta.createdBy ?? terminal.createdBy;
    }

    return terminal;
  }

  private mapTerminalToRow(terminal: Terminal): TerminalRow {
    // Preserve existing hospitalityConfig and also tuck away extra metadata
    const hospitalityConfig: any = terminal.hospitalityConfig
      ? { ...terminal.hospitalityConfig }
      : undefined;

    if (hospitalityConfig) {
      hospitalityConfig.meta = {
        ipAddress: terminal.ipAddress,
        macAddress: terminal.macAddress,
        deviceInfo: terminal.deviceInfo,
        createdBy: terminal.createdBy,
      };
    }

    return {
      id: terminal._id,
      name: terminal.name,
      code: terminal.code,
      terminal_type: terminal.terminalType,
      location: terminal.location,
      pos_mode: terminal.posMode,
      hospitality_config: hospitalityConfig ? JSON.stringify(hospitalityConfig) : null as any,
      printer_address: terminal.printerAddress,
      active: terminal.active === false ? 0 : 1,
      online: terminal.online ? 1 : 0,
      last_ping: terminal.lastPing ? new Date(terminal.lastPing).toISOString() : null as any,
      created_at: new Date(terminal.createdAt).toISOString(),
      updated_at: new Date(terminal.updatedAt).toISOString()
    };
  }
}
