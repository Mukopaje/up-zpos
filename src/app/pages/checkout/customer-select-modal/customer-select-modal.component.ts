import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonBadge,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonInput,
  IonNote,
  ModalController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close, add, person, call, mail, cash } from 'ionicons/icons';

import { CustomersService } from '../../../core/services/customers.service';
import { Customer } from '../../../models';

@Component({
  selector: 'app-customer-select-modal',
  templateUrl: './customer-select-modal.component.html',
  styleUrls: ['./customer-select-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonSearchbar,
    IonList,
    IonItem,
    IonLabel,
    IonText,
    IonBadge,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonInput,
    IonNote
  ]
})
export class CustomerSelectModalComponent implements OnInit {
  private modalCtrl = inject(ModalController);
  private customersService = inject(CustomersService);
  private toastCtrl = inject(ToastController);

  // Props passed from parent
  // totalAmount: the amount that needs to be covered when using credit
  // enforceCreditLimit: when true, block selection if available credit is insufficient
  totalAmount = 0;
  enforceCreditLimit = true;

  // State
  searchQuery = signal('');
  showAddForm = signal(false);
  customers = this.customersService.activeCustomers;

  // New customer form
  newCustomer = signal({
    name: '',
    phone: '',
    email: '',
    creditLimit: 0,
    address: ''
  });

  // Filtered customers
  filteredCustomers = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) {
      return this.customers();
    }
    return this.customers().filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.phone.includes(query) ||
      c.email?.toLowerCase().includes(query)
    );
  });

  constructor() {
    addIcons({ close, add, person, call, mail, cash });
  }

  ngOnInit() {
    // Load customers
    this.customersService.loadCustomers();
  }

  onSearchChange(event: any) {
    this.searchQuery.set(event.detail.value || '');
  }

  selectCustomer(customer: Customer) {
    // When enforcing credit, block selection if available credit is not enough
    if (this.enforceCreditLimit && this.totalAmount > 0) {
      const availableCredit = this.customersService.getAvailableCredit(customer._id);

      if (this.totalAmount > availableCredit) {
        this.showToast(`Insufficient credit. Available: ${availableCredit.toFixed(2)}, Required: ${this.totalAmount.toFixed(2)}`);
        return;
      }
    }

    this.modalCtrl.dismiss(customer, 'selected');
  }

  toggleAddForm() {
    this.showAddForm.update(v => !v);
  }

  async addNewCustomer() {
    const customer = this.newCustomer();

    // Validate
    if (!customer.name || !customer.phone) {
      this.showToast('Name and phone are required');
      return;
    }

    if (customer.phone.length < 9) {
      this.showToast('Valid phone number required');
      return;
    }

    // Check for duplicate phone
    if (this.customersService.isDuplicatePhone(customer.phone)) {
      this.showToast('Customer with this phone number already exists');
      return;
    }

    try {
      const created = await this.customersService.createCustomer({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || undefined,
        address: customer.address || undefined,
        creditLimit: customer.creditLimit || 0,
        balance: 0,
        active: true
      });

      this.showToast('Customer added successfully');
      this.showAddForm.set(false);
      this.newCustomer.set({
        name: '',
        phone: '',
        email: '',
        creditLimit: 0,
        address: ''
      });

      // Auto-select the new customer
      this.selectCustomer(created);
    } catch (error) {
      console.error('Error adding customer:', error);
      this.showToast('Error adding customer');
    }
  }

  cancel() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  getAvailableCredit(customer: Customer): number {
    return this.customersService.getAvailableCredit(customer._id);
  }

  canAfford(customer: Customer): boolean {
    return this.getAvailableCredit(customer) >= this.totalAmount;
  }
}
