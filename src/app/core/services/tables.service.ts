import { Injectable, inject, signal } from '@angular/core';
import { Table, TableSession, CartItem } from '../../models';
import { SqliteService, TableRow } from './sqlite.service';
import { WaitersService } from './waiters.service';

@Injectable({
  providedIn: 'root'
})
export class TablesService {
  private sqlite = inject(SqliteService);
  private waitersService = inject(WaitersService);
  
  tables = signal<Table[]>([]);
  loading = signal(false);
  
  async loadTables(terminalId?: string): Promise<void> {
    this.loading.set(true);
    try {
      const rows = await this.sqlite.getTables(terminalId);
      const tables = rows.map(r => this.mapRowToTable(r));
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
      const row = await this.sqlite.getTableById(id);
      return row ? this.mapRowToTable(row) : undefined;
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
      const id = await this.sqlite.addTable(this.mapTableToRow(newTable));
      const created = { ...newTable, _id: id };
      await this.loadTables();
      return created;
    } catch (error) {
      console.error('Error creating table:', error);
      throw error;
    }
  }

  async updateTable(table: Table): Promise<void> {
    try {
      const updated: Table = {
        ...table,
        updatedAt: Date.now()
      };

      await this.sqlite.updateTable(updated._id, this.mapTableToRow(updated));
      await this.loadTables();
    } catch (error) {
      console.error('Error updating table:', error);
      throw error;
    }
  }

  async deleteTable(id: string): Promise<void> {
    try {
      await this.sqlite.deleteTable(id);
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

  private mapRowToTable(row: TableRow): Table {
    const position = row.position ? JSON.parse(row.position) : undefined;
    const items: CartItem[] = row.items ? JSON.parse(row.items) : [];

    const createdAt = row.created_at ? Date.parse(row.created_at) : Date.now();
    const updatedAt = row.updated_at ? Date.parse(row.updated_at) : createdAt;

    return {
      _id: row.id!,
      type: 'table',
      number: row.number,
      name: row.name || undefined,
      capacity: row.capacity,
      section: row.section || undefined,
      floor: row.floor || undefined,
      status: row.status as any,
      shape: row.shape as any,
      position,
      sessionId: row.session_id || undefined,
      guestName: row.guest_name || undefined,
      guestCount: row.guest_count || undefined,
      waiterId: row.waiter_id || undefined,
      waiterName: row.waiter_name || undefined,
      startTime: row.start_time ? Date.parse(row.start_time) : undefined,
      orderId: row.order_id || undefined,
      items,
      amount: row.amount ?? 0,
      notes: row.notes || undefined,
      terminalId: row.terminal_id,
      active: row.active === undefined ? true : row.active === 1,
      createdAt,
      updatedAt
    };
  }

  private mapTableToRow(table: Table): TableRow {
    return {
      id: table._id,
      number: table.number,
      name: table.name,
      capacity: table.capacity,
      section: table.section,
      floor: table.floor,
      status: table.status,
      shape: table.shape,
      position: table.position ? JSON.stringify(table.position) : null as any,
      session_id: table.sessionId,
      guest_name: table.guestName,
      guest_count: table.guestCount,
      waiter_id: table.waiterId,
      waiter_name: table.waiterName,
      start_time: table.startTime ? new Date(table.startTime).toISOString() : null as any,
      order_id: table.orderId,
      items: JSON.stringify(table.items || []),
      amount: table.amount ?? 0,
      notes: table.notes,
      terminal_id: table.terminalId,
      active: table.active === false ? 0 : 1,
      created_at: new Date(table.createdAt).toISOString(),
      updated_at: new Date(table.updatedAt).toISOString()
    };
  }
}
