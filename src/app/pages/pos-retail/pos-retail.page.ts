import { Component, OnInit, ViewChild, ElementRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons,
  IonIcon, IonSearchbar, IonList, IonItem, IonLabel, IonNote, IonBadge,
  IonInput, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonGrid,
  IonRow, IonCol, IonFooter, IonFab, IonFabButton, IonActionSheet, IonToast,
  IonSplitPane, MenuController
} from '@ionic/angular/standalone';
import {
  barcodeOutline, addOutline, removeOutline, trashOutline, cartOutline,
  cardOutline, cashOutline, listOutline, searchOutline, pauseOutline,
  printOutline, personOutline, checkmarkOutline
} from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { Product, CartItem, Customer, HeldTransaction } from '../../models';
import { AuthService } from '../../core/services/auth.service';
import { ProductsService } from '../../core/services/products.service';
import { SqliteService } from '../../core/services/sqlite.service';

@Component({
  selector: 'app-pos-retail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons,
    IonIcon, IonSearchbar, IonList, IonItem, IonLabel, IonNote, IonBadge,
    IonInput, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonGrid,
    IonRow, IonCol, IonFooter, IonFab, IonFabButton, IonActionSheet, IonToast,
    IonSplitPane
  ],
  templateUrl: './pos-retail.page.html',
  styleUrls: ['./pos-retail.page.scss']
})
export class PosRetailPage implements OnInit {
  @ViewChild('barcodeInput') barcodeInput!: ElementRef<HTMLInputElement>;

  private auth = inject(AuthService);
  private productsService = inject(ProductsService);
  private sqlite = inject(SqliteService);
  private menuCtrl = inject(MenuController);

  // Signals
  cart = signal<CartItem[]>([]);
  products = signal<Product[]>([]);
  favorites = signal<Product[]>([]);
  barcode = signal('');
  searchQuery = signal('');
  selectedCustomer = signal<Customer | null>(null);
  subtotal = signal(0);
  tax = signal(0);
  discount = signal(0);
  total = signal(0);
  amountPaid = signal(0);
  change = signal(0);
  showCheckout = signal(false);
  showHeldTransactions = signal(false);
  heldTransactions = signal<HeldTransaction[]>([]);
  toastMessage = signal('');
  showToast = signal(false);

  constructor() {
    addIcons({
      barcodeOutline,
      addOutline,
      removeOutline,
      trashOutline,
      cartOutline,
      cardOutline,
      cashOutline,
      listOutline,
      searchOutline,
      pauseOutline,
      printOutline,
      personOutline,
      checkmarkOutline
    });
  }

  async ngOnInit() {
    await this.loadProducts();
    await this.loadFavorites();
    // Auto-focus barcode input
    setTimeout(() => {
      this.focusBarcodeInput();
    }, 500);
  }

  async openMenu() {
    await this.menuCtrl.open();
  }

  async loadProducts() {
    const products = await this.productsService.loadProducts();
    this.products.set(products.filter(p => p.active));
  }

  async loadFavorites() {
    // Load frequently used products
    const allProducts = this.products();
    this.favorites.set(allProducts.filter(p => p.favorite).slice(0, 12));
  }

  focusBarcodeInput() {
    this.barcodeInput?.nativeElement?.focus();
  }

  async onBarcodeScanned() {
    const code = this.barcode().trim();
    if (!code) return;

    const product = this.products().find(p => p.barcode === code);
    if (product) {
      this.addToCart(product);
      this.barcode.set('');
      this.showMessage('Product added to cart');
    } else {
      this.showMessage('Product not found', 'danger');
    }

    this.focusBarcodeInput();
  }

  async onBarcodeKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      await this.onBarcodeScanned();
    }
  }

  addToCart(product: Product, quantity = 1) {
    const existingIndex = this.cart().findIndex(item => item.product._id === product._id);

    if (existingIndex >= 0) {
      this.updateQuantity(existingIndex, this.cart()[existingIndex].quantity + quantity);
    } else {
      const newItem: CartItem = {
        product,
        Quantity: quantity,
        quantity,
        price: product.price,
        itemTotalPrice: product.price * quantity,
        total: product.price * quantity,
        itemDiscount: 0,
        discount: 0,
        tax_amount: product.taxable ? product.price * 0.16 : 0,
        itemTotalTax: product.taxable ? product.price * quantity * 0.16 : 0,
        tax: product.taxable ? product.price * quantity * 0.16 : 0,
        taxExempt: !product.taxable,
        name: product.name,
        barcode: product.barcode,
        category: product.category
      };

      this.cart.update(items => [...items, newItem]);
    }

    this.calculateTotals();
  }

  updateQuantity(index: number, newQuantity: number) {
    if (newQuantity <= 0) {
      this.removeItem(index);
      return;
    }

    this.cart.update(items => {
      const updated = [...items];
      const item = updated[index];
      item.quantity = newQuantity;
      item.Quantity = newQuantity;
      item.total = item.price * newQuantity;
      item.itemTotalPrice = item.total;
      item.tax = item.taxExempt ? 0 : item.price * newQuantity * 0.16;
      item.itemTotalTax = item.tax;
      return updated;
    });

    this.calculateTotals();
  }

  removeItem(index: number) {
    this.cart.update(items => items.filter((_, i) => i !== index));
    this.calculateTotals();
  }

  clearCart() {
    this.cart.set([]);
    this.calculateTotals();
    this.focusBarcodeInput();
  }

  calculateTotals() {
    const items = this.cart();
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = items.reduce((sum, item) => sum + item.tax, 0);
    const discount = this.discount();
    const total = subtotal + tax - discount;

    this.subtotal.set(subtotal);
    this.tax.set(tax);
    this.total.set(total);
    this.change.set(Math.max(0, this.amountPaid() - total));
  }

  onAmountPaidChange() {
    this.change.set(Math.max(0, this.amountPaid() - this.total()));
  }

  applyDiscount(amount: number) {
    if (!this.auth.canGiveDiscount(amount / this.subtotal() * 100)) {
      this.showMessage('You do not have permission to give this discount', 'danger');
      return;
    }

    this.discount.set(amount);
    this.calculateTotals();
  }

  async holdTransaction() {
    if (this.cart().length === 0) {
      this.showMessage('Cart is empty', 'warning');
      return;
    }

    const held: HeldTransaction = {
      _id: `held_${Date.now()}`,
      type: 'held-transaction',
      items: this.cart(),
      customer: this.selectedCustomer() || undefined,
      subtotal: this.subtotal(),
      tax: this.tax(),
      discount: this.discount(),
      total: this.total(),
      heldBy: this.auth.currentUser()?._id || 'unknown',
      heldAt: Date.now(),
      terminalId: this.auth.currentTerminal()?._id || 'unknown'
    };

    await this.sqlite.ensureInitialized();
    await this.sqlite.addHeldTransaction(held);
    this.clearCart();
    this.showMessage('Transaction held successfully');
  }

  async loadHeldTransactions() {
    await this.sqlite.ensureInitialized();
    const terminalId = this.auth.currentTerminal()?._id;
    const held = await this.sqlite.getHeldTransactions(terminalId);
    this.heldTransactions.set(held as HeldTransaction[]);
    this.showHeldTransactions.set(true);
  }

  async recallTransaction(held: HeldTransaction) {
    this.cart.set([...held.items]);
    this.discount.set(held.discount);
    this.selectedCustomer.set(held.customer || null);
    this.calculateTotals();

    if (held._id) {
      await this.sqlite.deleteHeldTransaction(held._id);
    }
    this.showHeldTransactions.set(false);
    this.showMessage('Transaction recalled');
  }

  async completeSale(paymentMethod: 'cash' | 'card' | 'mobile') {
    if (this.cart().length === 0) {
      this.showMessage('Cart is empty', 'warning');
      return;
    }

    if (this.amountPaid() < this.total()) {
      this.showMessage('Insufficient payment amount', 'danger');
      return;
    }

    // TODO: Create order and save to database
    // TODO: Print receipt
    // TODO: Update inventory

    this.showMessage('Sale completed successfully', 'success');
    this.clearCart();
    this.amountPaid.set(0);
    this.change.set(0);
    this.showCheckout.set(false);
    this.focusBarcodeInput();
  }

  openCheckout() {
    if (this.cart().length === 0) {
      this.showMessage('Cart is empty', 'warning');
      return;
    }
    this.showCheckout.set(true);
  }

  closeCheckout() {
    this.showCheckout.set(false);
    this.focusBarcodeInput();
  }

  showMessage(message: string, color: 'success' | 'warning' | 'danger' = 'success') {
    this.toastMessage.set(message);
    this.showToast.set(true);
    setTimeout(() => this.showToast.set(false), 3000);
  }

  // Keyboard shortcuts
  onKeyDown(event: KeyboardEvent) {
    // F1 - Focus barcode input
    if (event.key === 'F1') {
      event.preventDefault();
      this.focusBarcodeInput();
    }
    // F2 - Open checkout
    if (event.key === 'F2') {
      event.preventDefault();
      this.openCheckout();
    }
    // F3 - Hold transaction
    if (event.key === 'F3') {
      event.preventDefault();
      this.holdTransaction();
    }
    // F4 - Recall transaction
    if (event.key === 'F4') {
      event.preventDefault();
      this.loadHeldTransactions();
    }
    // Escape - Close dialogs
    if (event.key === 'Escape') {
      event.preventDefault();
      this.showCheckout.set(false);
      this.showHeldTransactions.set(false);
      this.focusBarcodeInput();
    }
  }
}
