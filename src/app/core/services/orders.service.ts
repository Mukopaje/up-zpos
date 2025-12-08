import { Injectable, signal } from '@angular/core';
import { DbService } from './db.service';
import { StorageService } from './storage.service';
import { CartService } from './cart.service';
import { Order, CartItem, Customer, Product } from '../../models';

export interface Payment {
  _id?: string;
  type: 'cash' | 'card' | 'account' | 'mobile';
  amount: number;
  reference?: string;
  timestamp: number;
}

export interface OrderCreateData {
  paymentType: 'cash' | 'card' | 'account' | 'mobile';
  amountPaid: number;
  customer?: Customer;
  notes?: string;
  payments?: Payment[];
}

@Injectable({
  providedIn: 'root'
})
export class OrdersService {
  orders = signal<Order[]>([]);
  currentInvoiceNumber = signal<number>(1);
  invoicePrefix = signal<string>('INV');
  location = signal<string>('');
  warehouse = signal<string>('');
  userId = signal<string>('');

  constructor(
    private db: DbService,
    private storage: StorageService,
    private cart: CartService
  ) {
    this.loadSettings();
  }

  /**
   * Load user settings
   */
  private async loadSettings(): Promise<void> {
    try {
      const [location, warehouse, userId, invoicePrefix] = await Promise.all([
        this.storage.get('location'),
        this.storage.get('warehouse'),
        this.storage.get('user_id'),
        this.storage.get('invoice_prefix')
      ]);

      if (location && typeof location === 'string') this.location.set(location);
      if (warehouse && typeof warehouse === 'string') this.warehouse.set(warehouse);
      if (userId && typeof userId === 'string') this.userId.set(userId);
      if (invoicePrefix && typeof invoicePrefix === 'string') this.invoicePrefix.set(invoicePrefix);

      // Load last invoice number
      await this.loadLastInvoiceNumber();
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  /**
   * Load last invoice number from database
   */
  private async loadLastInvoiceNumber(): Promise<void> {
    try {
      const result = await this.db.query<Order>({
        selector: {
          type: 'order',
          createdAt: { $gte: 0 }
        },
        sort: [{ type: 'desc' }, { createdAt: 'desc' }],
        limit: 1
      });

      // result is FindResponse<Order>
      if ('docs' in result && result.docs.length > 0) {
        const lastOrder = result.docs[0];
        const match = lastOrder.orderNumber?.match(/\d+$/);
        if (match) {
          this.currentInvoiceNumber.set(parseInt(match[0], 10) + 1);
        }
      }
    } catch (error) {
      console.error('Error loading last invoice:', error);
    }
  }

  /**
   * Generate unique invoice number
   */
  private generateInvoiceNumber(): string {
    const prefix = this.invoicePrefix();
    const number = this.currentInvoiceNumber();
    const paddedNumber = number.toString().padStart(6, '0');
    this.currentInvoiceNumber.set(number + 1);
    return `${prefix}${paddedNumber}`;
  }

  /**
   * Generate unique ID for documents
   */
  private getUniqueId(parts: number = 4): string {
    const stringArr = [];
    for (let i = 0; i < parts; i++) {
      const S4 = (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
      stringArr.push(S4);
    }
    return stringArr.join('-');
  }

  /**
   * Create order from current cart
   */
  async createOrder(data: OrderCreateData): Promise<Order> {
    const cartItems = this.cart.getItems();
    if (cartItems.length === 0) {
      throw new Error('Cannot create order with empty cart');
    }

    const summary = this.cart.summary();
    const timestamp = new Date().toISOString();
    const orderId = `ORD_${timestamp}`;
    const invoiceNumber = this.generateInvoiceNumber();

    // Calculate change
    const change = data.amountPaid - summary.total;
    if (change < 0 && data.paymentType !== 'account') {
      throw new Error('Insufficient payment amount');
    }

    const order: Order = {
      _id: orderId,
      type: 'order',
      orderNumber: invoiceNumber,
      items: cartItems,
      subtotal: summary.subtotal,
      tax: summary.tax,
      discount: summary.discount + summary.ticketDiscount,
      total: summary.total,
      amountPaid: data.amountPaid,
      change: Math.max(0, change),
      paymentMethod: data.paymentType,
      status: 'completed',
      customer: data.customer,
      notes: data.notes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: this.userId(),
      completedAt: Date.now()
    };

    try {
      // Save order to database
      await this.db.put(order);

      // Process payments if multiple
      if (data.payments && data.payments.length > 0) {
        await this.savePayments(orderId, data.payments);
      }

      // Update inventory
      await this.updateInventory(cartItems);

      // Update customer account if account sale
      if (data.customer && data.paymentType === 'account') {
        await this.updateCustomerBalance(data.customer, summary.total);
      }

      // Clear cart
      this.cart.clearCart();

      // Add to local orders list
      const orders = [...this.orders()];
      orders.unshift(order);
      this.orders.set(orders);

      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Save payment details
   */
  private async savePayments(orderId: string, payments: Payment[]): Promise<void> {
    const paymentDocs = payments.map(payment => ({
      _id: `PAY_${new Date().toISOString()}_${this.getUniqueId(1)}`,
      type: 'payment',
      orderId: orderId,
      paymentType: payment.type,
      amount: payment.amount,
      reference: payment.reference,
      timestamp: payment.timestamp || Date.now(),
      createdAt: Date.now(),
      createdBy: this.userId()
    }));

    try {
      await this.db.bulkDocs(paymentDocs);
    } catch (error) {
      console.error('Error saving payments:', error);
      throw error;
    }
  }

  /**
   * Update inventory after sale
   */
  private async updateInventory(items: CartItem[]): Promise<void> {
    const warehouse = this.warehouse();
    const location = this.location();

    for (const item of items) {
      try {
        const product = await this.db.get<Product>(item.product._id);
        
        if (product && product.inventory) {
          // Find inventory for current location/warehouse
          const inventoryIndex = product.inventory.findIndex(
            inv => inv.location === location && inv.warehouse === warehouse
          );

          if (inventoryIndex >= 0) {
            // Update quantity
            product.inventory[inventoryIndex].qty -= item.quantity;
            product.updatedAt = Date.now();
            product.updatedBy = this.userId();

            await this.db.put(product);
          }
        }
      } catch (error) {
        console.error(`Error updating inventory for ${item.product._id}:`, error);
        // Continue with other items even if one fails
      }
    }
  }

  /**
   * Update customer account balance
   */
  private async updateCustomerBalance(customer: Customer, amount: number): Promise<void> {
    try {
      const customerDoc = await this.db.get<Customer>(customer._id);
      
      if (customerDoc) {
        // Add to balance (negative balance means they owe money)
        customerDoc.balance = (customerDoc.balance || 0) + amount;
        customerDoc.updatedAt = Date.now();

        await this.db.put(customerDoc);
      }
    } catch (error) {
      console.error('Error updating customer balance:', error);
      throw error;
    }
  }

  /**
   * Get orders within date range
   */
  async getOrders(startDate?: Date, endDate?: Date, salesPerson?: string): Promise<Order[]> {
    try {
      const start = startDate ? startDate.toISOString() : null;
      const end = endDate ? endDate.toISOString() : null;

      let selector: any = {
        type: 'order',
        createdAt: { $gte: 0 }
      };

      if (start && end) {
        selector._id = {
          $gte: `ORD_${start}`,
          $lte: `ORD_${end}\ufff0`
        };
      }

      if (salesPerson) {
        selector.createdBy = salesPerson;
      }

      const result = await this.db.query<Order>({
        selector,
        sort: [{ type: 'desc' }, { createdAt: 'desc' }]
      });

      // Check if result has docs property (FindResponse)
      const orders = 'docs' in result ? result.docs : [];
      this.orders.set(orders);
      return orders;
    } catch (error) {
      console.error('Error getting orders:', error);
      return [];
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<Order | null> {
    try {
      const order = await this.db.get<Order>(orderId);
      return order;
    } catch (error) {
      console.error('Error getting order:', error);
      return null;
    }
  }

  /**
   * Process return/refund
   */
  async processReturn(
    orderId: string,
    productId: string,
    quantity: number,
    reason: string
  ): Promise<void> {
    try {
      const order = await this.db.get<Order>(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const itemIndex = order.items.findIndex(item => item.product._id === productId);
      if (itemIndex < 0) {
        throw new Error('Item not found in order');
      }

      const item = order.items[itemIndex];
      const returnAmount = (item.price * quantity);

      // Create refund document
      const refundId = `RFN_${new Date().toISOString()}`;
      const refund = {
        _id: refundId,
        type: 'refund',
        orderId: orderId,
        productId: productId,
        quantity: quantity,
        amount: returnAmount,
        reason: reason,
        location: this.location(),
        warehouse: this.warehouse(),
        createdAt: Date.now(),
        createdBy: this.userId()
      };

      await this.db.put(refund);

      // Update order
      if (item.quantity === quantity) {
        // Remove item completely
        order.items.splice(itemIndex, 1);
      } else {
        // Reduce quantity
        order.items[itemIndex].quantity -= quantity;
        order.items[itemIndex].total = order.items[itemIndex].quantity * order.items[itemIndex].price;
      }

      // Recalculate totals
      order.subtotal = order.items.reduce((sum, i) => sum + i.total, 0);
      order.total = order.subtotal + order.tax - order.discount;
      order.updatedAt = Date.now();

      await this.db.put(order);

      // Return to inventory
      const product = await this.db.get<Product>(productId);
      if (product && product.inventory) {
        const inventoryIndex = product.inventory.findIndex(
          inv => inv.location === this.location() && inv.warehouse === this.warehouse()
        );

        if (inventoryIndex >= 0) {
          product.inventory[inventoryIndex].qty += quantity;
          product.updatedAt = Date.now();
          await this.db.put(product);
        }
      }
    } catch (error) {
      console.error('Error processing return:', error);
      throw error;
    }
  }

  /**
   * Get sales summary
   */
  async getSalesSummary(startDate: Date, endDate: Date, salesPerson?: string): Promise<{
    totalSales: number;
    totalOrders: number;
    totalTax: number;
    totalDiscount: number;
    averageOrderValue: number;
  }> {
    const orders = await this.getOrders(startDate, endDate, salesPerson);

    const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
    const totalTax = orders.reduce((sum, order) => sum + order.tax, 0);
    const totalDiscount = orders.reduce((sum, order) => sum + order.discount, 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    return {
      totalSales: Number(totalSales.toFixed(2)),
      totalOrders,
      totalTax: Number(totalTax.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      averageOrderValue: Number(averageOrderValue.toFixed(2))
    };
  }

  /**
   * Search orders by invoice number
   */
  async searchByInvoice(invoiceNumber: string): Promise<Order[]> {
    try {
      const result = await this.db.query<Order>({
        selector: {
          type: 'order',
          orderNumber: {
            $regex: `(?i)${invoiceNumber}`
          }
        }
      });

      return 'docs' in result ? result.docs : [];
    } catch (error) {
      console.error('Error searching orders:', error);
      return [];
    }
  }

  /**
   * Get today's orders
   */
  async getTodayOrders(): Promise<Order[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.getOrders(today, tomorrow);
  }
}
