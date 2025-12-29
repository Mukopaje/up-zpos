import { Injectable, inject, signal } from '@angular/core';
import { Waiter } from '../../models';
import { SqliteService, WaiterRow } from './sqlite.service';

@Injectable({
  providedIn: 'root'
})
export class WaitersService {
  private sqlite = inject(SqliteService);
  
  waiters = signal<Waiter[]>([]);
  loading = signal(false);
  
  async loadWaiters(): Promise<void> {
    this.loading.set(true);
    try {
      const rows = await this.sqlite.getWaiters();
      const waiters = rows.map(r => this.mapRowToWaiter(r));
      this.waiters.set(waiters);
    } catch (error) {
      console.error('Error loading waiters:', error);
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  async getWaiter(id: string): Promise<Waiter | undefined> {
    try {
      const row = await this.sqlite.getWaiterById(id);
      return row ? this.mapRowToWaiter(row) : undefined;
    } catch (error) {
      console.error('Error getting waiter:', error);
      return undefined;
    }
  }

  async createWaiter(waiter: Omit<Waiter, '_id' | 'createdAt' | 'updatedAt' | 'currentTables'>): Promise<Waiter> {
    const newWaiter: Waiter = {
      ...waiter,
      _id: `waiter_${Date.now()}`,
      currentTables: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    try {
      await this.sqlite.addWaiter(this.mapWaiterToRow(newWaiter));
      await this.loadWaiters();
      return newWaiter;
    } catch (error) {
      console.error('Error creating waiter:', error);
      throw error;
    }
  }

  async updateWaiter(waiter: Waiter): Promise<void> {
    try {
      const updated: Waiter = {
        ...waiter,
        updatedAt: Date.now()
      };

      await this.sqlite.updateWaiter(updated._id, this.mapWaiterToRow(updated));
      await this.loadWaiters();
    } catch (error) {
      console.error('Error updating waiter:', error);
      throw error;
    }
  }

  async deleteWaiter(id: string): Promise<void> {
    try {
      await this.sqlite.deleteWaiter(id);
      await this.loadWaiters();
    } catch (error) {
      console.error('Error deleting waiter:', error);
      throw error;
    }
  }

  async assignTable(waiterId: string, tableId: string): Promise<void> {
    const waiter = await this.getWaiter(waiterId);
    if (waiter) {
      if (!waiter.currentTables.includes(tableId)) {
        waiter.currentTables.push(tableId);
        await this.updateWaiter(waiter);
      }
    }
  }

  async unassignTable(waiterId: string, tableId: string): Promise<void> {
    const waiter = await this.getWaiter(waiterId);
    if (waiter) {
      waiter.currentTables = waiter.currentTables.filter(t => t !== tableId);
      await this.updateWaiter(waiter);
    }
  }

  async updateStats(waiterId: string, orderAmount: number): Promise<void> {
    const waiter = await this.getWaiter(waiterId);
    if (waiter) {
      if (!waiter.stats) {
        waiter.stats = {
          ordersToday: 0,
          salesTotal: 0,
          averageOrderValue: 0
        };
      }
      
      waiter.stats.ordersToday += 1;
      waiter.stats.salesTotal += orderAmount;
      waiter.stats.averageOrderValue = waiter.stats.salesTotal / waiter.stats.ordersToday;
      
      await this.updateWaiter(waiter);
    }
  }

  getActiveWaiters(): Waiter[] {
    return this.waiters().filter(w => w.active);
  }

  getWaitersBySection(section: string): Waiter[] {
    return this.waiters().filter(w => w.section === section && w.active);
  }

  getAvailableWaiters(): Waiter[] {
    // Waiters with no current tables or less than 5 tables
    return this.waiters().filter(w => w.active && w.currentTables.length < 5);
  }

  private mapRowToWaiter(row: WaiterRow): Waiter {
    const currentTables: string[] = row.current_tables
      ? JSON.parse(row.current_tables)
      : [];

    const stats = row.stats ? JSON.parse(row.stats) : undefined;

    const createdAt = row.created_at ? Date.parse(row.created_at) : Date.now();
    const updatedAt = row.updated_at ? Date.parse(row.updated_at) : createdAt;

    return {
      _id: row.id!,
      type: 'waiter',
      userId: row.user_id,
      name: row.name,
      code: row.code || undefined,
      section: row.section || undefined,
      active: row.active === undefined ? true : row.active === 1,
      currentTables,
      stats,
      createdAt,
      updatedAt
    };
  }

  private mapWaiterToRow(waiter: Waiter): WaiterRow {
    return {
      id: waiter._id,
      user_id: waiter.userId,
      name: waiter.name,
      code: waiter.code,
      section: waiter.section,
      active: waiter.active === false ? 0 : 1,
      current_tables: JSON.stringify(waiter.currentTables || []),
      stats: waiter.stats ? JSON.stringify(waiter.stats) : null as any,
      created_at: new Date(waiter.createdAt).toISOString(),
      updated_at: new Date(waiter.updatedAt).toISOString()
    };
  }
}
