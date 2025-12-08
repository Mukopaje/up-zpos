import { Injectable, signal, computed, inject } from '@angular/core';
import { DbService } from './db.service';
import { Customer } from '../../models';

@Injectable({
  providedIn: 'root'
})
export class CustomersService {
  private db = inject(DbService);

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
   * Load all customers from database
   */
  async loadCustomers(): Promise<void> {
    this.isLoadingState.set(true);
    try {
      const customers = await this.db.find<Customer>({
        type: 'customer'
      });
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
      return await this.db.get<Customer>(id);
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
    const customer: Customer = {
      _id: `customer_${Date.now()}`,
      type: 'customer',
      ...data,
      balance: data.balance || 0,
      creditLimit: data.creditLimit || 0,
      active: data.active !== undefined ? data.active : true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    try {
      const saved = await this.db.put(customer);
      await this.loadCustomers(); // Refresh list
      return saved;
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
      const existing = await this.db.get<Customer>(id);
      if (!existing) {
        throw new Error('Customer not found');
      }

      const updated: Customer = {
        ...existing,
        ...updates,
        _id: existing._id,
        type: 'customer',
        updatedAt: Date.now()
      };

      const saved = await this.db.put(updated);
      await this.loadCustomers(); // Refresh list
      return saved;
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
      await this.updateCustomer(id, { active: false });
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
      const customer = await this.db.get<Customer>(id);
      if (customer && customer._rev) {
        await this.db.delete(customer as Customer & { _rev: string });
        await this.loadCustomers(); // Refresh list
      }
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
      const customer = await this.db.get<Customer>(customerId);
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
      const customer = await this.db.get<Customer>(customerId);
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
      const customer = await this.db.get<Customer>(customerId);
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
}
