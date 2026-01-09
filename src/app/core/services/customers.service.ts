import { Injectable, signal, computed, inject } from '@angular/core';
import { SqliteService, Customer as SqlCustomer } from './sqlite.service';
import { Customer } from '../../models';
import { SyncService } from './sync.service';

@Injectable({
  providedIn: 'root'
})
export class CustomersService {
  private sqlite = inject(SqliteService);
  private syncService = inject(SyncService);

  // Reactive state
  private customersState = signal<Customer[]>([]);
  private isLoadingState = signal<boolean>(false);

  // Public computed values
  customers = this.customersState.asReadonly();
  isLoading = this.isLoadingState.asReadonly();
  
  // Computed values
  activeCustomers = computed(() => 
    this.customersState().filter(c => c.active)
  );
  
  customersWithCredit = computed(() =>
    this.customersState().filter(c => c.creditLimit > 0)
  );
  
  customersWithBalance = computed(() =>
    this.customersState().filter(c => c.balance > 0)
  );

  totalCustomers = computed(() => this.customersState().length);
  totalOutstandingBalance = computed(() =>
    this.customersState().reduce((sum, c) => sum + c.balance, 0)
  );

  constructor() {
    this.loadCustomers();
  }

  /**
   * Map SQLite customer row to app Customer model
   */
  private mapSqlCustomerToApp(row: SqlCustomer): Customer {
    const createdAt = row.created_at ? Date.parse(row.created_at) : Date.now();
    const updatedAt = row.updated_at ? Date.parse(row.updated_at) : createdAt;

    return {
      _id: row.id || '',
      type: 'customer',
      name: row.name,
      email: row.email || undefined,
      phone: row.phone || '',
      address: row.address || undefined,
      creditLimit: row.credit_limit ?? 0,
      balance: row.current_balance ?? 0,
      active: true,
      createdAt,
      updatedAt
    };
  }

  /**
   * Load all customers from database
   */
  async loadCustomers(): Promise<void> {
    this.isLoadingState.set(true);
    try {
      await this.sqlite.ensureInitialized();
      const rows = await this.sqlite.getCustomers();
      const customers = rows.map(row => this.mapSqlCustomerToApp(row));
      this.customersState.set(customers);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      this.isLoadingState.set(false);
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomer(id: string): Promise<Customer | null> {
    try {
      await this.sqlite.ensureInitialized();
      const row = await this.sqlite.getCustomerById(id);
      return row ? this.mapSqlCustomerToApp(row) : null;
    } catch (error) {
      console.error('Error getting customer:', error);
      return null;
    }
  }

  /**
   * Find customer by phone number
   */
  findByPhone(phone: string): Customer | undefined {
    return this.customersState().find(c => c.phone === phone);
  }

  /**
   * Find customer by name
   */
  findByName(name: string): Customer[] {
    const searchTerm = name.toLowerCase();
    return this.customersState().filter(c => 
      c.name.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Search customers
   */
  search(query: string): Customer[] {
    const searchTerm = query.toLowerCase();
    return this.customersState().filter(c =>
      c.name.toLowerCase().includes(searchTerm) ||
      c.phone.includes(searchTerm) ||
      c.email?.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Create new customer
   */
  async createCustomer(data: Omit<Customer, '_id' | '_rev' | 'type' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    try {
      await this.sqlite.ensureInitialized();

      const sqlCustomer: SqlCustomer = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        credit_limit: data.creditLimit || 0,
        current_balance: data.balance || 0
      };

      const id = await this.sqlite.addCustomer(sqlCustomer);
      await this.loadCustomers();

      const row = await this.sqlite.getCustomerById(id);
      if (!row) {
        throw new Error('Failed to load created customer');
      }

      this.triggerImmediateSync();
      return this.mapSqlCustomerToApp(row);
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  /**
   * Update existing customer
   */
  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    try {
      await this.sqlite.ensureInitialized();

      const sqlUpdates: Partial<SqlCustomer> = {
        name: updates.name,
        email: updates.email,
        phone: updates.phone,
        address: updates.address,
        credit_limit: updates.creditLimit,
        current_balance: updates.balance
      };

      await this.sqlite.updateCustomer(id, sqlUpdates);
      await this.loadCustomers();

      const row = await this.sqlite.getCustomerById(id);
      if (!row) {
        throw new Error('Customer not found after update');
      }

      this.triggerImmediateSync();
      return this.mapSqlCustomerToApp(row);
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  }

  /**
   * Delete customer (soft delete by setting active = false)
   */
  async deleteCustomer(id: string): Promise<void> {
    try {
      await this.sqlite.ensureInitialized();
      await this.sqlite.deleteCustomer(id);
      await this.loadCustomers();
      this.triggerImmediateSync();
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  }

  /**
   * Permanently delete customer
   */
  async permanentlyDeleteCustomer(id: string): Promise<void> {
    try {
      await this.sqlite.ensureInitialized();
      await this.sqlite.deleteCustomer(id);
      await this.loadCustomers();
      this.triggerImmediateSync();
    } catch (error) {
      console.error('Error permanently deleting customer:', error);
      throw error;
    }
  }

  /**
   * Add credit to customer balance (increase debt)
   */
  async addCredit(customerId: string, amount: number): Promise<Customer> {
    try {
      const customer = await this.getCustomer(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const newBalance = customer.balance + amount;

      // Check credit limit
      if (newBalance > customer.creditLimit) {
        throw new Error(`Credit limit exceeded. Limit: ${customer.creditLimit}, New balance would be: ${newBalance}`);
      }

      return await this.updateCustomer(customerId, { balance: newBalance });
    } catch (error) {
      console.error('Error adding credit:', error);
      throw error;
    }
  }

  /**
   * Record payment (reduce balance)
   */
  async recordPayment(customerId: string, amount: number): Promise<Customer> {
    try {
      const customer = await this.getCustomer(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      if (amount > customer.balance) {
        throw new Error(`Payment amount (${amount}) exceeds balance (${customer.balance})`);
      }

      const newBalance = customer.balance - amount;
      return await this.updateCustomer(customerId, { balance: newBalance });
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  }

  /**
   * Check if customer can purchase on credit
   */
  canPurchaseOnCredit(customerId: string, amount: number): boolean {
    const customer = this.customersState().find(c => c._id === customerId);
    if (!customer || !customer.active) {
      return false;
    }

    const newBalance = customer.balance + amount;
    return newBalance <= customer.creditLimit;
  }

  /**
   * Get available credit for customer
   */
  getAvailableCredit(customerId: string): number {
    const customer = this.customersState().find(c => c._id === customerId);
    if (!customer) {
      return 0;
    }

    return Math.max(0, customer.creditLimit - customer.balance);
  }

  /**
   * Get customers sorted by balance (highest first)
   */
  getCustomersByBalance(): Customer[] {
    return [...this.customersState()]
      .filter(c => c.balance > 0)
      .sort((a, b) => b.balance - a.balance);
  }

  /**
   * Update credit limit
   */
  async updateCreditLimit(customerId: string, newLimit: number): Promise<Customer> {
    try {
      const customer = await this.getCustomer(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      if (newLimit < customer.balance) {
        throw new Error(`New credit limit (${newLimit}) cannot be less than current balance (${customer.balance})`);
      }

      return await this.updateCustomer(customerId, { creditLimit: newLimit });
    } catch (error) {
      console.error('Error updating credit limit:', error);
      throw error;
    }
  }

  /**
   * Get customer statistics
   */
  getCustomerStats(customerId: string) {
    const customer = this.customersState().find(c => c._id === customerId);
    if (!customer) {
      return null;
    }

    return {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      creditLimit: customer.creditLimit,
      currentBalance: customer.balance,
      availableCredit: this.getAvailableCredit(customerId),
      creditUtilization: customer.creditLimit > 0 
        ? (customer.balance / customer.creditLimit) * 100 
        : 0,
      active: customer.active
    };
  }

  /**
   * Validate customer data
   */
  validateCustomer(data: Partial<Customer>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    }

    if (!data.phone || data.phone.trim().length < 9) {
      errors.push('Valid phone number required');
    }

    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('Invalid email format');
    }

    if (data.creditLimit !== undefined && data.creditLimit < 0) {
      errors.push('Credit limit cannot be negative');
    }

    if (data.balance !== undefined && data.balance < 0) {
      errors.push('Balance cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Email validation helper
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check for duplicate phone number
   */
  isDuplicatePhone(phone: string, excludeId?: string): boolean {
    return this.customersState().some(c => 
      c.phone === phone && c._id !== excludeId
    );
  }

  /**
   * Get customers with overdue balance (example - would need payment tracking)
   */
  getOverdueCustomers(): Customer[] {
    // This is a simplified version
    // In real implementation, you'd track payment due dates
    return this.customersState().filter(c => 
      c.balance > 0 && c.active
    );
  }

  /**
   * Trigger immediate sync after data changes
   */
  private triggerImmediateSync(): void {
    setTimeout(async () => {
      if (!this.syncService.isSyncInProgress()) {
        console.log('🔄 Triggering immediate sync after customer change...');
        await this.syncService.syncToCloud();
      } else {
        console.log('⏳ Sync already in progress, will be picked up in next cycle');
      }
    }, 100);
  }
}
