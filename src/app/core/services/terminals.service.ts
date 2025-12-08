import { Injectable, inject, signal } from '@angular/core';
import { Terminal } from '../../models';
import { DbService } from './db.service';

@Injectable({
  providedIn: 'root'
})
export class TerminalsService {
  private db = inject(DbService);
  
  terminals = signal<Terminal[]>([]);
  currentTerminal = signal<Terminal | null>(null);
  loading = signal(false);
  
  async loadTerminals(): Promise<void> {
    this.loading.set(true);
    try {
      const terminals = await this.db.find<Terminal>({
        type: 'terminal'
      });
      
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
      const doc = await this.db.get<Terminal>(id);
      return doc && doc.type === 'terminal' ? doc : undefined;
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
      await this.db.put(newTerminal);
      await this.loadTerminals();
      return newTerminal;
    } catch (error) {
      console.error('Error registering terminal:', error);
      throw error;
    }
  }

  async updateTerminal(terminal: Terminal): Promise<void> {
    try {
      const existing: any = await this.db.get(terminal._id);
      if (!existing) throw new Error('Terminal not found');
      
      const updated = {
        ...terminal,
        _rev: existing._rev,
        updatedAt: Date.now()
      };
      
      await this.db.put(updated);
      await this.loadTerminals();
    } catch (error) {
      console.error('Error updating terminal:', error);
      throw error;
    }
  }

  async deleteTerminal(id: string): Promise<void> {
    try {
      const doc = await this.db.get(id);
      if (!doc) throw new Error('Terminal not found');
      
      await this.db.delete(doc as any);
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
}
