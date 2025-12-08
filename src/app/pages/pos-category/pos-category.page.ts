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
  ModalController,
  ActionSheetController
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
  chevronBack,
  chevronForward,
  createOutline,
  optionsOutline,
  trashOutline
} from 'ionicons/icons';

import { Product, CartItem, Customer, Payment, ModifierGroup } from '../../models';
import { ProductsService } from '../../core/services/products.service';
import { CartService } from '../../core/services/cart.service';
import { CustomersService } from '../../core/services/customers.service';
import { OrdersService } from '../../core/services/orders.service';
import { PrintService } from '../../core/services/print.service';
import { BarcodeService } from '../../core/services/barcode.service';
import { SettingsService } from '../../core/services/settings.service';
import { ProductOptionsModalComponent } from './product-options-modal/product-options-modal.component';

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
  private actionSheetCtrl = inject(ActionSheetController);
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
  currentView = signal<'products' | 'cart' | 'checkout'>('products');
  isMobile = signal<boolean>(false);

  // Category pagination
  currentCategoryPage = signal<number>(1);
  categoriesPerPage = signal<number>(10);

  // Settings
  settings = this.settingsService.settings;

  // Keyboard input buffers
  keyboardBuffer = signal<string>(''); // Numeric buffer for quantity
  searchBuffer = signal<string>(''); // Text buffer for search
  bufferTimeout: any = null;
  isGlobalSearchActive = signal<boolean>(false);

  // Computed
  filteredProducts = computed(() => {
    let filtered = this.products();

    // Always filter by selected category (no 'all' option)
    const categoryId = this.selectedCategory();
    if (categoryId) {
      filtered = filtered.filter(p => p.category === categoryId);
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

  // Global search (cross-category)
  globalSearchProducts = computed(() => {
    const query = this.searchBuffer().toLowerCase();
    if (query.length < 3) {
      return [];
    }

    return this.products().filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.barcode.includes(query) ||
      p.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  // Category pagination computed
  totalCategoryPages = computed(() => {
    const total = this.categories().length;
    const perPage = this.categoriesPerPage();
    return Math.ceil(total / perPage);
  });

  paginatedCategories = computed(() => {
    const allCategories = this.categories();
    const page = this.currentCategoryPage();
    const perPage = this.categoriesPerPage();
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    return allCategories.slice(startIndex, endIndex);
  });

  categoryColumns = computed(() => {
    const categoriesOnPage = this.paginatedCategories().length;
    // Show 2 columns if more than 6 categories on page, otherwise 1 column
    return categoriesOnPage > 6 ? 2 : 1;
  });

  // Tile colors from settings
  categoryTileColor = computed(() => {
    return this.settings().categoryTileBackgroundColor || '#FF9800';
  });

  productTileColor = computed(() => {
    return this.settings().productTileBackgroundColor || '#4CAF50';
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
      'arrow-back': arrowBack,
      'chevron-back': chevronBack,
      'chevron-forward': chevronForward,
      'create-outline': createOutline,
      'options-outline': optionsOutline,
      'trash-outline': trashOutline
    });
  }

  async ngOnInit() {
    this.detectMobile();
    window.addEventListener('resize', () => this.detectMobile());
    this.setupKeyboardListener();
    await this.loadData();
    
    // Set first category as default
    const categories = this.categories();
    if (categories.length > 0 && this.selectedCategory() === 'all') {
      this.selectedCategory.set(categories[0]._id);
    }
  }

  ngOnDestroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
    }
  }

  private setupKeyboardListener() {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent) {
    // Ignore if typing in input fields
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'ION-INPUT' || target.tagName === 'ION-SEARCHBAR') {
      return;
    }

    // Function keys
    if (event.key === 'F1') {
      event.preventDefault();
      this.focusSearch();
      return;
    }
    if (event.key === 'F2') {
      event.preventDefault();
      if (this.cartItems().length > 0) {
        this.goToCheckout();
      }
      return;
    }
    if (event.key === 'F3') {
      event.preventDefault();
      // TODO: Hold transaction
      return;
    }
    if (event.key === 'F4') {
      event.preventDefault();
      // TODO: Recall transaction
      return;
    }

    // Escape key - clear buffers and close search
    if (event.key === 'Escape') {
      this.clearBuffers();
      this.isGlobalSearchActive.set(false);
      return;
    }

    // Numeric input (0-9)
    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      const current = this.keyboardBuffer();
      this.keyboardBuffer.set(current + event.key);
      this.resetBufferTimeout();
      return;
    }

    // Alphabetic input (a-z, A-Z, space)
    if (/^[a-zA-Z ]$/.test(event.key)) {
      event.preventDefault();
      const current = this.searchBuffer();
      this.searchBuffer.set(current + event.key);
      this.isGlobalSearchActive.set(true);
      this.resetBufferTimeout();
      return;
    }

    // Backspace - remove last character from active buffer
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (this.searchBuffer()) {
        const current = this.searchBuffer();
        this.searchBuffer.set(current.slice(0, -1));
        if (this.searchBuffer().length === 0) {
          this.isGlobalSearchActive.set(false);
        }
      } else if (this.keyboardBuffer()) {
        const current = this.keyboardBuffer();
        this.keyboardBuffer.set(current.slice(0, -1));
      }
      this.resetBufferTimeout();
      return;
    }

    // Enter key - if search buffer has text, select first result
    if (event.key === 'Enter' && this.searchBuffer().length >= 3) {
      event.preventDefault();
      const results = this.globalSearchProducts();
      if (results.length > 0) {
        this.addProductWithBuffer(results[0]);
      }
      return;
    }
  }

  private resetBufferTimeout() {
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
    }
    this.bufferTimeout = setTimeout(() => {
      this.clearBuffers();
    }, 2000); // Clear after 2 seconds of inactivity
  }

  clearBuffers() {
    this.keyboardBuffer.set('');
    this.searchBuffer.set('');
    this.isGlobalSearchActive.set(false);
  }

  private focusSearch() {
    // Focus search input in header
    const searchBar = document.querySelector('ion-searchbar');
    if (searchBar) {
      (searchBar as any).setFocus();
    }
  }

  async addProductWithBuffer(product: Product) {
    const qtyBuffer = this.keyboardBuffer();
    const quantity = qtyBuffer ? parseInt(qtyBuffer, 10) : 1;
    
    this.clearBuffers();
    
    // Check if product has options (variants, portions, bundles, modifiers)
    const hasOptions = (product.variants && product.variants.length > 0) ||
                       (product.portions && product.portions.length > 0) ||
                       (product.bundles && product.bundles.length > 0) ||
                       (product.modifierGroups && product.modifierGroups.length > 0);
    
    if (hasOptions) {
      // TODO: Show product options modal
      await this.showProductOptions(product, quantity);
    } else {
      // Add directly to cart
      await this.addToCart(product, quantity);
    }
  }

  private detectMobile() {
    this.isMobile.set(window.innerWidth < 768);
  }

  openMenu() {
    this.menuCtrl.open();
  }

  /**
   * Mobile navigation methods
   */
  backToCategories() {
    // Clear selected category to show categories list on mobile
    this.selectedCategory.set('');
    this.currentView.set('products');
  }

  closeCheckout() {
    // Return to cart view from checkout
    this.currentView.set('cart');
  }

  viewCart() {
    if (this.isMobile()) {
      this.currentView.set('cart');
    }
  }

  backToProducts() {
    this.currentView.set('products');
  }

  goToCheckout() {
    if (this.cartItems().length === 0) {
      this.showToast('Cart is empty');
      return;
    }
    
    // Navigate to dedicated checkout page
    this.router.navigate(['/checkout']);
  }

  backToCart() {
    this.currentView.set('cart');
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
    
    // On mobile, selecting a category should stay in products view
    if (this.isMobile()) {
      this.currentView.set('products');
    }
  }

  getCategoryName(categoryId: string): string {
    const category = this.categories().find(c => c._id === categoryId);
    return category?.name || 'Unknown';
  }

  nextCategoryPage() {
    const current = this.currentCategoryPage();
    const total = this.totalCategoryPages();
    if (current < total) {
      this.currentCategoryPage.set(current + 1);
    }
  }

  previousCategoryPage() {
    const current = this.currentCategoryPage();
    if (current > 1) {
      this.currentCategoryPage.set(current - 1);
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
  async addToCart(product: Product, quantity: number = 1) {
    // Check keyboard buffer for quantity
    const qtyBuffer = this.keyboardBuffer();
    const finalQuantity = qtyBuffer ? parseInt(qtyBuffer, 10) : quantity;
    
    this.clearBuffers();
    
    // Check if product has options
    const hasOptions = (product.variants && product.variants.length > 0) ||
                       (product.portions && product.portions.length > 0) ||
                       (product.bundles && product.bundles.length > 0) ||
                       (product.modifierGroups && product.modifierGroups.length > 0);
    
    if (hasOptions) {
      await this.showProductOptions(product, finalQuantity);
    } else {
      this.cartService.addItem(product, finalQuantity);
      this.showToast(`${product.name} added to cart`);
    }
  }

  async showProductOptions(product: Product, quantity: number) {
    // Get modifier groups for this product
    const modifierGroups: ModifierGroup[] = []; // TODO: Load from database based on product.modifierGroups
    
    const modal = await this.modalCtrl.create({
      component: ProductOptionsModalComponent,
      componentProps: {
        product,
        initialQuantity: quantity,
        modifierGroups
      },
      breakpoints: [0, 0.5, 0.75, 1],
      initialBreakpoint: 0.75
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();

    if (data && data.confirmed) {
      // Add to cart with selected options
      this.cartService.addItemWithOptions({
        product: product,
        quantity: data.quantity,
        selectedVariant: data.selectedVariant,
        selectedPortion: data.selectedPortion,
        selectedBundle: data.selectedBundle,
        modifiers: data.modifiers
      } as CartItem);
      this.showToast(`${product.name} added to cart - $${data.totalPrice.toFixed(2)}`);
    }
  }

  async editCartItem(item: CartItem) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: item.product.name,
      buttons: [
        {
          text: 'Edit Quantity',
          icon: 'create-outline',
          handler: () => {
            this.editQuantity(item);
          }
        },
        {
          text: 'Edit Options',
          icon: 'options-outline',
          handler: async () => {
            // Re-open product options modal
            await this.showProductOptions(item.product, item.quantity);
            // Remove old item after editing
            this.cartService.removeItem(item.product._id);
          }
        },
        {
          text: 'Remove',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => {
            this.removeFromCart(item);
          }
        },
        {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
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

  incrementQuantity(item: CartItem) {
    this.cartService.updateQuantity(item.product._id, item.quantity + 1);
  }

  decrementQuantity(item: CartItem) {
    if (item.quantity > 1) {
      this.cartService.updateQuantity(item.product._id, item.quantity - 1);
    } else {
      this.removeFromCart(item);
    }
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

  async completeOrder() {
    await this.processPayment();
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

      // Print receipt
      await this.printReceipt(order);

      // Show success and reset
      await this.showSuccessAlert(order.orderNumber || order.invoice_no || '', this.change());

      // Reset
      this.resetTransaction();
      
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
