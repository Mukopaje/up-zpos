import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSegment,
  IonSegmentButton,
  IonButtons,
  IonBackButton,
  IonSpinner,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  person,
  cash,
  card,
  list,
  arrowBack,
  close,
  checkmark
} from 'ionicons/icons';

import { CustomersService } from '../../core/services/customers.service';
import { OrdersService } from '../../core/services/orders.service';
import { Customer, Order } from '../../models';

@Component({
  selector: 'app-customer-details',
  templateUrl: './customer-details.page.html',
  styleUrls: ['./customer-details.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonText,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSegment,
    IonSegmentButton,
    IonButtons,
    IonBackButton,
    IonSpinner
  ]
})
export class CustomerDetailsPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private customersService = inject(CustomersService);
  private ordersService = inject(OrdersService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  customer = signal<Customer | null>(null);
  isLoading = signal<boolean>(false);
  section = signal<'info' | 'orders' | 'account'>('info');
  orders = signal<Order[]>([]);

  constructor() {
    this.registerIcons();
  }

  private registerIcons() {
    addIcons({
      person,
      cash,
      card,
      list,
      'arrow-back': arrowBack,
      close,
      checkmark
    });
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }

    this.isLoading.set(true);
    try {
      const customer = await this.customersService.getCustomer(id);
      this.customer.set(customer);

      await this.loadCustomerOrders(id);
    } catch (error) {
      console.error('Error loading customer details:', error);
      await this.showToast('Failed to load customer details', 'danger');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadCustomerOrders(customerId: string) {
    try {
      const allOrders = await this.ordersService.getOrders();
      const filtered = allOrders.filter(o => o.customer?._id === customerId);
      this.orders.set(filtered);
    } catch (error) {
      console.error('Error loading customer orders:', error);
    }
  }

  setSection(section: 'info' | 'orders' | 'account') {
    this.section.set(section);
  }

  get stats() {
    const c = this.customer();
    if (!c) return null;
    return this.customersService.getCustomerStats(c._id);
  }

  formatCurrency(amount: number | undefined): string {
    if (amount === undefined) return 'K0.00';
    return `K${amount.toFixed(2)}`;
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

  getPaymentMethodLabel(method?: string): string {
    if (!method) return 'N/A';
    const map: Record<string, string> = {
      cash: 'Cash',
      card: 'Card',
      mobile: 'Mobile Money',
      credit: 'Credit',
      account: 'Account'
    };
    return map[method] || method;
  }

  async recordPayment() {
    const customer = this.customer();
    if (!customer) return;

    if (customer.balance <= 0) {
      await this.showToast('No outstanding balance', 'warning');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Record Payment',
      subHeader: `${customer.name} - Balance: K${customer.balance.toFixed(2)}`,
      inputs: [
        {
          name: 'amount',
          type: 'number',
          placeholder: 'Payment Amount',
          min: 0,
          max: customer.balance,
          value: customer.balance.toString()
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Record',
          handler: async (data) => {
            const amount = parseFloat(data.amount);

            if (!amount || amount <= 0) {
              await this.showToast('Invalid payment amount', 'danger');
              return false;
            }

            if (amount > customer.balance) {
              await this.showToast('Payment exceeds balance', 'danger');
              return false;
            }

            try {
              await this.customersService.recordPayment(customer._id, amount);
              const updated = await this.customersService.getCustomer(customer._id);
              this.customer.set(updated);
              await this.showToast(`Payment of K${amount.toFixed(2)} recorded`, 'success');
              return true;
            } catch (error: any) {
              await this.showToast(error.message || 'Failed to record payment', 'danger');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning' | 'medium' = 'medium'
  ) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
