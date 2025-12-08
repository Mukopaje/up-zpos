import { Injectable, inject, signal } from '@angular/core';
import { Waiter } from '../../models';
import { DbService } from './db.service';

@Injectable({
  providedIn: 'root'
})
export class WaitersService {
  private db = inject(DbService);
  
  waiters = signal<Waiter[]>([]);
  loading = signal(false);
  
  async loadWaiters(): Promise<void> {
    this.loading.set(true);
    try {
      const waiters = await this.db.find<Waiter>({
        type: 'waiter'
      });
      
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
      const doc = await this.db.get<Waiter>(id);
      return doc && doc.type === 'waiter' ? doc : undefined;
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
      await this.db.put(newWaiter);
      await this.loadWaiters();
      return newWaiter;
    } catch (error) {
      console.error('Error creating waiter:', error);
      throw error;
    }
  }

  async updateWaiter(waiter: Waiter): Promise<void> {
    try {
      const existing: any = await this.db.get(waiter._id);
      if (!existing) throw new Error('Waiter not found');
      
      const updated = {
        ...waiter,
        _rev: existing._rev,
        updatedAt: Date.now()
      };
      
      await this.db.put(updated);
      await this.loadWaiters();
    } catch (error) {
      console.error('Error updating waiter:', error);
      throw error;
    }
  }

  async deleteWaiter(id: string): Promise<void> {
    try {
      const doc = await this.db.get(id);
      if (!doc) throw new Error('Waiter not found');
      
      await this.db.delete(doc as any);
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
}
