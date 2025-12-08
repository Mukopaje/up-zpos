import { Injectable, signal, computed, effect } from '@angular/core';
import { StorageService } from './storage.service';
import { SettingsService } from './settings.service';
import { Product, CartItem } from '../../models';

export interface TaxSettings {
  active: boolean;
  rate: number;
  mode: 'inclusive' | 'exclusive';
  description: string;
}

export interface CartSummary {
  itemCount: number;
  subtotal: number;
  tax: number;
  discount: number;
  ticketDiscount: number;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  // Cart state signals
  cartItems = signal<CartItem[]>([]);
  taxSettings = signal<TaxSettings>({
    active: false,
    rate: 0,
    mode: 'inclusive',
    description: ''
  });
  ticketDiscount = signal<number>(0);
  couponDiscount = signal<number>(0);

  // Computed values
  itemCount = computed(() => {
    return this.cartItems().reduce((count, item) => {
      // Handle fractional items differently
      if (item.product.unit === 'fraction') {
        return count + 1;
      }
      return count + item.quantity;
    }, 0);
  });

  subtotal = computed(() => {
    return this.cartItems().reduce((sum, item) => sum + item.total, 0);
  });

  totalTax = computed(() => {
    if (!this.taxSettings().active) {
      return 0;
    }
    return this.cartItems().reduce((sum, item) => sum + item.tax, 0);
  });

  totalDiscount = computed(() => {
    return this.cartItems().reduce((sum, item) => sum + item.discount, 0);
  });

  grandTotal = computed(() => {
    const sub = this.subtotal();
    const discount = this.ticketDiscount();
    return Number((sub - discount).toFixed(2));
  });

  summary = computed<CartSummary>(() => ({
    itemCount: this.itemCount(),
    subtotal: Number(this.subtotal().toFixed(2)),
    tax: Number(this.totalTax().toFixed(2)),
    discount: Number(this.totalDiscount().toFixed(2)),
    ticketDiscount: this.ticketDiscount(),
    total: this.grandTotal()
  }));

  constructor(
    private storage: StorageService,
    private settings: SettingsService
  ) {
    // Load cart from storage on init
    this.loadCart();
    
    // Load tax settings from settings service
    this.loadTaxSettings();

    // Auto-save cart when it changes
    effect(() => {
      const items = this.cartItems();
      this.saveCart(items);
    });
  }

  /**
   * Load cart from local storage
   */
  private async loadCart(): Promise<void> {
    try {
      const savedCart = await this.storage.get('cartItem');
      if (savedCart && Array.isArray(savedCart)) {
        this.cartItems.set(savedCart);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  }

  /**
   * Save cart to local storage
   */
  private async saveCart(items: CartItem[]): Promise<void> {
    try {
      await this.storage.set('cartItem', items);
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  }

  /**
   * Load tax settings
   */
  private async loadTaxSettings(): Promise<void> {
    try {
      const settings = await this.settings.get('tax');
      if (settings?.data) {
        this.taxSettings.set({
          active: settings.data.active || false,
          rate: Number(settings.data.rate) || 0,
          mode: settings.data.mode || 'inclusive',
          description: settings.data.description || ''
        });
      }
    } catch (error) {
      console.error('Error loading tax settings:', error);
    }
  }

  /**
   * Calculate tax for an item
   */
  private calculateTax(price: number, quantity: number, discount: number = 0): {
    price: number;
    tax_amount: number;
    itemTotalTax: number;
    itemTotalPrice: number;
  } {
    const tax = this.taxSettings();
    if (!tax.active) {
      return {
        price,
        tax_amount: 0,
        itemTotalTax: 0,
        itemTotalPrice: (quantity * price) - discount
      };
    }

    const taxRate = tax.rate / 100;
    let taxAmount = 0;
    let itemTotalTax = 0;
    let itemTotalPrice = 0;
    let itemPrice = price;

    if (tax.mode === 'inclusive') {
      // Tax is included in the price
      const priceBeforeTax = price / (1 + taxRate);
      taxAmount = price - priceBeforeTax;
      itemTotalTax = taxAmount * quantity;
      itemTotalPrice = (quantity * price) - discount;
      itemPrice = price;
    } else {
      // Tax is exclusive (added on top)
      taxAmount = price * taxRate;
      itemTotalTax = taxAmount * quantity;
      itemTotalPrice = (quantity * price) + itemTotalTax - discount;
      itemPrice = price;
    }

    return {
      price: Number(itemPrice.toFixed(2)),
      tax_amount: Number(taxAmount.toFixed(2)),
      itemTotalTax: Number(itemTotalTax.toFixed(2)),
      itemTotalPrice: Number(itemTotalPrice.toFixed(2))
    };
  }

  /**
   * Add item to cart or update quantity if already exists
   */
  addItem(product: Product, quantity: number = 1): void {
    const items = [...this.cartItems()];
    const existingIndex = items.findIndex(item => item.product._id === product._id);

    if (existingIndex >= 0) {
      // Update existing item
      const existingItem = items[existingIndex];
      const newQuantity = product.unit === 'fraction' ? quantity : existingItem.quantity + quantity;
      const discount = existingItem.discount || 0;
      
      const taxCalc = this.calculateTax(product.price, newQuantity, discount);
      
      items[existingIndex] = {
        ...existingItem,
        quantity: newQuantity,
        Quantity: newQuantity, // Old schema
        price: taxCalc.price,
        tax: taxCalc.itemTotalTax,
        itemTotalTax: taxCalc.itemTotalTax, // Old schema
        tax_amount: taxCalc.tax_amount, // Old schema
        total: taxCalc.itemTotalPrice,
        itemTotalPrice: taxCalc.itemTotalPrice, // Old schema
        discount: discount,
        itemDiscount: discount, // Old schema
        measure: product.unit,
        barcode: product.barcode,
        name: product.name,
        category: product.category
      };
    } else {
      // Add new item
      const taxCalc = this.calculateTax(product.price, quantity, 0);
      
      const newItem: CartItem = {
        _id: product._id,
        product: product,
        quantity: quantity,
        Quantity: quantity, // Old schema
        price: taxCalc.price,
        discount: 0,
        itemDiscount: 0, // Old schema
        tax: taxCalc.itemTotalTax,
        itemTotalTax: taxCalc.itemTotalTax, // Old schema
        tax_amount: taxCalc.tax_amount, // Old schema
        total: taxCalc.itemTotalPrice,
        itemTotalPrice: taxCalc.itemTotalPrice, // Old schema
        taxExempt: !product.taxable,
        measure: product.unit,
        barcode: product.barcode,
        name: product.name,
        category: product.category
      };
      
      items.push(newItem);
    }

    this.cartItems.set(items);
  }

  /**
   * Add item with options (variants, portions, bundles, modifiers) to cart
   */
  addItemWithOptions(cartItem: CartItem): void {
    const items = [...this.cartItems()];
    
    // Calculate price with all options
    let price = cartItem.product.price;
    
    // Apply variant modifier
    if (cartItem.selectedVariant) {
      price += cartItem.selectedVariant.priceModifier;
    }
    
    // Apply portion multiplier
    if (cartItem.selectedPortion) {
      price *= cartItem.selectedPortion.priceMultiplier;
    }
    
    // Apply bundle multiplier
    if (cartItem.selectedBundle) {
      price *= cartItem.selectedBundle.priceMultiplier;
    }
    
    // Add modifiers
    if (cartItem.modifiers && cartItem.modifiers.length > 0) {
      const modifiersTotal = cartItem.modifiers.reduce((sum, mod) => sum + mod.price, 0);
      price += modifiersTotal;
    }
    
    const taxCalc = this.calculateTax(price, cartItem.quantity, 0);
    
    const newItem: CartItem = {
      _id: cartItem.product._id,
      product: cartItem.product,
      quantity: cartItem.quantity,
      Quantity: cartItem.quantity,
      price: taxCalc.price,
      discount: 0,
      itemDiscount: 0,
      tax: taxCalc.itemTotalTax,
      itemTotalTax: taxCalc.itemTotalTax,
      tax_amount: taxCalc.tax_amount,
      total: taxCalc.itemTotalPrice,
      itemTotalPrice: taxCalc.itemTotalPrice,
      taxExempt: !cartItem.product.taxable,
      measure: cartItem.product.unit,
      barcode: cartItem.product.barcode,
      name: cartItem.product.name,
      category: cartItem.product.category,
      selectedVariant: cartItem.selectedVariant,
      selectedPortion: cartItem.selectedPortion,
      selectedBundle: cartItem.selectedBundle,
      modifiers: cartItem.modifiers
    };
    
    items.push(newItem);
    this.cartItems.set(items);
  }

  /**
   * Update item quantity
   */
  updateQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }

    const items = [...this.cartItems()];
    const index = items.findIndex(item => item.product._id === productId);

    if (index >= 0) {
      const item = items[index];
      const taxCalc = this.calculateTax(item.product.price, quantity, item.discount);
      
      items[index] = {
        ...item,
        quantity,
        Quantity: quantity, // Old schema
        price: taxCalc.price,
        tax: taxCalc.itemTotalTax,
        itemTotalTax: taxCalc.itemTotalTax, // Old schema
        tax_amount: taxCalc.tax_amount, // Old schema
        total: taxCalc.itemTotalPrice,
        itemTotalPrice: taxCalc.itemTotalPrice // Old schema
      };

      this.cartItems.set(items);
    }
  }

  /**
   * Increase item quantity by 1 (or custom amount for fractional items)
   */
  incrementItem(productId: string, amount: number = 1): void {
    const items = [...this.cartItems()];
    const index = items.findIndex(item => item.product._id === productId);

    if (index >= 0) {
      const item = items[index];
      const newQuantity = item.quantity + amount;
      this.updateQuantity(productId, newQuantity);
    }
  }

  /**
   * Decrease item quantity by 1
   */
  decrementItem(productId: string): void {
    const items = [...this.cartItems()];
    const index = items.findIndex(item => item.product._id === productId);

    if (index >= 0) {
      const item = items[index];
      if (item.quantity > 1) {
        this.updateQuantity(productId, item.quantity - 1);
      } else {
        this.removeItem(productId);
      }
    }
  }

  /**
   * Apply discount to specific item
   */
  applyItemDiscount(productId: string, discountAmount: number): void {
    const items = [...this.cartItems()];
    const index = items.findIndex(item => item.product._id === productId);

    if (index >= 0) {
      const item = items[index];
      const taxCalc = this.calculateTax(item.product.price, item.quantity, discountAmount);
      
      items[index] = {
        ...item,
        discount: discountAmount,
        itemDiscount: discountAmount, // Old schema
        price: taxCalc.price,
        tax: taxCalc.itemTotalTax,
        itemTotalTax: taxCalc.itemTotalTax, // Old schema
        tax_amount: taxCalc.tax_amount, // Old schema
        total: taxCalc.itemTotalPrice,
        itemTotalPrice: taxCalc.itemTotalPrice // Old schema
      };

      this.cartItems.set(items);
    }
  }

  /**
   * Apply percentage discount to entire ticket
   */
  applyTicketDiscount(percentage: number): void {
    const subtotal = this.subtotal();
    const discountAmount = Number((percentage / 100 * subtotal).toFixed(2));
    this.ticketDiscount.set(discountAmount);
  }

  /**
   * Apply fixed amount discount to ticket
   */
  applyTicketDiscountAmount(amount: number): void {
    this.ticketDiscount.set(Number(amount.toFixed(2)));
  }

  /**
   * Apply coupon discount
   */
  applyCoupon(percentage: number): void {
    this.couponDiscount.set(percentage);
    this.applyTicketDiscount(percentage);
  }

  /**
   * Remove item from cart
   */
  removeItem(productId: string): void {
    const items = this.cartItems().filter(item => item.product._id !== productId);
    this.cartItems.set(items);
  }

  /**
   * Clear entire cart
   */
  clearCart(): void {
    this.cartItems.set([]);
    this.ticketDiscount.set(0);
    this.couponDiscount.set(0);
  }

  /**
   * Get cart item by product ID
   */
  getItem(productId: string): CartItem | undefined {
    return this.cartItems().find(item => item.product._id === productId);
  }

  /**
   * Check if cart has items
   */
  hasItems(): boolean {
    return this.cartItems().length > 0;
  }

  /**
   * Get cart items as array
   */
  getItems(): CartItem[] {
    return this.cartItems();
  }

  /**
   * Reset all calculations
   */
  resetTotals(): void {
    this.ticketDiscount.set(0);
    this.couponDiscount.set(0);
    // Recalculate all items
    const items = [...this.cartItems()];
    items.forEach((item, index) => {
      const taxCalc = this.calculateTax(item.product.price, item.quantity, item.discount);
      items[index] = {
        ...item,
        price: taxCalc.price,
        tax: taxCalc.itemTotalTax,
        total: taxCalc.itemTotalPrice
      };
    });
    this.cartItems.set(items);
  }

  /**
   * Check if product is in cart
   */
  isInCart(productId: string): boolean {
    return this.cartItems().some(item => item.product._id === productId);
  }

  /**
   * Get quantity of product in cart
   */
  getQuantity(productId: string): number {
    const item = this.getItem(productId);
    return item ? item.quantity : 0;
  }
}
