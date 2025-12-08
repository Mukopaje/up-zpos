import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonButton,
  IonIcon,
  IonBadge,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonDatetime,
  IonModal,
  IonButtons,
  IonSpinner,
  IonChip,
  MenuController,
  AlertController,
  ToastController,
  RefresherCustomEvent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  menu, 
  search, 
  receipt, 
  calendar, 
  funnel,
  checkmark,
  close,
  arrowForward
} from 'ionicons/icons';

import { Order } from '../../models';
import { OrdersService } from '../../core/services/orders.service';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.page.html',
  styleUrls: ['./orders.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSearchbar,
    IonList,
    IonItem,
    IonLabel,
    IonText,
    IonButton,
    IonIcon,
    IonBadge,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonRefresher,
    IonRefresherContent,
    IonSegment,
    IonSegmentButton,
    IonDatetime,
    IonModal,
    IonButtons,
    IonSpinner,
    IonChip
  ]
})
export class OrdersPage implements OnInit {
  private router = inject(Router);
  private menuCtrl = inject(MenuController);
  private ordersService = inject(OrdersService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  // State
  orders = signal<Order[]>([]);
  isLoading = signal<boolean>(false);
  searchQuery = signal<string>('');
  selectedPeriod = signal<'today' | 'week' | 'month' | 'custom'>('today');
  statusFilter = signal<'all' | 'completed' | 'pending' | 'cancelled'>('all');
  showDateModal = signal<boolean>(false);
  
  // Date range for custom filter
  startDate = signal<string>(new Date().toISOString());
  endDate = signal<string>(new Date().toISOString());

  // Summary stats
  summary = computed(() => {
    const ordersList = this.filteredOrders();
    const totalSales = ordersList.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = ordersList.length;
    const averageOrder = totalOrders > 0 ? totalSales / totalOrders : 0;

    return {
      totalSales: Number(totalSales.toFixed(2)),
      totalOrders,
      averageOrder: Number(averageOrder.toFixed(2))
    };
  });

  // Filtered orders
  filteredOrders = computed(() => {
    let filtered = this.orders();

    // Filter by status
    if (this.statusFilter() !== 'all') {
      filtered = filtered.filter(order => order.status === this.statusFilter());
    }

    // Filter by search query
    const query = this.searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter(order =>
        order.orderNumber?.toLowerCase().includes(query) ||
        order.invoice_no?.toLowerCase().includes(query) ||
        order.customer?.name.toLowerCase().includes(query) ||
        order.customer?.phone.includes(query)
      );
    }

    return filtered;
  });

  constructor() {
    this.registerIcons();
  }

  private registerIcons() {
    addIcons({ 
      menu,
      search,
      receipt,
      calendar,
      funnel,
      checkmark,
      close,
      'arrow-forward': arrowForward
    });
  }

  async ngOnInit() {
    await this.loadOrders();
  }

  async ionViewWillEnter() {
    await this.loadOrders();
  }

  async loadOrders() {
    this.isLoading.set(true);
    try {
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      switch (this.selectedPeriod()) {
        case 'today':
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date();
          endDate.setHours(23, 59, 59, 999);
          break;
        
        case 'week':
          endDate = new Date();
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        
        case 'month':
          endDate = new Date();
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        
        case 'custom':
          startDate = new Date(this.startDate());
          endDate = new Date(this.endDate());
          break;
      }

      const orders = await this.ordersService.getOrders(startDate, endDate);
      this.orders.set(orders);
    } catch (error) {
      console.error('Error loading orders:', error);
      this.showToast('Error loading orders');
    } finally {
      this.isLoading.set(false);
    }
  }

  async handleRefresh(event: RefresherCustomEvent) {
    await this.loadOrders();
    event.target.complete();
  }

  onSearchChange(event: any) {
    this.searchQuery.set(event.detail.value || '');
  }

  async selectPeriod(period: 'today' | 'week' | 'month' | 'custom') {
    this.selectedPeriod.set(period);
    
    if (period === 'custom') {
      this.showDateModal.set(true);
    } else {
      await this.loadOrders();
    }
  }

  selectStatus(status: 'all' | 'completed' | 'pending' | 'cancelled') {
    this.statusFilter.set(status);
  }

  async applyDateFilter() {
    this.showDateModal.set(false);
    await this.loadOrders();
  }

  viewOrderDetails(order: Order) {
    this.router.navigate(['/order-details', order._id]);
  }

  getPaymentMethodLabel(method?: string): string {
    if (!method) return 'N/A';
    
    const labels: Record<string, string> = {
      'cash': 'Cash',
      'card': 'Card',
      'mobile': 'Mobile Money',
      'credit': 'Credit',
      'account': 'Account'
    };
    
    return labels[method] || method;
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'completed': 'success',
      'pending': 'warning',
      'cancelled': 'danger',
      'refunded': 'medium'
    };
    
    return colors[status] || 'medium';
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
