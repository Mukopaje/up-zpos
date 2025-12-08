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
  IonFab,
  IonFabButton,
  IonRefresher,
  IonRefresherContent,
  IonChip,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButtons,
  IonBackButton,
  IonSpinner,
  AlertController,
  ToastController,
  ModalController,
  NavController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add,
  search,
  person,
  card,
  cash,
  warning,
  checkmark,
  close,
  create,
  trash,
  arrowBack
} from 'ionicons/icons';

import { CustomersService } from '../../core/services/customers.service';
import { Customer } from '../../models';

@Component({
  selector: 'app-customers',
  templateUrl: './customers.page.html',
  styleUrls: ['./customers.page.scss'],
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
    IonFab,
    IonFabButton,
    IonRefresher,
    IonRefresherContent,
    IonChip,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButtons,
    IonBackButton,
    IonSpinner
  ]
})
export class CustomersPage implements OnInit {
  private router = inject(Router);
  private navCtrl = inject(NavController);
  private customersService = inject(CustomersService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private modalCtrl = inject(ModalController);

  // State
  customers = this.customersService.customers;
  isLoading = this.customersService.isLoading;
  searchQuery = signal<string>('');
  filterType = signal<'all' | 'active' | 'credit' | 'balance'>('all');

  // Computed
  filteredCustomers = computed(() => {
    let list = this.customers();
    
    // Apply filter type
    switch (this.filterType()) {
      case 'active':
        list = list.filter(c => c.active);
        break;
      case 'credit':
        list = list.filter(c => c.creditLimit > 0);
        break;
      case 'balance':
        list = list.filter(c => c.balance > 0);
        break;
    }

    // Apply search
    const query = this.searchQuery().toLowerCase();
    if (query) {
      list = list.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        c.email?.toLowerCase().includes(query)
      );
    }

    return list;
  });

  totalBalance = computed(() =>
    this.filteredCustomers().reduce((sum, c) => sum + c.balance, 0)
  );

  constructor() {
    this.registerIcons();
  }

  private registerIcons() {
    addIcons({
      add,
      search,
      person,
      card,
      cash,
      warning,
      checkmark,
      close,
      create,
      trash,
      'arrow-back': arrowBack
    });
  }

  async ngOnInit() {
    await this.loadCustomers();
  }

  async loadCustomers() {
    await this.customersService.loadCustomers();
  }

  onSearchChange(event: any) {
    this.searchQuery.set(event.detail.value || '');
  }

  setFilter(filter: 'all' | 'active' | 'credit' | 'balance') {
    this.filterType.set(filter);
  }

  async handleRefresh(event: any) {
    await this.loadCustomers();
    event.target.complete();
  }

  async addCustomer() {
    const alert = await this.alertCtrl.create({
      header: 'New Customer',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Customer Name',
          attributes: {
            required: true,
            minlength: 2
          }
        },
        {
          name: 'phone',
          type: 'tel',
          placeholder: 'Phone Number',
          attributes: {
            required: true,
            minlength: 9
          }
        },
        {
          name: 'email',
          type: 'email',
          placeholder: 'Email (optional)'
        },
        {
          name: 'address',
          type: 'text',
          placeholder: 'Address (optional)'
        },
        {
          name: 'creditLimit',
          type: 'number',
          placeholder: 'Credit Limit',
          value: '0'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Create',
          handler: async (data) => {
            if (!data.name || !data.phone) {
              this.showToast('Name and phone are required', 'danger');
              return false;
            }

            // Check for duplicate phone
            if (this.customersService.isDuplicatePhone(data.phone)) {
              this.showToast('A customer with this phone number already exists', 'warning');
              return false;
            }

            try {
              await this.customersService.createCustomer({
                name: data.name,
                phone: data.phone,
                email: data.email || undefined,
                address: data.address || undefined,
                creditLimit: parseFloat(data.creditLimit) || 0,
                balance: 0,
                active: true
              });

              this.showToast('Customer created successfully', 'success');
              return true;
            } catch (error: any) {
              this.showToast(error.message || 'Failed to create customer', 'danger');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async editCustomer(customer: Customer) {
    const alert = await this.alertCtrl.create({
      header: 'Edit Customer',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Customer Name',
          value: customer.name
        },
        {
          name: 'phone',
          type: 'tel',
          placeholder: 'Phone Number',
          value: customer.phone
        },
        {
          name: 'email',
          type: 'email',
          placeholder: 'Email',
          value: customer.email || ''
        },
        {
          name: 'address',
          type: 'text',
          placeholder: 'Address',
          value: customer.address || ''
        },
        {
          name: 'creditLimit',
          type: 'number',
          placeholder: 'Credit Limit',
          value: customer.creditLimit.toString()
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save',
          handler: async (data) => {
            // Check for duplicate phone (excluding current customer)
            if (data.phone !== customer.phone && 
                this.customersService.isDuplicatePhone(data.phone, customer._id)) {
              this.showToast('A customer with this phone number already exists', 'warning');
              return false;
            }

            try {
              await this.customersService.updateCustomer(customer._id, {
                name: data.name,
                phone: data.phone,
                email: data.email || undefined,
                address: data.address || undefined,
                creditLimit: parseFloat(data.creditLimit) || 0
              });

              this.showToast('Customer updated successfully', 'success');
              return true;
            } catch (error: any) {
              this.showToast(error.message || 'Failed to update customer', 'danger');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async deleteCustomer(customer: Customer) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Customer',
      message: `Are you sure you want to delete ${customer.name}?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              await this.customersService.deleteCustomer(customer._id);
              this.showToast('Customer deleted', 'medium');
            } catch (error: any) {
              this.showToast(error.message || 'Failed to delete customer', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async recordPayment(customer: Customer) {
    if (customer.balance <= 0) {
      this.showToast('No outstanding balance', 'warning');
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
              this.showToast('Invalid payment amount', 'danger');
              return false;
            }

            if (amount > customer.balance) {
              this.showToast('Payment exceeds balance', 'danger');
              return false;
            }

            try {
              await this.customersService.recordPayment(customer._id, amount);
              this.showToast(`Payment of K${amount.toFixed(2)} recorded`, 'success');
              return true;
            } catch (error: any) {
              this.showToast(error.message || 'Failed to record payment', 'danger');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  viewCustomerDetails(customer: Customer) {
    // Navigate to customer details page
    this.router.navigate(['/customer-details', customer._id]);
  }

  formatCurrency(amount: number): string {
    return `K${amount.toFixed(2)}`;
  }

  getBalanceColor(balance: number): string {
    if (balance === 0) return 'medium';
    return 'danger';
  }

  getCreditStatus(customer: Customer): string {
    if (customer.creditLimit === 0) return 'No Credit';
    const available = customer.creditLimit - customer.balance;
    return `K${available.toFixed(2)} available`;
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'medium' = 'medium') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  goBack() {
    this.navCtrl.back();
  }
}
