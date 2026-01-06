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
  keypadOutline,
  arrowBack,
  chevronBack,
  chevronForward,
  createOutline,
  optionsOutline,
  trashOutline,
  restaurantOutline,
  swapHorizontalOutline,
  personOutline,
  documentTextOutline,
  printOutline,
  copyOutline,
  addCircleOutline,
  removeCircleOutline,
  giftOutline,
  pricetagOutline,
  closeCircleOutline
} from 'ionicons/icons';

import { Product, CartItem, Customer, Payment, ModifierGroup, ReceiptData, HeldTransaction } from '../../models';
import { ProductsService } from '../../core/services/products.service';
import { CartService } from '../../core/services/cart.service';
import { CustomersService } from '../../core/services/customers.service';
import { OrdersService } from '../../core/services/orders.service';
import { PrintService } from '../../core/services/print.service';
import { BarcodeService } from '../../core/services/barcode.service';
import { SettingsService } from '../../core/services/settings.service';
import { ProductOptionsModalComponent } from './product-options-modal/product-options-modal.component';
import { HospitalityContextService } from '../../core/services/hospitality-context.service';
import { TablesService } from '../../core/services/tables.service';
import { AuthService } from '../../core/services/auth.service';
import { SqliteService } from '../../core/services/sqlite.service';
import { CustomerSelectModalComponent } from '../checkout/customer-select-modal/customer-select-modal.component';
import { ReceiptModalComponent } from '../checkout/receipt-modal/receipt-modal.component';

interface CommandButton {
  id: string;
  label: string;
  icon?: string;
  level: 'ticket' | 'order';
  color?: string; // Ionic color key: 'primary', 'warning', 'danger', etc.
}

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
  hospitalityContext = inject(HospitalityContextService);
  private tablesService = inject(TablesService);
  private authService = inject(AuthService);
  private sqliteService = inject(SqliteService);

  // State
  products = this.productsService.products;
  categories = this.productsService.categories;
  menus = this.productsService.menus;
  cartItems = this.cartService.cartItems;
  cartSummary = this.cartService.summary;
  selectedCategory = signal<string>('');
  selectedMenuId = signal<string | null>(null);
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

  // UI animation state
  cartFabAnimating = signal<boolean>(false);

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

  // On-screen keypad
  showKeypad = signal<boolean>(false);
  keypadMode = signal<'qty' | 'barcode'>('qty');
  barcodeBuffer = signal<string>('');
  keypadDisplay = computed(() =>
    this.keypadMode() === 'qty' ? this.keyboardBuffer() : this.barcodeBuffer()
  );

  // Ticket & order command panel state
  panelMode = signal<'ticket' | 'order'>('ticket');
  selectedCartItem = signal<CartItem | null>(null);

  // Held transactions
  showHeldTransactions = signal<boolean>(false);
  heldTransactions = signal<HeldTransaction[]>([]);

  ticketButtons = signal<CommandButton[]>([ 
    { id: 'changeTable', label: 'Change Table', icon: 'swap-horizontal-outline', level: 'ticket', color: 'tertiary' },
    { id: 'selectCustomer', label: 'Select Customer', icon: 'person-outline', level: 'ticket', color: 'primary' },
    { id: 'ticketNote', label: 'Ticket Note', icon: 'document-text-outline', level: 'ticket', color: 'medium' },
    { id: 'printBill', label: 'Print Bill', icon: 'print-outline', level: 'ticket', color: 'warning' },
    { id: 'addTicket', label: 'Add Ticket', icon: 'copy-outline', level: 'ticket', color: 'primary' }
  ]);

  orderButtons = signal<CommandButton[]>([
    { id: 'qtyPlus', label: 'Quantity +', icon: 'add-circle-outline', level: 'order', color: 'primary' },
    { id: 'qtyMinus', label: 'Quantity -', icon: 'remove-circle-outline', level: 'order', color: 'primary' },
    { id: 'gift', label: 'Gift', icon: 'gift-outline', level: 'order', color: 'success' },
    { id: 'void', label: 'Void', icon: 'close-circle-outline', level: 'order', color: 'danger' },
    { id: 'cancel', label: 'Cancel', icon: 'trash-outline', level: 'order', color: 'medium' },
    { id: 'move', label: 'Move', icon: 'swap-horizontal-outline', level: 'order', color: 'tertiary' },
    { id: 'changePrice', label: 'Change Price', icon: 'pricetag-outline', level: 'order', color: 'warning' }
  ]);

  // Computed
  filteredProducts = computed(() => {
    let filtered = this.products();

    // Always filter by selected category (no 'all' option)
    const categoryId = this.selectedCategory();
    if (categoryId) {
      filtered = filtered.filter(p => p.category === categoryId);
    }

    // Filter by selected menu (or implicit single menu)
    const activeMenus = this.activeMenus();
    const selectedMenuId = this.selectedMenuId();

    if (selectedMenuId) {
      filtered = filtered.filter(p => {
        const category = this.categories().find(c => c._id === p.category);
        return category?.menuId === selectedMenuId;
      });
    } else if (activeMenus.length === 1) {
      const onlyMenuId = activeMenus[0]._id;
      filtered = filtered.filter(p => {
        const category = this.categories().find(c => c._id === p.category);
        return !category?.menuId || category?.menuId === onlyMenuId;
      });
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

  // Products actually shown in the grid: either category-filtered or global search
  visibleProducts = computed(() => {
    if (this.isGlobalSearchActive()) {
      return this.globalSearchProducts();
    }
    return this.filteredProducts();
  });

  // Category pagination computed
  totalCategoryPages = computed(() => {
    const total = this.visibleCategories().length;
    const perPage = this.categoriesPerPage();
    return Math.ceil(total / perPage);
  });

  paginatedCategories = computed(() => {
    const allCategories = this.visibleCategories();
    const page = this.currentCategoryPage();
    const perPage = this.categoriesPerPage();
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    return allCategories.slice(startIndex, endIndex);
  });

  activeMenus = computed(() => this.menus().filter(m => m.active));

  showMenuBar = computed(() => this.activeMenus().length > 1);

  currentMenu = computed(() => {
    const selectedId = this.selectedMenuId();
    const activeMenus = this.activeMenus();
    if (selectedId) {
      return activeMenus.find(m => m._id === selectedId) || null;
    }
    return activeMenus.length > 0 ? activeMenus[0] : null;
  });

  visibleCategories = computed(() => {
    const allCategories = this.categories();
    const rootCategories = allCategories.filter(c => !c.parentId);
    const activeMenus = this.activeMenus();
    const selectedMenuId = this.selectedMenuId();

    let filtered = rootCategories;

    if (activeMenus.length > 1) {
      if (selectedMenuId) {
        filtered = filtered.filter(c => c.menuId === selectedMenuId);
      }
    } else if (activeMenus.length === 1) {
      const onlyMenuId = activeMenus[0]._id;
      filtered = filtered.filter(c => !c.menuId || c.menuId === onlyMenuId);
    }

    return filtered;
  });

  categoryColumns = computed(() => {
    const categoriesOnPage = this.paginatedCategories().length;
    // Show 2 columns if more than 6 categories on page, otherwise 1 column
    return categoriesOnPage > 6 ? 2 : 1;
  });

  // Swipe tracking for category page navigation (mobile)
  private categorySwipeStartX: number | null = null;

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
      'keypad-outline': keypadOutline,
      'phone-portrait': phonePortrait,
      'menu-outline': menuOutline,
      'arrow-back': arrowBack,
      'chevron-back': chevronBack,
      'chevron-forward': chevronForward,
      'create-outline': createOutline,
      'options-outline': optionsOutline,
      'trash-outline': trashOutline,
      'restaurant-outline': restaurantOutline,
      'swap-horizontal-outline': swapHorizontalOutline,
      'person-outline': personOutline,
      'document-text-outline': documentTextOutline,
      'print-outline': printOutline,
      'copy-outline': copyOutline,
      'add-circle-outline': addCircleOutline,
      'remove-circle-outline': removeCircleOutline,
      'gift-outline': giftOutline,
      'pricetag-outline': pricetagOutline,
      'close-circle-outline': closeCircleOutline
    });
  }

  async ngOnInit() {
    this.detectMobile();
    window.addEventListener('resize', () => this.detectMobile());
    this.setupKeyboardListener();
    await this.loadData();

    // Set default menu when available
    const activeMenus = this.activeMenus();
    if (activeMenus.length > 0 && !this.selectedMenuId()) {
      this.selectedMenuId.set(activeMenus[0]._id);
    }

    // On desktop, set first category as default; on mobile, leave
    // unselected so the landing view shows the category tiles.
    const categories = this.visibleCategories();
    if (!this.isMobile() && categories.length > 0 && !this.selectedCategory()) {
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
      this.holdTransaction();
      return;
    }
    if (event.key === 'F4') {
      event.preventDefault();
      this.loadHeldTransactions();
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
    }, 8000); // Clear after 8 seconds of inactivity
  }

  clearBuffers() {
    this.keyboardBuffer.set('');
    this.searchBuffer.set('');
    this.isGlobalSearchActive.set(false);
  }

  toggleKeypad() {
    this.showKeypad.set(!this.showKeypad());
  }

  setKeypadMode(mode: 'qty' | 'barcode') {
    this.keypadMode.set(mode);
  }

  async onKeypadPress(key: string) {
    if (key === 'ok') {
      if (this.keypadMode() === 'barcode' && this.barcodeBuffer()) {
        await this.lookupByBarcode(this.barcodeBuffer());
        this.barcodeBuffer.set('');
      }
      this.showKeypad.set(false);
      return;
    }

    if (key === 'clear') {
      if (this.keypadMode() === 'qty') {
        this.keyboardBuffer.set('');
      } else {
        this.barcodeBuffer.set('');
      }
      return;
    }

    if (key === 'backspace') {
      if (this.keypadMode() === 'qty') {
        const current = this.keyboardBuffer();
        this.keyboardBuffer.set(current.slice(0, -1));
      } else {
        const current = this.barcodeBuffer();
        this.barcodeBuffer.set(current.slice(0, -1));
      }
      return;
    }

    // Digit or dot
    if (this.keypadMode() === 'qty') {
      // For quantity we only allow digits
      if (/^[0-9]$/.test(key)) {
        const current = this.keyboardBuffer();
        this.keyboardBuffer.set(current + key);
      }
    } else {
      // Barcode mode: allow digits and dot
      if (/^[0-9.]$/.test(key)) {
        const current = this.barcodeBuffer();
        this.barcodeBuffer.set(current + key);
      }
    }
  }

  /**
   * Hold/recall transactions using shared SQLite infrastructure
   */
  async holdTransaction() {
    if (!this.cartService.hasItems()) {
      await this.showToast('Cart is empty');
      return;
    }

    await this.sqliteService.ensureInitialized();

    const user = this.authService.currentUser();
    const terminal = this.authService.currentTerminal();
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

    await this.sqliteService.addHeldTransaction(held);
    this.cartService.clearCart();
    this.selectedCustomer.set(null);
    await this.showToast('Ticket held');
  }

  async loadHeldTransactions() {
    await this.sqliteService.ensureInitialized();
    const terminal = this.authService.currentTerminal();
    const held = await this.sqliteService.getHeldTransactions(terminal?._id);
    this.heldTransactions.set(held as HeldTransaction[]);
    this.showHeldTransactions.set(true);
  }

  async recallTransaction(held: HeldTransaction) {
    this.cartService.replaceItems(held.items || []);
    this.selectedCustomer.set(held.customer || null);

    if (held._id) {
      await this.sqliteService.deleteHeldTransaction(held._id);
    }

    this.showHeldTransactions.set(false);

    // On mobile, switch to cart view so the recalled ticket is visible
    if (this.isMobile()) {
      this.currentView.set('cart');
    }

    await this.showToast('Ticket recalled');
  }

  showTicketPanel() {
    this.panelMode.set('ticket');
    this.selectedCartItem.set(null);
  }

  private selectCartItem(item: CartItem) {
    this.selectedCartItem.set(item);
    this.panelMode.set('order');
  }

  onCartItemClick(item: CartItem) {
    this.selectCartItem(item);
  }

  onCartItemPress(item: CartItem) {
    this.selectCartItem(item);
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

  isTicketButtonDisabled(button: CommandButton): boolean {
    switch (button.id) {
      case 'changeTable':
      case 'addTicket':
        return this.hospitalityContext.mode() !== 'hospitality';
      case 'printBill':
        return this.cartItems().length === 0;
      default:
        return false;
    }
  }

  isOrderButtonDisabled(button: CommandButton): boolean {
    const item = this.selectedCartItem();
    if (!item) {
      return true;
    }

    switch (button.id) {
      case 'qtyMinus':
        return item.quantity <= 1;
      case 'void':
        return !item.sentToKitchen;
      case 'cancel':
        return !!item.sentToKitchen;
      case 'changePrice':
        // TODO: Wire to roles/permissions; allow for now
        return false;
      default:
        return false;
    }
  }

  async handleTicketButton(button: CommandButton) {
    switch (button.id) {
      case 'changeTable':
        if (this.hospitalityContext.mode() === 'hospitality') {
          await this.handleChangeTable();
        } else {
          await this.showToast('Change Table is only available in hospitality mode');
        }
        break;
      case 'selectCustomer':
        await this.selectCustomer();
        break;
      case 'ticketNote': {
        const alert = await this.alertCtrl.create({
          header: 'Ticket Note',
          inputs: [
            {
              name: 'note',
              type: 'text',
              placeholder: 'Add note to this ticket',
              value: this.notes()
            }
          ],
          buttons: [
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Save',
              handler: data => {
                this.notes.set(data.note || '');
              }
            }
          ]
        });
        await alert.present();
        break;
      }
      case 'printBill':
        await this.printProvisionalBillFromCart();
        break;
      case 'addTicket':
        // TODO: Support multiple tickets per table
        await this.showToast('Add Ticket not implemented yet');
        break;
    }
  }

  /**
   * Change Table: persist the current hospitality order on the
   * source table, mark a pending move, and return to the tables
   * screen so the user can click the new table.
   */
  private async handleChangeTable() {
    const sourceTableId = this.hospitalityContext.tableId();

    if (!sourceTableId) {
      await this.showToast('No active table to move');
      return;
    }
    try {
      // Persist the current cart as the latest table state so that
      // when we move the session, all items and totals are
      // correctly transferred.
      const table = await this.tablesService.getTable(sourceTableId);
      if (!table) {
        await this.showToast('Current table not found');
        return;
      }

      const cartItems = this.cartService.getItems().map(item => ({ ...item }));
      const updatedTable = {
        ...table,
        items: cartItems,
        amount: this.cartSummary().total
      };

      await this.tablesService.updateTable(updatedTable);

      // Mark a pending move so the next table selected on the
      // hospitality screen becomes the destination.
      this.hospitalityContext.beginTableMove(sourceTableId);

      // Clear the in-memory cart; when the user opens the
      // destination table, the cart will be rehydrated from the
      // moved table's items.
      this.cartService.clearCart();

      // Navigate back to the tables screen so the user can pick
      // the destination table.
      this.router.navigate(['/pos-hospitality']);
    } catch (error) {
      console.error('Error preparing change-table flow:', error);
      await this.showToast('Failed to prepare table change');
    }
  }

  private async printProvisionalBillFromCart() {
    if (this.cartItems().length === 0) {
      await this.showToast('Cart is empty');
      return;
    }

    const summary = this.cartSummary();
    const combinedDiscount = (summary.discount || 0) + (summary.ticketDiscount || 0);

    const receiptData: ReceiptData = {
      orderId: 'PROVISIONAL_' + Date.now(),
      orderNumber: 'PROVISIONAL',
      timestamp: new Date().toISOString(),
      user: '',
      items: this.cartItems().map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.price,
        total: item.total
      })),
      subtotal: summary.subtotal,
      tax: summary.tax,
      discount: combinedDiscount,
      total: summary.total,
      amountPaid: 0,
      change: 0,
      paymentMethod: 'Provisional',
      payments: [],
      customer: this.selectedCustomer() || undefined,
      notes: this.notes()
    };

    const success = await this.printService.printReceipt(receiptData);
    if (!success) {
      await this.showToast('Printer not configured or printing is disabled');
    }
  }

  async handleOrderButton(button: CommandButton) {
    const item = this.selectedCartItem();
    if (!item) {
      return;
    }

    switch (button.id) {
      case 'qtyPlus':
        this.incrementQuantity(item);
        break;
      case 'qtyMinus':
        this.decrementQuantity(item);
        break;
      case 'gift':
        // Make line free by discounting the full line total
        this.cartService.applyItemDiscount(item.product._id, item.total);
        break;
      case 'void':
        await this.voidCartItem(item);
        break;
      case 'cancel':
        if (!item.sentToKitchen) {
          this.removeFromCart(item);
          this.showTicketPanel();
        }
        break;
      case 'move':
        // TODO: Implement move between tickets
        await this.showToast('Move not implemented yet');
        break;
      case 'changePrice': {
        const alert = await this.alertCtrl.create({
          header: 'Change Price',
          inputs: [
            {
              name: 'price',
              type: 'number',
              value: item.price,
              min: 0,
              placeholder: 'New unit price'
            }
          ],
          buttons: [
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Update',
              handler: data => {
                const newPrice = parseFloat(data.price);
                if (!isNaN(newPrice) && newPrice >= 0) {
                  this.cartService.updateItemPrice(item.product._id, newPrice);
                }
              }
            }
          ]
        });
        await alert.present();
        break;
      }
    }
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

    // After returning from checkout or other flows, ensure the
    // mobile landing experience shows the category tiles when the
    // cart is empty instead of an empty cart view.
    if (this.isMobile()) {
      if (!this.cartService.hasItems()) {
        this.currentView.set('products');
        this.selectedCategory.set('');
      } else if (this.currentView() === 'checkout') {
        // If we somehow return while still in checkout mode but
        // have items, show the cart instead of a blank state.
        this.currentView.set('cart');
      }
    }
  }

  /**
   * Simple horizontal swipe detection on the categories column to
   * move between category pages on mobile devices.
   */
  onCategorySwipeStart(event: any) {
    if (!this.isMobile()) {
      return;
    }

    const touch = event.touches && event.touches[0];
    if (touch) {
      this.categorySwipeStartX = touch.clientX;
    }
  }

  onCategorySwipeEnd(event: any) {
    if (!this.isMobile() || this.categorySwipeStartX === null) {
      return;
    }

    const touch = event.changedTouches && event.changedTouches[0];
    if (!touch) {
      this.categorySwipeStartX = null;
      return;
    }

    const deltaX = touch.clientX - this.categorySwipeStartX;
    const threshold = 50; // minimum horizontal movement in px to count as a swipe
    this.categorySwipeStartX = null;

    if (Math.abs(deltaX) < threshold) {
      return;
    }

    // Swipe left -> next page, swipe right -> previous page
    if (deltaX < 0 && this.currentCategoryPage() < this.totalCategoryPages()) {
      this.nextCategoryPage();
    } else if (deltaX > 0 && this.currentCategoryPage() > 1) {
      this.previousCategoryPage();
    }
  }

  async closeTableFromHospitality() {
    if (this.hospitalityContext.mode() !== 'hospitality' || !this.hospitalityContext.tableId()) {
      this.router.navigate(['/pos-hospitality']);
      return;
    }

    const tableId = this.hospitalityContext.tableId()!;

    try {
      const table = await this.tablesService.getTable(tableId);
      if (!table) {
        this.hospitalityContext.clear();
        this.router.navigate(['/pos-hospitality']);
        return;
      }

      // Current table state from the database (what the kitchen has
      // already seen) vs the in-memory cart (what the waiter just did).
      const originalItems = table.items || [];
      const cartItems = this.cartService.getItems().map(item => ({ ...item }));

      // Compute the incremental "new" items to send to the kitchen by
      // comparing quantities against the original table snapshot.
      const newItems: CartItem[] = [];

      for (const item of cartItems) {
        const original = originalItems.find(orig =>
          orig.product && item.product && orig.product._id === item.product._id
        );

        if (!original) {
          // Entirely new line that wasn't on the table before
          newItems.push(item);
          continue;
        }

        if (item.quantity > original.quantity) {
          const deltaQty = item.quantity - original.quantity;

          const unitTotal = item.quantity > 0 ? item.total / item.quantity : item.price;
          const unitTax = item.quantity > 0 ? (item.tax || 0) / item.quantity : 0;
          const unitDiscount = item.quantity > 0 ? (item.discount || 0) / item.quantity : 0;

          const deltaTotal = unitTotal * deltaQty;

          const deltaItem: CartItem = {
            ...item,
            quantity: deltaQty,
            Quantity: deltaQty,
            total: Number(deltaTotal.toFixed(2)),
            itemTotalPrice: Number(deltaTotal.toFixed(2)),
            tax: Number((unitTax * deltaQty).toFixed(2)),
            itemTotalTax: Number((unitTax * deltaQty).toFixed(2)),
            discount: Number((unitDiscount * deltaQty).toFixed(2)),
            itemDiscount: Number((unitDiscount * deltaQty).toFixed(2))
          };

          newItems.push(deltaItem);
        }
      }

      const now = Date.now();
      newItems.forEach(item => {
        (item as any).sentToKitchen = true;
        (item as any).sentAt = now;
      });

      // Persist the full current cart as the table state so that
      // amount and items reflect everything just served.
      const updatedTable = {
        ...table,
        items: cartItems,
        amount: this.cartSummary().total
      };

      await this.tablesService.updateTable(updatedTable);

      // Send only the incremental items to the kitchen/bar pipeline.
      if (newItems.length > 0) {
        await this.printService.printKitchenTickets({
          table: {
            number: table.number,
            guestName: table.guestName,
            guestCount: table.guestCount,
            waiterName: table.waiterName
          },
          items: newItems
        });
      }

    } catch (error) {
      console.error('Error closing hospitality table from category POS:', error);
    } finally {
      this.cartService.clearCart();
      this.hospitalityContext.clear();
      this.router.navigate(['/pos-hospitality']);
    }
  }

  private async loadData() {
    this.isLoading.set(true);
    try {
      await Promise.all([
        this.productsService.loadProducts(),
        this.productsService.loadCategories(),
        this.productsService.loadMenus(),
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

  selectMenu(menuId: string) {
    this.selectedMenuId.set(menuId);
    this.currentCategoryPage.set(1);

    // Reset category selection when switching menus
    const categories = this.visibleCategories();
    if (categories.length > 0) {
      this.selectedCategory.set(categories[0]._id);
    } else {
      this.selectedCategory.set('');
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
      this.triggerCartFabAnimation();
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
      this.triggerCartFabAnimation();
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
          text: 'Line Discount',
          icon: 'pricetag-outline',
          handler: () => {
            this.editItemDiscount(item);
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
    const modal = await this.modalCtrl.create({
      component: CustomerSelectModalComponent,
      componentProps: {
        totalAmount: 0,
        enforceCreditLimit: false
      }
    });

    await modal.present();
    const { data, role } = await modal.onWillDismiss();

    if (role === 'selected' && data) {
      this.selectedCustomer.set(data as Customer);
      await this.showToast(`Customer: ${data.name}`);
    }
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

      const appSettings = this.settingsService.settings();
      const autoPrint = appSettings.autoPrintReceipt ?? false;
      const showReceiptModal = appSettings.showReceiptModalAfterPayment ?? true;

      if (autoPrint) {
        // Auto-print and immediately reset for the next ticket
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

  private async editItemDiscount(item: CartItem) {
    const alert = await this.alertCtrl.create({
      header: 'Line Discount',
      message: `Set discount for ${item.product.name}`,
      inputs: [
        {
          name: 'amount',
          type: 'number',
          value: item.discount || 0,
          min: 0,
          placeholder: 'Discount amount (ZMW)'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Apply',
          handler: data => {
            const raw = parseFloat(data.amount);
            const amount = isNaN(raw) || raw < 0 ? 0 : raw;
            this.cartService.applyItemDiscount(item.product._id, amount);
          }
        }
      ]
    });

    await alert.present();
  }

  private async voidCartItem(item: CartItem) {
    if (!this.authService.canVoidTransactions()) {
      await this.showToast('You are not allowed to void items');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Void Item',
      message: `Void ${item.quantity}x ${item.product.name}?`,
      inputs: [
        {
          name: 'reason',
          type: 'text',
          placeholder: 'Reason (optional)'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Void',
          role: 'destructive',
          handler: async data => {
            const reason = (data?.reason || '').trim() || null;
            const currentUser = this.authService.currentUser();
            const createdBy = currentUser
              ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email || currentUser._id
              : 'Unknown';

            const unitPrice = item.quantity > 0 ? item.total / item.quantity : item.price;

            try {
              await this.sqliteService.addVoidRecord({
                sale_id: null,
                table_id: this.hospitalityContext.tableId() || null,
                product_id: item.product._id,
                product_name: item.product.name,
                quantity: item.quantity,
                price: unitPrice,
                total: item.total,
                reason,
                created_by: createdBy
              });

              this.removeFromCart(item);
              this.showTicketPanel();
              await this.showToast('Item voided');
            } catch (error) {
              console.error('Error recording void:', error);
              await this.showToast('Failed to record void');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  private triggerCartFabAnimation() {
    this.cartFabAnimating.set(true);
    setTimeout(() => {
      this.cartFabAnimating.set(false);
    }, 300);
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
