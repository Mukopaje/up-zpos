import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
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
  arrowBack,
  keypadOutline,
  pauseOutline
} from 'ionicons/icons';

import { Product, CartItem, Customer, Payment, HeldTransaction } from '../../models';
import { ProductsService } from '../../core/services/products.service';
import { CartService } from '../../core/services/cart.service';
import { CustomersService } from '../../core/services/customers.service';
import { OrdersService } from '../../core/services/orders.service';
import { PrintService } from '../../core/services/print.service';
import { BarcodeService } from '../../core/services/barcode.service';
import { AuthService } from '../../core/services/auth.service';
import { SqliteService } from '../../core/services/sqlite.service';

@Component({
  selector: 'app-pos',
  templateUrl: './pos.page.html',
  styleUrls: ['./pos.page.scss'],
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
export class PosPage implements OnInit {
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
  private auth = inject(AuthService);
  private sqlite = inject(SqliteService);

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

  // Held transactions (reused from legacy retail POS)
  showHeldTransactions = signal<boolean>(false);
  heldTransactions = signal<HeldTransaction[]>([]);

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

  // Desktop keyboard & on-screen keypad support
  searchBuffer = signal<string>('');
  showKeypad = signal<boolean>(false);
  keypadBuffer = signal<string>('');
  keypadDisplay = computed(() => this.keypadBuffer() || '0');
  private keydownHandler = (event: KeyboardEvent) => this.handleKeyDown(event);
  private bufferTimeout: any = null;

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
      'arrow-back': arrowBack,
      'keypad-outline': keypadOutline,
      'pause-outline': pauseOutline
    });
  }

  async ngOnInit() {
    this.detectMobile();
    window.addEventListener('resize', () => this.detectMobile());
    window.addEventListener('keydown', this.keydownHandler);
    await this.loadData();
  }

  ngOnDestroy() {
    window.removeEventListener('keydown', this.keydownHandler);
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
    }
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
   * Keyboard shortcuts and quick search
   * Typing letters anywhere will populate the search box and filter products.
   */
  private handleKeyDown(event: KeyboardEvent) {
    // Ignore when the user is typing into form fields
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'ION-INPUT' || target.tagName === 'ION-SEARCHBAR') {
      return;
    }

    // Function keys for high-speed retail operations
    if (event.key === 'F1') {
      event.preventDefault();
      this.focusSearch();
      return;
    }
    if (event.key === 'F2') {
      event.preventDefault();
      if (this.cartService.hasItems()) {
        this.goToCheckout();
      }
      return;
    }
    if (event.key === 'F3') {
      event.preventDefault();
      this.holdTransaction();
      return;
    }
    if (event.key === 'F4') {
      event.preventDefault();
      this.loadHeldTransactions();
      return;
    }

    // Escape closes held list or clears search
    if (event.key === 'Escape') {
      if (this.showHeldTransactions()) {
        this.showHeldTransactions.set(false);
      } else {
        this.searchBuffer.set('');
        this.searchQuery.set('');
      }
      return;
    }

    // Letters and basic characters for product search
    if (/^[a-zA-Z0-9 ]$/.test(event.key)) {
      event.preventDefault();
      const current = this.searchBuffer();
      const next = current + event.key;
      this.searchBuffer.set(next);
      this.searchQuery.set(next);

      if (this.bufferTimeout) {
        clearTimeout(this.bufferTimeout);
      }
      this.bufferTimeout = setTimeout(() => {
        this.searchBuffer.set('');
      }, 8000);
    }
  }

  private focusSearch() {
    const searchBar = document.querySelector('ion-searchbar');
    if (searchBar && (searchBar as any).setFocus) {
      (searchBar as any).setFocus();
    }
  }

  toggleKeypad() {
    this.showKeypad.set(!this.showKeypad());
  }

  async onKeypadPress(key: string) {
    if (key === 'ok') {
      const value = this.keypadBuffer().trim();
      this.searchQuery.set(value);
      this.showKeypad.set(false);
      return;
    }

    if (key === 'clear') {
      this.keypadBuffer.set('');
      this.searchQuery.set('');
      return;
    }

    if (key === 'backspace') {
      const current = this.keypadBuffer();
      const next = current.slice(0, -1);
      this.keypadBuffer.set(next);
      this.searchQuery.set(next);
      return;
    }

    // Digits / decimal for barcode or price-like search
    if (/^[0-9.]$/.test(key)) {
      const current = this.keypadBuffer();
      const next = current + key;
      this.keypadBuffer.set(next);
      this.searchQuery.set(next);
    }
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
  resetPayment() {
    this.paymentType.set('cash');
    this.amountPaid.set(0);
    this.cashReceived.set(0);
    this.cardAmount.set(0);
    this.mobileAmount.set(0);
    this.payments.set([]);
  }

  /**
   * Unified checkout: send retail cart to the shared Checkout page
   * so that payment, printing and receipt options behave the same
   * across retail, category and hospitality modes.
   */
  goToCheckout() {
    if (!this.cartService.hasItems()) {
      this.showToast('Cart is empty');
      return;
    }

    this.router.navigate(['/checkout']);
  }

  /**
   * Hold/recall transactions using shared SQLite infrastructure
   * (reused pattern from legacy PosRetailPage).
   */
  async holdTransaction() {
    if (!this.cartService.hasItems()) {
      this.showToast('Cart is empty');
      return;
    }

    await this.sqlite.ensureInitialized();

    const user = this.auth.currentUser();
    const terminal = this.auth.currentTerminal();

    const summary = this.cartSummary();

    const held: HeldTransaction = {
      _id: `held_${Date.now()}`,
      type: 'held-transaction',
      items: this.cartService.getItems(),
      customer: this.selectedCustomer() || undefined,
      subtotal: summary.subtotal,
      tax: summary.tax,
      discount: summary.discount,
      total: summary.total,
      heldBy: user?._id || 'unknown',
      heldAt: Date.now(),
      terminalId: terminal?._id || 'unknown'
    };

    await this.sqlite.addHeldTransaction(held);
    this.cartService.clearCart();
    this.selectedCustomer.set(null);
    this.showToast('Transaction held');
  }

  async loadHeldTransactions() {
    await this.sqlite.ensureInitialized();
    const terminal = this.auth.currentTerminal();
    const held = await this.sqlite.getHeldTransactions(terminal?._id);
    this.heldTransactions.set(held as HeldTransaction[]);
    this.showHeldTransactions.set(true);
  }

  async recallTransaction(held: HeldTransaction) {
    this.cartService.replaceItems(held.items || []);
    this.selectedCustomer.set(held.customer || null);

    if (held._id) {
      await this.sqlite.deleteHeldTransaction(held._id);
    }

    this.showHeldTransactions.set(false);

    // On mobile, jump straight to cart view
    if (this.isMobile()) {
      this.currentView.set('cart');
    }

    this.showToast('Transaction recalled');
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
