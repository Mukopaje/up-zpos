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
  IonRefresher,
  IonRefresherContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButtons,
  IonBackButton,
  IonSpinner,
  MenuController,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  search,
  cash,
  wallet,
  person,
  arrowBack,
  checkmark,
  close
} from 'ionicons/icons';

import { CustomersService } from '../../core/services/customers.service';
import { Customer } from '../../models';

@Component({
  selector: 'app-accounts',
  templateUrl: './accounts.page.html',
  styleUrls: ['./accounts.page.scss'],
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
    IonRefresher,
    IonRefresherContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButtons,
    IonBackButton,
    IonSpinner
  ]
})
export class AccountsPage implements OnInit {
  private router = inject(Router);
  private menuCtrl = inject(MenuController);
  private customersService = inject(CustomersService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  // State
  searchQuery = signal<string>('');

  // Data derives from CustomersService
  private customers = this.customersService.customers;

  accounts = computed(() => {
    const query = this.searchQuery().toLowerCase();

    let list = this.customersService.getCustomersByBalance();

    if (query) {
      list = list.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        c.email?.toLowerCase().includes(query)
      );
    }

    return list;
  });

  totalOutstanding = computed(() =>
    this.accounts().reduce((sum, c) => sum + c.balance, 0)
  );

  constructor() {
    this.registerIcons();
  }

  private registerIcons() {
    addIcons({
      search,
      cash,
      wallet,
      person,
      'arrow-back': arrowBack,
      checkmark,
      close
    });
  }

  async ngOnInit() {
    await this.customersService.loadCustomers();
  }

  async ionViewWillEnter() {
    await this.customersService.loadCustomers();
  }

  onSearchChange(event: any) {
    this.searchQuery.set(event.detail.value || '');
  }

  async handleRefresh(event: any) {
    await this.customersService.loadCustomers();
    event.target.complete();
  }

  openMenu() {
    this.menuCtrl.open();
  }

  viewCustomerDetails(customer: Customer) {
    this.router.navigate(['/customer-details', customer._id]);
  }

  async recordPayment(customer: Customer) {
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

  formatCurrency(amount: number): string {
    return `K${amount.toFixed(2)}`;
  }

  getBalanceColor(balance: number): string {
    if (balance === 0) return 'medium';
    return 'danger';
  }

  private async showToast(
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
