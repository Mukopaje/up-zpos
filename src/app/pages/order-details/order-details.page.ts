import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonBackButton,
  IonButtons,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonSpinner,
  AlertController,
  ToastController,
  LoadingController,
  NavController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBack,
  print,
  refresh,
  close,
  person,
  calendar,
  card,
  receipt
} from 'ionicons/icons';

import { Order, CartItem } from '../../models';
import { OrdersService } from '../../core/services/orders.service';
import { PrintService } from '../../core/services/print.service';

@Component({
  selector: 'app-order-details',
  templateUrl: './order-details.page.html',
  styleUrls: ['./order-details.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonBackButton,
    IonButtons,
    IonList,
    IonItem,
    IonLabel,
    IonText,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonSpinner
  ]
})
export class OrderDetailsPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private navCtrl = inject(NavController);
  private ordersService = inject(OrdersService);
  private printService = inject(PrintService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  order = signal<Order | null>(null);
  isLoading = signal<boolean>(true);

  constructor() {
    this.registerIcons();
  }

  private registerIcons() {
    addIcons({ 
      'arrow-back': arrowBack,
      print,
      refresh,
      close,
      person,
      calendar,
      card,
      receipt
    });
  }

  async ngOnInit() {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (orderId) {
      await this.loadOrder(orderId);
    } else {
      this.showToast('Order not found');
      this.navCtrl.back();
    }
  }

  async loadOrder(orderId: string) {
    this.isLoading.set(true);
    try {
      const order = await this.ordersService.getOrder(orderId);
      if (order) {
        this.order.set(order);
      } else {
        this.showToast('Order not found');
        this.navCtrl.back();
      }
    } catch (error) {
      console.error('Error loading order:', error);
      this.showToast('Error loading order');
      this.navCtrl.back();
    } finally {
      this.isLoading.set(false);
    }
  }

  async printReceipt() {
    const order = this.order();
    if (!order) return;

    const loading = await this.loadingCtrl.create({
      message: 'Printing...'
    });
    await loading.present();

    try {
      const receiptData = {
        orderId: order._id,
        orderNumber: order.orderNumber || order.invoice_no || '',
        timestamp: order.timestamp || new Date(order.createdAt).toISOString(),
        user: order.user || order.createdBy,
        items: order.items.map(item => ({
          name: item.name || item.product.name,
          quantity: item.quantity || item.Quantity,
          price: item.price,
          total: item.total || item.itemTotalPrice
        })),
        subtotal: order.subtotal || order.subTotalPrice || 0,
        tax: order.tax || order.taxAmount || 0,
        discount: order.discount || order.discountAmount || 0,
        total: order.total || order.grandTotal || 0,
        amountPaid: order.amountPaid,
        change: order.change,
        paymentMethod: order.paymentMethod || order.paymentOption || '',
        customer: order.customer,
        notes: order.notes
      };

      const success = await this.printService.printReceipt(receiptData);
      
      await loading.dismiss();

      if (success) {
        this.showToast('Receipt printed successfully');
      } else {
        this.showToast('Printing failed or printer not configured');
      }
    } catch (error) {
      await loading.dismiss();
      console.error('Print error:', error);
      this.showToast('Error printing receipt');
    }
  }

  async processReturn(item: CartItem) {
    const order = this.order();
    if (!order) return;

    const alert = await this.alertCtrl.create({
      header: 'Process Return',
      message: `Return ${item.product.name}?`,
      inputs: [
        {
          name: 'quantity',
          type: 'number',
          placeholder: 'Quantity to return',
          min: 1,
          max: item.quantity,
          value: item.quantity
        },
        {
          name: 'reason',
          type: 'textarea',
          placeholder: 'Reason for return'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Process Return',
          handler: async (data) => {
            if (!data.quantity || data.quantity <= 0) {
              this.showToast('Invalid quantity');
              return false;
            }

            if (data.quantity > item.quantity) {
              this.showToast('Quantity exceeds available amount');
              return false;
            }

            await this.executeReturn(
              order._id,
              item.product._id,
              parseInt(data.quantity),
              data.reason || 'No reason provided'
            );
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  private async executeReturn(
    orderId: string,
    productId: string,
    quantity: number,
    reason: string
  ) {
    const loading = await this.loadingCtrl.create({
      message: 'Processing return...'
    });
    await loading.present();

    try {
      await this.ordersService.processReturn(orderId, productId, quantity, reason);
      await this.loadOrder(orderId);
      await loading.dismiss();
      this.showToast('Return processed successfully');
    } catch (error) {
      await loading.dismiss();
      console.error('Return error:', error);
      this.showToast('Error processing return');
    }
  }

  async cancelOrder() {
    const order = this.order();
    if (!order) return;

    const alert = await this.alertCtrl.create({
      header: 'Cancel Order',
      message: 'Are you sure you want to cancel this order? This cannot be undone.',
      buttons: [
        {
          text: 'No',
          role: 'cancel'
        },
        {
          text: 'Yes, Cancel Order',
          role: 'destructive',
          handler: async () => {
            // TODO: Implement order cancellation
            this.showToast('Order cancellation not yet implemented');
          }
        }
      ]
    });

    await alert.present();
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
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  goBack() {
    this.navCtrl.back();
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
