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
  cash
} from 'ionicons/icons';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

import { OrdersService } from '../../core/services/orders.service';
import { ProductsService } from '../../core/services/products.service';
import { CustomersService } from '../../core/services/customers.service';

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
  private toastCtrl = inject(ToastController);

  @ViewChild('salesChart') salesChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('productsChart') productsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChartRef!: ElementRef<HTMLCanvasElement>;

  // State
  selectedReport = signal<'sales' | 'inventory' | 'customers'>('sales');
  selectedPeriod = signal<'today' | 'week' | 'month' | 'year' | 'custom'>('week');
  isLoading = signal<boolean>(false);
  showDateModal = signal<boolean>(false);
  
  startDate = signal<string>(this.getDateString(-7));
  endDate = signal<string>(this.getDateString(0));

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
      cash
    });
  }

  async ngOnInit() {
    await this.loadData();
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

    // Get orders for chart
    const orders = await this.ordersService.getOrders(startDate, endDate);
    
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

    // Calculate top products
    const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
    
    orders.forEach(order => {
      order.items.forEach(item => {
        const key = item.product._id;
        const existing = productSales.get(key) || { 
          name: item.product.name, 
          quantity: 0, 
          revenue: 0 
        };
        existing.quantity += item.quantity;
        existing.revenue += item.total;
        productSales.set(key, existing);
      });
    });

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    this.topProducts.set(topProducts);
  }

  async loadInventoryData() {
    await this.productsService.loadProducts();
    await this.productsService.loadCategories();
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

  selectReport(report: 'sales' | 'inventory' | 'customers') {
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
    // TODO: Implement export to PDF/Excel
    this.showToast('Export feature coming soon');
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
