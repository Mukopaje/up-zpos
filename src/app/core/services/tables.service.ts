import { Injectable, inject, signal } from '@angular/core';
import { Table, TableSession, CartItem } from '../../models';
import { DbService } from './db.service';
import { WaitersService } from './waiters.service';

@Injectable({
  providedIn: 'root'
})
export class TablesService {
  private db = inject(DbService);
  private waitersService = inject(WaitersService);
  
  tables = signal<Table[]>([]);
  loading = signal(false);
  
  async loadTables(terminalId?: string): Promise<void> {
    this.loading.set(true);
    try {
      let tables = await this.db.find<Table>({
        type: 'table'
      });
      
      if (terminalId) {
        tables = tables.filter(t => t.terminalId === terminalId);
      }
      
      this.tables.set(tables);
    } catch (error) {
      console.error('Error loading tables:', error);
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  async getTable(id: string): Promise<Table | undefined> {
    try {
      const doc = await this.db.get<Table>(id);
      return doc && doc.type === 'table' ? doc : undefined;
    } catch (error) {
      console.error('Error getting table:', error);
      return undefined;
    }
  }

  async createTable(table: Omit<Table, '_id' | 'createdAt' | 'updatedAt' | 'items' | 'amount' | 'status'>): Promise<Table> {
    const newTable: Table = {
      ...table,
      _id: `table_${Date.now()}`,
      status: 'free',
      items: [],
      amount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    try {
      await this.db.put(newTable);
      await this.loadTables();
      return newTable;
    } catch (error) {
      console.error('Error creating table:', error);
      throw error;
    }
  }

  async updateTable(table: Table): Promise<void> {
    try {
      const existing: any = await this.db.get(table._id);
      if (!existing) throw new Error('Table not found');
      
      const updated = {
        ...table,
        _rev: existing._rev,
        updatedAt: Date.now()
      };
      
      await this.db.put(updated);
      await this.loadTables();
    } catch (error) {
      console.error('Error updating table:', error);
      throw error;
    }
  }

  async deleteTable(id: string): Promise<void> {
    try {
      const doc = await this.db.get(id);
      if (!doc) throw new Error('Table not found');
      
      await this.db.delete(doc as any);
      await this.loadTables();
    } catch (error) {
      console.error('Error deleting table:', error);
      throw error;
    }
  }

  async occupyTable(
    tableId: string,
    guestName: string,
    guestCount: number,
    waiterId?: string,
    waiterName?: string
  ): Promise<void> {
    const table = await this.getTable(tableId);
    if (!table) return;
    
    table.status = 'occupied';
    table.guestName = guestName;
    table.guestCount = guestCount;
    table.waiterId = waiterId;
    table.waiterName = waiterName;
    table.startTime = Date.now();
    table.items = [];
    table.amount = 0;
    
    await this.updateTable(table);
    
    // Assign table to waiter
    if (waiterId) {
      await this.waitersService.assignTable(waiterId, tableId);
    }
  }

  async addItems(tableId: string, items: CartItem[]): Promise<void> {
    const table = await this.getTable(tableId);
    if (!table) return;
    
    table.items.push(...items);
    table.amount = table.items.reduce((sum, item) => sum + item.total, 0);
    
    await this.updateTable(table);
  }

  async clearTable(tableId: string): Promise<void> {
    const table = await this.getTable(tableId);
    if (!table) return;
    
    const waiterId = table.waiterId;
    
    table.status = 'cleaning';
    table.guestName = undefined;
    table.guestCount = undefined;
    table.waiterId = undefined;
    table.waiterName = undefined;
    table.startTime = undefined;
    table.orderId = undefined;
    table.items = [];
    table.amount = 0;
    table.notes = undefined;
    table.sessionId = undefined;
    
    await this.updateTable(table);
    
    // Unassign from waiter
    if (waiterId) {
      await this.waitersService.unassignTable(waiterId, tableId);
    }
    
    // Auto-transition to free after 2 minutes (cleanup complete)
    setTimeout(async () => {
      const currentTable = await this.getTable(tableId);
      if (currentTable && currentTable.status === 'cleaning') {
        currentTable.status = 'free';
        await this.updateTable(currentTable);
      }
    }, 120000);
  }

  async setTableStatus(tableId: string, status: Table['status']): Promise<void> {
    const table = await this.getTable(tableId);
    if (table) {
      table.status = status;
      await this.updateTable(table);
    }
  }

  async transferTable(tableId: string, newWaiterId: string, newWaiterName: string): Promise<void> {
    const table = await this.getTable(tableId);
    if (!table) return;
    
    const oldWaiterId = table.waiterId;
    
    table.waiterId = newWaiterId;
    table.waiterName = newWaiterName;
    
    await this.updateTable(table);
    
    // Update waiter assignments
    if (oldWaiterId) {
      await this.waitersService.unassignTable(oldWaiterId, tableId);
    }
    await this.waitersService.assignTable(newWaiterId, tableId);
  }

  async mergeTable(sourceTableId: string, targetTableId: string): Promise<void> {
    const source = await this.getTable(sourceTableId);
    const target = await this.getTable(targetTableId);
    
    if (!source || !target) return;
    
    // Add source items to target
    target.items.push(...source.items);
    target.amount += source.amount;
    target.guestCount = (target.guestCount || 0) + (source.guestCount || 0);
    
    await this.updateTable(target);
    
    // Clear source table
    await this.clearTable(sourceTableId);
  }

  getTablesByStatus(status: Table['status']): Table[] {
    return this.tables().filter(t => t.status === status);
  }

  getTablesBySection(section: string): Table[] {
    return this.tables().filter(t => t.section === section && t.active);
  }

  getTablesByWaiter(waiterId: string): Table[] {
    return this.tables().filter(t => t.waiterId === waiterId && t.status === 'occupied');
  }

  getOccupiedTablesCount(): number {
    return this.tables().filter(t => t.status === 'occupied').length;
  }

  getTotalRevenue(): number {
    return this.tables()
      .filter(t => t.status === 'occupied')
      .reduce((sum, t) => sum + t.amount, 0);
  }
}
