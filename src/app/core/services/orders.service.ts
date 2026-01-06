import { Injectable, signal, inject } from '@angular/core';
import { SqliteService, Sale } from './sqlite.service';
import { StorageService } from './storage.service';
import { CartService } from './cart.service';
import { Order, CartItem, Customer } from '../../models';
import { ProductsService } from './products.service';
import { CustomersService } from './customers.service';

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
  waiterId?: string;
  waiterName?: string;
  tableId?: string;
  tableNumber?: string;
  covers?: number;
}

@Injectable({
  providedIn: 'root'
})
export class OrdersService {
  orders = signal<Order[]>([]);
  currentInvoiceNumber = signal<number>(1);
  // Tracks the date (YYYYMMDD) for which currentInvoiceNumber applies
  currentInvoiceDate = signal<string>('');
  invoicePrefix = signal<string>('INV');
  location = signal<string>('');
  warehouse = signal<string>('');
  userId = signal<string>('');
  private sqlite = inject(SqliteService);
  private productsService = inject(ProductsService);
  private customersService = inject(CustomersService);

  constructor(
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
      const today = this.getTodayDateString();

      // Prefer explicit counter persisted in storage (per-day)
      const [counterDate, counterValue] = await Promise.all([
        this.storage.get<string>('invoice_counter_date'),
        this.storage.get<number>('invoice_counter_value')
      ]);

      if (counterDate === today && typeof counterValue === 'number' && counterValue >= 0) {
        this.currentInvoiceDate.set(today);
        this.currentInvoiceNumber.set(counterValue + 1);
        return;
      }

      // Fallback: infer from last sale's order_number if available
      await this.sqlite.ensureInitialized();
      const sales = await this.sqlite.getSales(1);

      if (sales.length > 0) {
        const lastOrder = sales[0];
        const orderNumber = lastOrder.order_number || '';

        // Support both legacy numeric suffix and new DATE-based pattern
        // Example new pattern: INV-20251229-0269
        const dateSeqMatch = orderNumber.match(/(\d{8})-(\d+)$/);
        if (dateSeqMatch) {
          const lastDate = dateSeqMatch[1];
          const lastSeq = parseInt(dateSeqMatch[2], 10) || 0;
          if (lastDate === today) {
            this.currentInvoiceDate.set(today);
            this.currentInvoiceNumber.set(lastSeq + 1);
            await this.storage.set('invoice_counter_date', today);
            await this.storage.set('invoice_counter_value', lastSeq);
            return;
          }
        } else {
          const legacyMatch = orderNumber.match(/(\d+)$/);
          if (legacyMatch) {
            const lastSeq = parseInt(legacyMatch[1], 10) || 0;
            this.currentInvoiceDate.set(today);
            this.currentInvoiceNumber.set(lastSeq + 1);
            await this.storage.set('invoice_counter_date', today);
            await this.storage.set('invoice_counter_value', lastSeq);
            return;
          }
        }
      }

      // Default: start sequence at 1 for today
      this.currentInvoiceDate.set(today);
      this.currentInvoiceNumber.set(1);
      await this.storage.set('invoice_counter_date', today);
      await this.storage.set('invoice_counter_value', 0);
    } catch (error) {
      console.error('Error loading last invoice:', error);
    }
  }

  /**
   * Generate unique invoice number
   */
  private generateInvoiceNumber(): string {
    const prefix = this.invoicePrefix();
    const today = this.getTodayDateString();

    // Reset counter when date changes
    if (this.currentInvoiceDate() !== today) {
      this.currentInvoiceDate.set(today);
      this.currentInvoiceNumber.set(1);
    }

    const number = this.currentInvoiceNumber();
    const paddedNumber = number.toString().padStart(4, '0');
    this.currentInvoiceNumber.set(number + 1);

    // Format: PREFIX-YYYYMMDD-#### (e.g. INV-20251229-0269)
    return `${prefix}-${today}-${paddedNumber}`;
  }

  /**
   * Helper: format today's date as YYYYMMDD
   */
  private getTodayDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
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

  private mapSaleToOrder(sale: Sale): Order {
    const payload = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items || {};
    const items: CartItem[] = payload.items || [];
    const amountPaid: number = payload.amountPaid ?? sale.total;
    const change: number = payload.change ?? 0;
    const notes: string | undefined = payload.notes;
    const customer: Customer | undefined = payload.customer;
    const payments: Payment[] | undefined = payload.payments;
    const createdAt = sale.created_at ? Date.parse(sale.created_at) : Date.now();
    const updatedAt = sale.updated_at ? Date.parse(sale.updated_at) : createdAt;

    return {
      _id: sale.id || '',
      type: 'order',
      orderNumber: sale.order_number,
      items,
      subtotal: sale.subtotal,
      tax: sale.tax || 0,
      discount: sale.discount || 0,
      total: sale.total,
      amountPaid,
      change,
      paymentMethod: sale.payment_method,
      status: sale.payment_status === 'paid' ? 'completed' : 'processed',
      customer,
      notes,
      payment: payments?.map(p => ({
        type: p.type,
        amount: p.amount,
        reference: p.reference,
        timestamp: p.timestamp
      })),
      waiterId: payload.waiterId,
      tableId: payload.tableId,
      covers: payload.covers,
      createdBy: payload.createdBy || this.userId(),
      createdAt,
      updatedAt
    } as Order;
  }

  /**
   * Queue an email receipt job for the given order and recipient
   * email. This uses the offline outbox so that the request is
   * pushed to the backend on the next sync, even if the device is
   * currently offline.
   */
  async queueReceiptEmail(order: Order, email: string, businessName: string): Promise<void> {
    if (!email || !email.trim()) {
      return;
    }

    await this.sqlite.ensureInitialized();

    const items = (order.items || []).map(item => ({
      name: item.name || item.product?.name,
      quantity: item.quantity ?? item.Quantity,
      price: item.price,
      total: item.total ?? item.itemTotalPrice
    }));

    // Get settings so we can include store contact details and currency
    const settings = await this.storage.get<any>('app-settings');
    const currency = settings?.currency || 'ZMW';
    const storePhone = settings?.phone;
    const storeEmail = settings?.email;
    const storeAddress = settings?.address;

    await this.sqlite.queueEmailReceiptJob({
      orderId: order._id,
      orderNumber: order.orderNumber || '',
      to: email.trim(),
      businessName,
      customerName: order.customer?.name,
      customerEmail: order.customer?.email || email.trim(),
      customerPhone: order.customer?.phone,
      total: order.total,
      paymentMethod: order.paymentMethod || order.paymentOption,
      items,
      currency,
      storePhone,
      storeEmail,
      storeAddress,
      createdAt: new Date().toISOString()
    });
  }

  /**
   * Create order from current cart
   */
  async createOrder(data: OrderCreateData): Promise<Order> {
    const cartItems = this.cart.getItems();
    if (cartItems.length === 0) {
      throw new Error('Cannot create order with empty cart');
    }

    await this.sqlite.ensureInitialized();

    const summary = this.cart.summary();
    const now = new Date();
    const timestamp = now.toISOString();
    const orderId = `ORD_${timestamp}`;
    const invoiceNumber = this.generateInvoiceNumber();

    // Calculate change
    const change = data.amountPaid - summary.total;
    if (change < 0 && data.paymentType !== 'account') {
      throw new Error('Insufficient payment amount');
    }

    const payload: any = {
      items: cartItems,
      amountPaid: data.amountPaid,
      change: Math.max(0, change),
      notes: data.notes,
      customer: data.customer,
      payments: data.payments,
      waiterId: data.waiterId,
      tableId: data.tableId,
      covers: data.covers,
      createdBy: this.userId(),
      location: this.location(),
      warehouse: this.warehouse()
    };

    try {
      const sale: Sale = {
        id: orderId,
        order_number: invoiceNumber,
        customer_id: data.customer?._id,
        total: summary.total,
        subtotal: summary.subtotal,
        tax: summary.tax,
        discount: summary.discount + summary.ticketDiscount,
        payment_method: data.paymentType,
        payment_status: change <= 0 ? 'paid' : 'partial',
        items: payload
      };

      await this.sqlite.addSale(sale);

      // Persist latest invoice counter for the day
      const today = this.getTodayDateString();
      const currentSeq = this.currentInvoiceNumber();
      // currentInvoiceNumber holds NEXT sequence; last used is -1
      await this.storage.set('invoice_counter_date', today);
      await this.storage.set('invoice_counter_value', currentSeq - 1);

      // Update inventory in SQLite
      for (const item of cartItems) {
        try {
          await this.productsService.reduceQuantity(item.product._id, item.quantity);
        } catch (err) {
          console.error(`Error updating inventory for ${item.product._id}:`, err);
        }
      }

      // Update customer account if account sale
      if (data.customer && data.paymentType === 'account') {
        await this.customersService.addCredit(data.customer._id, summary.total);
      }

      // Clear cart
      this.cart.clearCart();

      const createdOrder = this.mapSaleToOrder({ ...sale, id: orderId });

      const orders = [...this.orders()];
      orders.unshift(createdOrder);
      this.orders.set(orders);

      return createdOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Save payment details
   */
  private async savePayments(orderId: string, payments: Payment[]): Promise<void> {
    // Payments are stored inside the sale payload for now
    console.log('savePayments called - payments are stored within sale payload in SQLite.', orderId, payments);
  }

  /**
   * Update inventory after sale
   */
  private async updateInventory(items: CartItem[]): Promise<void> {
    for (const item of items) {
      try {
        await this.productsService.reduceQuantity(item.product._id, item.quantity);
      } catch (error) {
        console.error(`Error updating inventory for ${item.product._id}:`, error);
      }
    }
  }

  /**
   * Update customer account balance
   */
  private async updateCustomerBalance(customer: Customer, amount: number): Promise<void> {
    try {
      await this.customersService.addCredit(customer._id, amount);
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
      await this.sqlite.ensureInitialized();
      const sales = await this.sqlite.getSales(1000);
      let orders = sales.map(s => this.mapSaleToOrder(s));

      if (startDate && endDate) {
        const startTime = startDate.getTime();
        const endTime = endDate.getTime();
        orders = orders.filter(o => o.createdAt >= startTime && o.createdAt <= endTime);
      }

      if (salesPerson) {
        orders = orders.filter(o => o.createdBy === salesPerson);
      }

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
      await this.sqlite.ensureInitialized();
      const sale = await this.sqlite.getSaleById(orderId);
      return sale ? this.mapSaleToOrder(sale) : null;
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
      await this.sqlite.ensureInitialized();
      const sale = await this.sqlite.getSaleById(orderId);
      if (!sale) {
        throw new Error('Order not found');
      }

      const payload = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items || {};
      const items: CartItem[] = payload.items || [];

      const itemIndex = items.findIndex(item => item.product._id === productId);
      if (itemIndex < 0) {
        throw new Error('Item not found in order');
      }
      const item = items[itemIndex];
      const returnAmount = (item.price * quantity);

      // Update order items in payload
      if (item.quantity === quantity) {
        // Remove item completely
        items.splice(itemIndex, 1);
      } else {
        // Reduce quantity
        items[itemIndex].quantity -= quantity;
        items[itemIndex].total = items[itemIndex].quantity * items[itemIndex].price;
      }
      payload.items = items;

      // Recalculate totals
      const order = this.mapSaleToOrder({ ...sale, items: payload });
      order.subtotal = items.reduce((sum, i) => sum + i.total, 0);
      order.total = order.subtotal + order.tax - order.discount;

      await this.sqlite.updateSale(orderId, {
        subtotal: order.subtotal,
        total: order.total,
        items: payload
      });

      // Log void/return for reporting
      try {
        await this.sqlite.addVoidRecord({
          sale_id: orderId,
          table_id: null,
          product_id: productId,
          product_name: item.product.name,
          quantity,
          price: item.price,
          total: returnAmount,
          reason,
          created_by: this.userId() || 'Unknown'
        });
      } catch (logError) {
        console.error('Error recording void/return:', logError);
      }

      // Return to inventory (increase stock)
      try {
        const product = await this.sqlite.getProductById(productId);
        if (product) {
          const currentQty = product.stock_quantity ?? 0;
          await this.sqlite.updateProduct(productId, { stock_quantity: currentQty + quantity });
        }
      } catch (err) {
        console.error('Error returning item to inventory:', err);
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
      await this.sqlite.ensureInitialized();
      const sales = await this.sqlite.getSales(500);
      const orders = sales.map(s => this.mapSaleToOrder(s));
      return orders.filter(o => (o.orderNumber || '').toLowerCase().includes(invoiceNumber.toLowerCase()));
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
