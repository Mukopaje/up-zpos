import { Component, OnInit, inject, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonButton,
  IonIcon,
  IonDatetime,
  IonModal,
  IonButtons,
  IonSpinner,
  IonSelect,
  IonSelectOption,
  IonBadge,
  MenuController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  menu,
  analytics,
  download,
  calendar,
  trendingUp,
  cart,
  people,
  cube,
  cash,
  closeCircle
} from 'ionicons/icons';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

import { OrdersService } from '../../core/services/orders.service';
import { ProductsService } from '../../core/services/products.service';
import { CustomersService } from '../../core/services/customers.service';
import { SqliteService, VoidRow, WorkperiodRow } from '../../core/services/sqlite.service';
import { WorkperiodsService } from '../../core/services/workperiods.service';
import { WaitersService } from '../../core/services/waiters.service';
import { TablesService } from '../../core/services/tables.service';
import { Order, Payment } from '../../models';

Chart.register(...registerables);

interface SalesData {
  date: string;
  sales: number;
  orders: number;
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface VoidSummary {
  totalAmount: number;
  totalQuantity: number;
  count: number;
}

interface VoidByUser {
  createdBy: string;
  count: number;
  totalAmount: number;
}

interface ItemSalesRow {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
  avgPrice: number;
  cost: number;
  margin: number;
  marginRate: number;
}

interface PaymentSummaryRow {
  type: Payment['type'];
  totalAmount: number;
  paymentCount: number;
  orderCount: number;
}

interface WaiterPerformanceRow {
  waiterId: string;
  waiterName: string;
  orderCount: number;
  totalSales: number;
  averageOrderValue: number;
  covers: number;
  averagePerCover: number;
}

interface TablePerformanceRow {
  tableId: string;
  tableLabel: string;
  orderCount: number;
  totalSales: number;
  covers: number;
  averagePerCover: number;
}

interface WorkperiodSalesSummary {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
}

interface InventoryVarianceRow {
  productId: string;
  name: string;
  netQuantity: number;
  netValue: number;
}

@Component({
  selector: 'app-reports',
  templateUrl: './reports.page.html',
  styleUrls: ['./reports.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonText,
    IonButton,
    IonIcon,
    IonDatetime,
    IonModal,
    IonButtons,
    IonSpinner,
    IonSelect,
    IonSelectOption,
    IonBadge
  ]
})
export class ReportsPage implements OnInit {
  private menuCtrl = inject(MenuController);
  private ordersService = inject(OrdersService);
  public productsService = inject(ProductsService);
  public customersService = inject(CustomersService);
  private sqlite = inject(SqliteService);
  private toastCtrl = inject(ToastController);
  public workperiodsService = inject(WorkperiodsService);
  private waitersService = inject(WaitersService);
  private tablesService = inject(TablesService);

  @ViewChild('salesChart') salesChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('productsChart') productsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChartRef!: ElementRef<HTMLCanvasElement>;

  // State
  selectedReport = signal<'sales' | 'inventory' | 'customers' | 'voids' | 'items' | 'payments' | 'workperiods'>('sales');
  selectedPeriod = signal<'today' | 'week' | 'month' | 'year' | 'custom'>('week');
  isLoading = signal<boolean>(false);
  showDateModal = signal<boolean>(false);
  
  startDate = signal<string>(this.getDateString(-7));
  endDate = signal<string>(this.getDateString(0));

  // Filters
  paymentFilter = signal<'all' | Payment['type']>('all');

  // Charts
  salesChart: Chart | null = null;
  productsChart: Chart | null = null;
  categoryChart: Chart | null = null;

  // Sales data
  salesSummary = signal<{
    totalSales: number;
    totalOrders: number;
    totalTax: number;
    totalDiscount: number;
    averageOrderValue: number;
  }>({
    totalSales: 0,
    totalOrders: 0,
    totalTax: 0,
    totalDiscount: 0,
    averageOrderValue: 0
  });

  dailySales = signal<SalesData[]>([]);
  topProducts = signal<TopProduct[]>([]);

  // Orders cache for current period (to reuse across reports)
  ordersForPeriod = signal<Order[]>([]);
  
  // Inventory data
  lowStockProducts = computed(() => {
    return this.productsService.products()
      .filter(p => p.quantity < 10 && p.active)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 10);
  });

  totalInventoryValue = computed(() => {
    return this.productsService.products()
      .reduce((sum, p) => sum + (p.quantity * p.cost), 0);
  });

  inventoryVariance = signal<InventoryVarianceRow[]>([]);

  inventoryVarianceSummary = signal<{
    totalPositiveQty: number;
    totalNegativeQty: number;
    netQuantity: number;
    netValue: number;
  }>({
    totalPositiveQty: 0,
    totalNegativeQty: 0,
    netQuantity: 0,
    netValue: 0
  });

  // Customer data
  topCustomers = signal<Array<{
    name: string;
    phone: string;
    totalSpent: number;
    orderCount: number;
  }>>([]);

  customersWithCredit = computed(() => {
    return this.customersService.customersWithCredit();
  });

  totalOutstanding = computed(() => {
    return this.customersService.totalOutstandingBalance();
  });

  // Void data
  voids = signal<VoidRow[]>([]);

  voidSummary = signal<VoidSummary>({
    totalAmount: 0,
    totalQuantity: 0,
    count: 0
  });

  voidsByUser = signal<VoidByUser[]>([]);

  // Item sales data
  itemSales = signal<ItemSalesRow[]>([]);

  // Payment summary data
  paymentSummary = signal<PaymentSummaryRow[]>([]);

  // Workperiod-level analytics
  selectedWorkperiodId = signal<string | null>(null);
  workperiodSalesSummary = signal<WorkperiodSalesSummary>({
    totalSales: 0,
    totalOrders: 0,
    averageOrderValue: 0
  });
  workperiodPaymentSummary = signal<PaymentSummaryRow[]>([]);
  waiterPerformance = signal<WaiterPerformanceRow[]>([]);
  tablePerformance = signal<TablePerformanceRow[]>([]);
  workperiodVoids = signal<VoidRow[]>([]);
  workperiodVoidSummary = signal<VoidSummary>({
    totalAmount: 0,
    totalQuantity: 0,
    count: 0
  });

  constructor() {
    this.registerIcons();
  }

  private registerIcons() {
    addIcons({ 
      menu,
      analytics,
      download,
      calendar,
      'trending-up': trendingUp,
      cart,
      people,
      cube,
      cash,
      'close-circle': closeCircle
    });
  }

  async ngOnInit() {
    await Promise.all([
      this.loadData(),
      this.workperiodsService.load(),
      this.waitersService.loadWaiters(),
      this.tablesService.loadTables()
    ]);

    this.initializeWorkperiodSelection();
  }

  async ionViewDidEnter() {
    // Render charts after view is ready
    setTimeout(() => {
      this.renderCharts();
    }, 300);
  }

  ionViewWillLeave() {
    this.destroyCharts();
  }

  private getDateString(daysOffset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString();
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      await this.loadSalesData();
      await this.loadInventoryData();
      await this.loadCustomerData();
      await this.loadVoidData();
      
      // Render charts after data is loaded
      setTimeout(() => {
        this.renderCharts();
      }, 100);
    } catch (error) {
      console.error('Error loading report data:', error);
      this.showToast('Error loading report data');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadSalesData() {
    const { startDate, endDate } = this.getDateRange();
    
    // Get sales summary
    const summary = await this.ordersService.getSalesSummary(startDate, endDate);
    this.salesSummary.set(summary);

    // Get orders for this period (used across multiple reports)
    const orders = await this.ordersService.getOrders(startDate, endDate);
    this.ordersForPeriod.set(orders);
    
    // Group by date
    const salesByDate = new Map<string, { sales: number; orders: number }>();
    
    orders.forEach(order => {
      const date = new Date(order.createdAt).toLocaleDateString();
      const existing = salesByDate.get(date) || { sales: 0, orders: 0 };
      existing.sales += order.total;
      existing.orders += 1;
      salesByDate.set(date, existing);
    });

    const dailySales = Array.from(salesByDate.entries())
      .map(([date, data]) => ({
        date,
        sales: data.sales,
        orders: data.orders
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    this.dailySales.set(dailySales);

    // Calculate top products and full item sales (quantity, revenue, margin)
    const productSales = new Map<string, { 
      productId: string;
      name: string; 
      quantity: number; 
      revenue: number;
      costTotal: number;
    }>();
    
    const filteredOrders = this.getOrdersForCurrentFilters(orders);

    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        const key = item.product._id;
        const existing = productSales.get(key) || { 
          productId: key,
          name: item.product.name, 
          quantity: 0, 
          revenue: 0,
          costTotal: 0
        };
        existing.quantity += item.quantity;
        existing.revenue += item.total;
        const unitCost = item.product.cost || 0;
        existing.costTotal += unitCost * item.quantity;
        productSales.set(key, existing);
      });
    });

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(p => ({ name: p.name, quantity: p.quantity, revenue: p.revenue }));

    this.topProducts.set(topProducts);

    const itemRows: ItemSalesRow[] = Array.from(productSales.values()).map(p => {
      const margin = p.revenue - p.costTotal;
      const marginRate = p.revenue > 0 ? margin / p.revenue : 0;
      const avgPrice = p.quantity > 0 ? p.revenue / p.quantity : 0;
      return {
        productId: p.productId,
        name: p.name,
        quantity: p.quantity,
        revenue: p.revenue,
        avgPrice,
        cost: p.costTotal,
        margin,
        marginRate
      };
    }).sort((a, b) => b.revenue - a.revenue);

    this.itemSales.set(itemRows);

    this.computePaymentSummary(filteredOrders);
  }

  async loadInventoryData() {
    await this.productsService.loadProducts();
    await this.productsService.loadCategories();
    await this.loadInventoryVariance();
  }

  async loadInventoryVariance() {
    try {
      await this.sqlite.ensureInitialized();
      const { startDate, endDate } = this.getDateRange();

      // Fetch all inventory adjustment records
      const allRecords = await this.sqlite.getInventoryRecords(1000);

      // Filter by date range
      const recordsInPeriod = allRecords.filter(r => {
        const recDate = new Date(r.created_at || 0);
        return recDate >= startDate && recDate <= endDate;
      });

      // Aggregate by product_id
      const productMap = new Map<string, { name: string; netQty: number; netValue: number }>();
      const allProducts = this.productsService.products();

      for (const rec of recordsInPeriod) {
        const product = allProducts.find(p => p._id === rec.product_id);
        if (!product) continue;

        const key = rec.product_id;
        const existing = productMap.get(key) || {
          name: product.name,
          netQty: 0,
          netValue: 0
        };

        existing.netQty += rec.quantity;
        existing.netValue += rec.quantity * (product.cost || 0);

        productMap.set(key, existing);
      }

      // Build variance rows
      const varianceRows: InventoryVarianceRow[] = Array.from(productMap.entries())
        .map(([productId, data]) => ({
          productId,
          name: data.name,
          netQuantity: data.netQty,
          netValue: data.netValue
        }))
        .sort((a, b) => Math.abs(b.netValue) - Math.abs(a.netValue));

      this.inventoryVariance.set(varianceRows);

      // Compute summary
      let totalPos = 0, totalNeg = 0, netQty = 0, netValue = 0;
      for (const row of varianceRows) {
        if (row.netQuantity > 0) {
          totalPos += row.netQuantity;
        } else {
          totalNeg += row.netQuantity;
        }
        netQty += row.netQuantity;
        netValue += row.netValue;
      }

      this.inventoryVarianceSummary.set({
        totalPositiveQty: totalPos,
        totalNegativeQty: totalNeg,
        netQuantity: netQty,
        netValue
      });
    } catch (error) {
      console.error('Error loading inventory variance:', error);
    }
  }

  async loadCustomerData() {
    await this.customersService.loadCustomers();
    
    // Get top customers (this would need order data)
    const { startDate, endDate } = this.getDateRange();
    const orders = await this.ordersService.getOrders(startDate, endDate);
    
    const customerSales = new Map<string, { 
      name: string; 
      phone: string;
      totalSpent: number; 
      orderCount: number 
    }>();
    
    orders.forEach(order => {
      if (order.customer) {
        const key = order.customer._id;
        const existing = customerSales.get(key) || {
          name: order.customer.name,
          phone: order.customer.phone,
          totalSpent: 0,
          orderCount: 0
        };
        existing.totalSpent += order.total;
        existing.orderCount += 1;
        customerSales.set(key, existing);
      }
    });

    const topCustomers = Array.from(customerSales.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    this.topCustomers.set(topCustomers);
  }

  private getOrdersForCurrentFilters(allOrders: Order[] = this.ordersForPeriod()): Order[] {
    const paymentFilter = this.paymentFilter();
    if (paymentFilter === 'all') {
      return allOrders;
    }

    return allOrders.filter(order => {
      const payments = (order.payment && order.payment.length > 0)
        ? order.payment
        : [{ type: order.paymentMethod as Payment['type'], amount: order.total }];
      return payments.some(p => p.type === paymentFilter);
    });
  }

  private computePaymentSummary(orders: Order[]): void {
    const summaryMap = new Map<Payment['type'], PaymentSummaryRow>();

    for (const order of orders) {
      const payments = (order.payment && order.payment.length > 0)
        ? order.payment
        : [{ type: order.paymentMethod as Payment['type'], amount: order.total }];

      const countedTypes = new Set<Payment['type']>();

      for (const p of payments) {
        const key = p.type;
        if (!key) continue;

        const existing = summaryMap.get(key) || {
          type: key,
          totalAmount: 0,
          paymentCount: 0,
          orderCount: 0
        };

        existing.totalAmount += p.amount;
        existing.paymentCount += 1;

        if (!countedTypes.has(key)) {
          existing.orderCount += 1;
          countedTypes.add(key);
        }

        summaryMap.set(key, existing);
      }
    }

    const rows = Array.from(summaryMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
    this.paymentSummary.set(rows);
  }

  async loadVoidData() {
    try {
      await this.sqlite.ensureInitialized();
      const records = await this.sqlite.getVoidRecords(500);
      this.voids.set(records);

      const summary: VoidSummary = records.reduce(
        (acc, v) => {
          acc.totalAmount += v.total || 0;
          acc.totalQuantity += v.quantity || 0;
          acc.count += 1;
          return acc;
        },
        { totalAmount: 0, totalQuantity: 0, count: 0 }
      );

      this.voidSummary.set(summary);

      const byUserMap = new Map<string, VoidByUser>();
      for (const v of records) {
        const key = v.created_by || 'Unknown';
        const existing = byUserMap.get(key) || {
          createdBy: key,
          count: 0,
          totalAmount: 0
        };
        existing.count += 1;
        existing.totalAmount += v.total || 0;
        byUserMap.set(key, existing);
      }

      const byUser = Array.from(byUserMap.values()).sort((a, b) => b.count - a.count);
      this.voidsByUser.set(byUser);
    } catch (error) {
      console.error('Error loading void data:', error);
    }
  }

  private initializeWorkperiodSelection(): void {
    const current = this.workperiodsService.currentWorkperiod();
    const recent = this.workperiodsService.recentWorkperiods();

    if (current && current.id) {
      this.selectedWorkperiodId.set(current.id);
      this.loadWorkperiodMetrics();
      return;
    }

    if (recent.length > 0 && recent[0].id) {
      this.selectedWorkperiodId.set(recent[0].id);
      this.loadWorkperiodMetrics();
    }
  }

  getSelectedWorkperiod(): WorkperiodRow | null {
    const id = this.selectedWorkperiodId();
    if (!id) return null;

    const current = this.workperiodsService.currentWorkperiod();
    if (current && current.id === id) {
      return current;
    }

    const fromRecent = this.workperiodsService.recentWorkperiods().find(wp => wp.id === id);
    return fromRecent || null;
  }

  async selectWorkperiod(wp: WorkperiodRow): Promise<void> {
    if (!wp.id) return;
    this.selectedWorkperiodId.set(wp.id);
    await this.loadWorkperiodMetrics();
  }

  async onOpenWorkperiodClick(): Promise<void> {
    try {
      await this.workperiodsService.openWorkperiod();
      this.initializeWorkperiodSelection();
    } catch (error) {
      console.error('Error opening workperiod from reports page:', error);
      this.showToast('Error opening workperiod');
    }
  }

  async onCloseWorkperiodClick(): Promise<void> {
    try {
      await this.workperiodsService.closeCurrentWorkperiod();
      this.initializeWorkperiodSelection();
    } catch (error) {
      console.error('Error closing workperiod from reports page:', error);
      this.showToast('Error closing workperiod');
    }
  }

  private getWorkperiodDateRange(wp: WorkperiodRow): { start: Date; end: Date } {
    const start = new Date(wp.start_time);
    const end = wp.end_time ? new Date(wp.end_time) : new Date();
    return { start, end };
  }

  async loadWorkperiodMetrics(): Promise<void> {
    const wp = this.getSelectedWorkperiod();
    if (!wp) {
      this.workperiodSalesSummary.set({
        totalSales: 0,
        totalOrders: 0,
        averageOrderValue: 0
      });
      this.workperiodPaymentSummary.set([]);
      this.waiterPerformance.set([]);
      this.tablePerformance.set([]);
      this.workperiodVoids.set([]);
      this.workperiodVoidSummary.set({ totalAmount: 0, totalQuantity: 0, count: 0 });
      return;
    }

    const { start, end } = this.getWorkperiodDateRange(wp);

    try {
      const orders = await this.ordersService.getOrders(start, end);

      // Sales summary
      const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
      const totalOrders = orders.length;
      const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
      this.workperiodSalesSummary.set({
        totalSales,
        totalOrders,
        averageOrderValue
      });

      // Payment breakdown
      this.workperiodPaymentSummary.set(this.computePaymentSummaryForOrders(orders));

      // Waiter performance
      const waiterMap = new Map<string, { waiterId: string; waiterName: string; orderCount: number; totalSales: number; covers: number }>();
      const waiters = this.waitersService.waiters();

      for (const order of orders) {
        if (!order.waiterId) continue;
        const id = order.waiterId;
        const existing = waiterMap.get(id) || {
          waiterId: id,
          waiterName: waiters.find(w => w._id === id)?.name || 'Unknown',
          orderCount: 0,
          totalSales: 0,
          covers: 0
        };
        existing.orderCount += 1;
        existing.totalSales += order.total;
        if (typeof order.covers === 'number') {
          existing.covers += order.covers;
        }
        waiterMap.set(id, existing);
      }

      const waiterRows: WaiterPerformanceRow[] = Array.from(waiterMap.values()).map(row => ({
        waiterId: row.waiterId,
        waiterName: row.waiterName,
        orderCount: row.orderCount,
        totalSales: row.totalSales,
        covers: row.covers,
        averageOrderValue: row.orderCount > 0 ? row.totalSales / row.orderCount : 0,
        averagePerCover: row.covers > 0 ? row.totalSales / row.covers : 0
      })).sort((a, b) => b.totalSales - a.totalSales);

      this.waiterPerformance.set(waiterRows);

      // Table performance
      const tableMap = new Map<string, { tableId: string; tableLabel: string; orderCount: number; totalSales: number; covers: number }>();
      const tables = this.tablesService.tables();

      for (const order of orders) {
        if (!order.tableId) continue;
        const id = order.tableId;
        const table = tables.find(t => t._id === id);
        const label = table ? (table.name || table.number || id) : id;
        const existing = tableMap.get(id) || {
          tableId: id,
          tableLabel: label,
          orderCount: 0,
          totalSales: 0,
          covers: 0
        };
        existing.orderCount += 1;
        existing.totalSales += order.total;
        if (typeof order.covers === 'number') {
          existing.covers += order.covers;
        }
        tableMap.set(id, existing);
      }

      const tableRows: TablePerformanceRow[] = Array.from(tableMap.values()).map(row => ({
        tableId: row.tableId,
        tableLabel: row.tableLabel,
        orderCount: row.orderCount,
        totalSales: row.totalSales,
        covers: row.covers,
        averagePerCover: row.covers > 0 ? row.totalSales / row.covers : 0
      })).sort((a, b) => b.totalSales - a.totalSales);
      this.tablePerformance.set(tableRows);

      // Workperiod voids
      const allVoids = this.voids();
      const startTime = start.getTime();
      const endTime = end.getTime();
      const periodVoids = allVoids.filter(v => {
        if (!v.created_at) return false;
        const ts = Date.parse(v.created_at);
        return ts >= startTime && ts <= endTime;
      });

      this.workperiodVoids.set(periodVoids);

      const wpVoidSummary: VoidSummary = periodVoids.reduce(
        (acc, v) => {
          acc.totalAmount += v.total || 0;
          acc.totalQuantity += v.quantity || 0;
          acc.count += 1;
          return acc;
        },
        { totalAmount: 0, totalQuantity: 0, count: 0 }
      );

      this.workperiodVoidSummary.set(wpVoidSummary);
    } catch (error) {
      console.error('Error loading workperiod metrics:', error);
    }
  }

  private computePaymentSummaryForOrders(orders: Order[]): PaymentSummaryRow[] {
    const summaryMap = new Map<Payment['type'], PaymentSummaryRow>();

    for (const order of orders) {
      const payments = (order.payment && order.payment.length > 0)
        ? order.payment
        : [{ type: order.paymentMethod as Payment['type'], amount: order.total }];

      const countedTypes = new Set<Payment['type']>();

      for (const p of payments) {
        const key = p.type;
        if (!key) continue;

        const existing = summaryMap.get(key) || {
          type: key,
          totalAmount: 0,
          paymentCount: 0,
          orderCount: 0
        };

        existing.totalAmount += p.amount;
        existing.paymentCount += 1;

        if (!countedTypes.has(key)) {
          existing.orderCount += 1;
          countedTypes.add(key);
        }

        summaryMap.set(key, existing);
      }
    }

    return Array.from(summaryMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }

  private getDateRange(): { startDate: Date; endDate: Date } {
    let startDate: Date;
    let endDate = new Date();

    switch (this.selectedPeriod()) {
      case 'today':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      
      case 'year':
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      
      case 'custom':
        startDate = new Date(this.startDate());
        endDate = new Date(this.endDate());
        break;
      
      default:
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
    }

    return { startDate, endDate };
  }

  async selectPeriod(period: 'today' | 'week' | 'month' | 'year' | 'custom') {
    this.selectedPeriod.set(period);
    
    if (period === 'custom') {
      this.showDateModal.set(true);
    } else {
      await this.loadData();
    }
  }

  async applyDateFilter() {
    this.showDateModal.set(false);
    await this.loadData();
  }

  selectReport(report: 'sales' | 'inventory' | 'customers' | 'voids' | 'items' | 'payments') {
    this.selectedReport.set(report);
    setTimeout(() => {
      this.renderCharts();
    }, 100);
  }

  private renderCharts() {
    this.destroyCharts();

    switch (this.selectedReport()) {
      case 'sales':
        this.renderSalesChart();
        this.renderProductsChart();
        break;
      case 'inventory':
        this.renderCategoryChart();
        break;
      case 'customers':
        // Customer charts could be added here
        break;
    }
  }

  private renderSalesChart() {
    if (!this.salesChartRef?.nativeElement) return;

    const data = this.dailySales();
    
    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: data.map(d => d.date),
        datasets: [{
          label: 'Sales (ZMW)',
          data: data.map(d => d.sales),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    };

    this.salesChart = new Chart(this.salesChartRef.nativeElement, config);
  }

  private renderProductsChart() {
    if (!this.productsChartRef?.nativeElement) return;

    const data = this.topProducts().slice(0, 5);
    
    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: data.map(p => p.name),
        datasets: [{
          label: 'Revenue (ZMW)',
          data: data.map(p => p.revenue),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    };

    this.productsChart = new Chart(this.productsChartRef.nativeElement, config);
  }

  private renderCategoryChart() {
    if (!this.categoryChartRef?.nativeElement) return;

    const products = this.productsService.products();
    const categories = this.productsService.categories();
    
    const categoryData = categories.map(cat => {
      const categoryProducts = products.filter(p => p.category === cat._id);
      return {
        name: cat.name,
        count: categoryProducts.length,
        value: categoryProducts.reduce((sum, p) => sum + (p.quantity * p.cost), 0)
      };
    });

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: categoryData.map(c => c.name),
        datasets: [{
          label: 'Inventory Value',
          data: categoryData.map(c => c.value),
          backgroundColor: [
            'rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 206, 86, 0.5)',
            'rgba(75, 192, 192, 0.5)',
            'rgba(153, 102, 255, 0.5)',
            'rgba(255, 159, 64, 0.5)'
          ],
          borderColor: [
            'rgb(255, 99, 132)',
            'rgb(54, 162, 235)',
            'rgb(255, 206, 86)',
            'rgb(75, 192, 192)',
            'rgb(153, 102, 255)',
            'rgb(255, 159, 64)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    };

    this.categoryChart = new Chart(this.categoryChartRef.nativeElement, config);
  }

  private destroyCharts() {
    if (this.salesChart) {
      this.salesChart.destroy();
      this.salesChart = null;
    }
    if (this.productsChart) {
      this.productsChart.destroy();
      this.productsChart = null;
    }
    if (this.categoryChart) {
      this.categoryChart.destroy();
      this.categoryChart = null;
    }
  }

  async exportReport() {
    try {
      if (typeof window !== 'undefined' && 'print' in window) {
        window.print();
      } else {
        await this.showToast('Print/export not supported on this device');
      }
    } catch (error) {
      console.error('Error printing report:', error);
      await this.showToast('Error printing report');
    }
  }

  openMenu() {
    this.menuCtrl.open();
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }
}
