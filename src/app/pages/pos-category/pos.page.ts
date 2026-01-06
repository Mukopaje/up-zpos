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
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonChip,
  IonSpinner,
  IonSplitPane,
  IonInput,
  IonSegment,
  IonSegmentButton,
  IonFab,
  IonFabButton,
  MenuController,
  AlertController,
  ToastController,
  LoadingController,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  cart, 
  search, 
  barcode, 
  add, 
  remove, 
  trash, 
  checkmark, 
  close, 
  person, 
  cash, 
  card,
  phonePortrait,
  menuOutline,
  arrowBack
} from 'ionicons/icons';

import { Product, CartItem, Customer, Payment } from '../../models';
import { ProductsService } from '../../core/services/products.service';
import { CartService } from '../../core/services/cart.service';
import { CustomersService } from '../../core/services/customers.service';
import { OrdersService } from '../../core/services/orders.service';
import { PrintService } from '../../core/services/print.service';
import { BarcodeService } from '../../core/services/barcode.service';
import { SettingsService } from '../../core/services/settings.service';
import { ReceiptModalComponent } from '../checkout/receipt-modal/receipt-modal.component';

@Component({
  selector: 'app-pos-category',
  templateUrl: './pos-category.page.html',
  styleUrls: ['./pos-category.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSearchbar,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonList,
    IonItem,
    IonLabel,
    IonText,
    IonChip,
    IonSpinner,
    IonSplitPane,
    IonInput,
    IonSegment,
    IonSegmentButton,
    IonFab,
    IonFabButton
  ]
})
export class PosCategoryPage implements OnInit {
  private router = inject(Router);
  private menuCtrl = inject(MenuController);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  private modalCtrl = inject(ModalController);
  private productsService = inject(ProductsService);
  private cartService = inject(CartService);
  private customersService = inject(CustomersService);
  private ordersService = inject(OrdersService);
  private printService = inject(PrintService);
  private barcodeService = inject(BarcodeService);
  private settingsService = inject(SettingsService);

  // State
  products = this.productsService.products;
  categories = this.productsService.categories;
  cartItems = this.cartService.cartItems;
  cartSummary = this.cartService.summary;
  selectedCategory = signal<string>('all');
  searchQuery = signal<string>('');
  isLoading = this.productsService.isLoading;
  isScanning = this.barcodeService.isScanning;
  
  // Customer
  selectedCustomer = signal<Customer | null>(null);
  
  // Payment
  paymentType = signal<'cash' | 'card' | 'mobile' | 'credit'>('cash');
  amountPaid = signal<number>(0);
  cashReceived = signal<number>(0);
  cardAmount = signal<number>(0);
  mobileAmount = signal<number>(0);
  notes = signal<string>('');
  
  // Multi-payment
  payments = signal<Payment[]>([]);

  // Mobile view state
  currentView = signal<'products' | 'cart'>('products');
  isMobile = signal<boolean>(false);

  // Computed
  filteredProducts = computed(() => {
    let filtered = this.products();

    // Filter by category
    if (this.selectedCategory() !== 'all') {
      filtered = filtered.filter(p => p.category === this.selectedCategory());
    }

    // Filter by search query
    const query = this.searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.barcode.includes(query)
      );
    }

    return filtered;
  });

  change = computed(() => {
    const paid = this.amountPaid();
    const total = this.cartSummary().total;
    return Math.max(0, paid - total);
  });

  insufficientPayment = computed(() => {
    const paid = this.amountPaid();
    const total = this.cartSummary().total;
    
    // For credit payment, check customer credit limit
    if (this.paymentType() === 'credit') {
      const customer = this.selectedCustomer();
      if (!customer) return true;
      
      const availableCredit = customer.creditLimit - customer.balance;
      return total > availableCredit;
    }
    
    return paid < total;
  });

  constructor() {
    this.registerIcons();
  }

  private registerIcons() {
    addIcons({ 
      cart, 
      search, 
      barcode, 
      add, 
      remove, 
      trash, 
      checkmark, 
      close,
      person,
      cash,
      card,
      'phone-portrait': phonePortrait,
      'menu-outline': menuOutline,
      'arrow-back': arrowBack
    });
  }

  async ngOnInit() {
    this.detectMobile();
    window.addEventListener('resize', () => this.detectMobile());
    await this.loadData();
  }

  private detectMobile() {
    this.isMobile.set(window.innerWidth < 768);
  }

  openMenu() {
    this.menuCtrl.open();
  }

  viewCart() {
    if (this.isMobile()) {
      this.currentView.set('cart');
    }
  }

  backToProducts() {
    this.currentView.set('products');
  }

  async ionViewWillEnter() {
    await this.loadData();
  }

  private async loadData() {
    this.isLoading.set(true);
    try {
      await Promise.all([
        this.productsService.loadProducts(),
        this.productsService.loadCategories(),
        this.customersService.loadCustomers()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      this.showToast('Error loading data');
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearchChange(event: any) {
    this.searchQuery.set(event.detail.value || '');
  }

  selectCategory(categoryId: string) {
    this.selectedCategory.set(categoryId);
  }

  /**
   * Barcode scanning
   */
  async scanBarcode() {
    try {
      const result = await this.barcodeService.scan();
      
      if (result) {
        await this.lookupByBarcode(result.text);
      } else if (this.barcodeService.scanError()) {
        this.manualBarcodeEntry();
      }
    } catch (error: any) {
      console.error('Barcode scan error:', error);
      this.showToast('Failed to scan barcode');
    }
  }

  async lookupByBarcode(barcode: string) {
    if (!this.barcodeService.isValidBarcode(barcode)) {
      this.showToast('Invalid barcode format');
      return;
    }

    const product = this.products().find(p => p.barcode === barcode);
    
    if (product) {
      this.addToCart(product);
      this.showToast(`${product.name} added from barcode scan`);
    } else {
      this.showToast(`Product not found: ${this.barcodeService.formatBarcode(barcode)}`);
    }
  }

  async manualBarcodeEntry() {
    const alert = await this.alertCtrl.create({
      header: 'Enter Barcode',
      message: 'Camera not available. Please enter barcode manually.',
      inputs: [
        {
          name: 'barcode',
          type: 'text',
          placeholder: 'Barcode number',
          attributes: {
            inputmode: 'numeric'
          }
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Lookup',
          handler: (data) => {
            if (data.barcode) {
              this.lookupByBarcode(data.barcode);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Cart management
   */
  addToCart(product: Product) {
    this.cartService.addItem(product, 1);
  }

  updateQuantity(item: CartItem, change: number) {
    if (change > 0) {
      this.cartService.incrementItem(item.product._id, change);
    } else {
      this.cartService.decrementItem(item.product._id);
    }
  }

  async editQuantity(item: CartItem) {
    const alert = await this.alertCtrl.create({
      header: 'Edit Quantity',
      inputs: [
        {
          name: 'quantity',
          type: 'number',
          value: item.quantity,
          min: 1,
          placeholder: 'Quantity'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Update',
          handler: (data) => {
            const qty = parseInt(data.quantity);
            if (qty > 0) {
              this.cartService.updateQuantity(item.product._id, qty);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  removeFromCart(item: CartItem) {
    this.cartService.removeItem(item.product._id);
  }

  async clearCart() {
    const alert = await this.alertCtrl.create({
      header: 'Clear Cart',
      message: 'Are you sure you want to clear all items?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Clear',
          role: 'destructive',
          handler: () => {
            this.cartService.clearCart();
            this.resetPayment();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Customer selection
   */
  async selectCustomer() {
    const customers = this.customersService.activeCustomers();
    
    const alert = await this.alertCtrl.create({
      header: 'Select Customer',
      inputs: [
        {
          name: 'search',
          type: 'text',
          placeholder: 'Search customers...'
        },
        ...customers.map(c => ({
          type: 'radio' as const,
          label: `${c.name} - ${c.phone}`,
          value: c._id,
          checked: this.selectedCustomer()?._id === c._id
        }))
      ],
      buttons: [
        {
          text: 'None',
          handler: () => {
            this.selectedCustomer.set(null);
          }
        },
        {
          text: 'Select',
          handler: (customerId) => {
            const customer = customers.find(c => c._id === customerId);
            if (customer) {
              this.selectedCustomer.set(customer);
              this.showToast(`Customer: ${customer.name}`);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  clearCustomer() {
    this.selectedCustomer.set(null);
  }

  /**
   * Payment processing
   */
  selectPaymentType(type: 'cash' | 'card' | 'mobile' | 'credit') {
    this.paymentType.set(type);
    
    // Auto-set amount for non-credit payments
    if (type !== 'credit') {
      this.amountPaid.set(this.cartSummary().total);
    }
  }

  setQuickCash(amount: number) {
    this.cashReceived.set(amount);
    this.amountPaid.set(amount);
  }

  addQuickCash(amount: number) {
    const newAmount = this.cashReceived() + amount;
    this.cashReceived.set(newAmount);
    this.amountPaid.set(newAmount);
  }

  calculateTotal() {
    const total = this.cashReceived() + this.cardAmount() + this.mobileAmount();
    this.amountPaid.set(total);
  }

  async processPayment() {
    // Validation
    if (!this.cartService.hasItems()) {
      this.showToast('Cart is empty');
      return;
    }

    if (this.paymentType() === 'credit' && !this.selectedCustomer()) {
      this.showToast('Please select a customer for credit payment');
      return;
    }

    if (this.insufficientPayment()) {
      if (this.paymentType() === 'credit') {
        this.showToast('Customer has insufficient credit limit');
      } else {
        this.showToast('Insufficient payment amount');
      }
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Processing payment...'
    });
    await loading.present();

    try {
      // Build payment data
      const orderData: any = {
        paymentType: this.paymentType(),
        amountPaid: this.amountPaid(),
        notes: this.notes()
      };

      if (this.selectedCustomer()) {
        orderData.customer = this.selectedCustomer();
        orderData.customerId = this.selectedCustomer()?._id;
      }

      // Create order
      const order = await this.ordersService.createOrder(orderData);

      // If credit payment, update customer balance
      if (this.paymentType() === 'credit' && this.selectedCustomer()) {
        await this.customersService.addCredit(
          this.selectedCustomer()!._id,
          this.cartSummary().total
        );
      }

      await loading.dismiss();

      const appSettings = this.settingsService.settings();
      const autoPrint = appSettings.autoPrintReceipt ?? false;
      const showReceiptModal = appSettings.showReceiptModalAfterPayment ?? true;

      if (autoPrint) {
        // Auto-print and immediately reset for the next transaction
        await this.printReceipt(order);
        this.resetTransaction();
        await this.showToast('Payment successful. Receipt printed.');
      } else if (showReceiptModal) {
        // Show rich receipt modal so user can choose print/email
        await this.openReceiptModal(order);
        this.resetTransaction();
      } else {
        // Fallback to simple success alert
        await this.showSuccessAlert(order.orderNumber || order.invoice_no || '', this.change());
        this.resetTransaction();
      }
      
    } catch (error) {
      await loading.dismiss();
      console.error('Payment error:', error);
      this.showToast('Error processing payment');
    }
  }

  async printReceipt(order: any) {
    try {
      const receiptData = {
        orderId: order._id,
        orderNumber: order.orderNumber || order.invoice_no,
        timestamp: order.timestamp || new Date(order.createdAt).toISOString(),
        user: order.user || order.createdBy,
        items: order.items.map((item: any) => ({
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

      await this.printService.printReceipt(receiptData);
    } catch (error) {
      console.error('Print error:', error);
    }
  }

  private async openReceiptModal(order: any) {
    const appSettings = this.settingsService.settings();
    const businessName = appSettings.businessName || 'ZPOS';

    const modal = await this.modalCtrl.create({
      component: ReceiptModalComponent,
      componentProps: {
        order,
        businessName,
        initialEmail: order.customer?.email || null,
        onPrint: async () => {
          await this.printReceipt(order);
        },
        onEmail: async (email?: string) => {
          if (!email) return;
          try {
            await this.ordersService.queueReceiptEmail(order, email, businessName);
            await this.showToast('Email receipt queued');
          } catch (err) {
            console.error('Error queueing email receipt:', err);
            await this.showToast('Failed to queue email receipt');
          }
        }
      }
    });

    await modal.present();
    await modal.onDidDismiss();
  }

  async showSuccessAlert(orderNumber: string, change: number) {
    const alert = await this.alertCtrl.create({
      header: 'Payment Successful',
      message: `
        <p><strong>Order:</strong> ${orderNumber}</p>
        <p><strong>Total:</strong> ZMW ${this.cartSummary().total.toFixed(2)}</p>
        <p><strong>Paid:</strong> ZMW ${this.amountPaid().toFixed(2)}</p>
        ${change > 0 ? `<p><strong>Change:</strong> ZMW ${change.toFixed(2)}</p>` : ''}
      `,
      buttons: ['OK']
    });

    await alert.present();
  }

  resetTransaction() {
    this.cartService.clearCart();
    this.resetPayment();
    this.selectedCustomer.set(null);
    this.notes.set('');
  }

  resetPayment() {
    this.paymentType.set('cash');
    this.amountPaid.set(0);
    this.cashReceived.set(0);
    this.cardAmount.set(0);
    this.mobileAmount.set(0);
    this.payments.set([]);
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
