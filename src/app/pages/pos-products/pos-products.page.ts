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
  IonFab,
  IonFabButton,
  IonChip,
  IonSpinner,
  IonFooter,
  MenuController,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cart, search, barcode, add, remove, trash, checkmark, cartOutline } from 'ionicons/icons';

import { Product, CartItem, Category } from '../../models';
import { ProductsService } from '../../core/services/products.service';
import { CartService } from '../../core/services/cart.service';
import { BarcodeService } from '../../core/services/barcode.service';

@Component({
  selector: 'app-pos-products',
  templateUrl: './pos-products.page.html',
  styleUrls: ['./pos-products.page.scss'],
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
    IonFab,
    IonFabButton,
    IonChip,
    IonSpinner,
    IonFooter
  ]
})
export class PosProductsPage implements OnInit {
  private router = inject(Router);
  private menuCtrl = inject(MenuController);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private productsService = inject(ProductsService);
  private cartService = inject(CartService);
  private barcodeService = inject(BarcodeService);

  // Reactive state with signals
  products = this.productsService.products;
  categories = this.productsService.categories;
  cartItems = this.cartService.cartItems;
  cartSummary = this.cartService.summary;
  selectedCategory = signal<string>('all');
  searchQuery = signal<string>('');
  isLoading = this.productsService.isLoading;
  isScanning = this.barcodeService.isScanning;

  // Computed values
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

  constructor() {
    this.registerIcons();
  }

  private registerIcons() {
    addIcons({ 
      'cart': cart, 
      'search': search, 
      'barcode': barcode, 
      'add': add, 
      'remove': remove, 
      'trash': trash, 
      'checkmark': checkmark, 
      'cart-outline': cartOutline 
    });
  }

  async ngOnInit() {
    await this.loadData();
  }

  async ionViewWillEnter() {
    await this.loadData();
  }

  private async loadData() {
    this.isLoading.set(true);
    try {
      // Products and categories are already loaded by the service
      // Just trigger a refresh
      await this.productsService.loadProducts();
      await this.productsService.loadCategories();
    } catch (error) {
      console.error('Error loading data:', error);
      this.showToast('Error loading products');
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearchChange(event: any) {
    this.searchQuery.set(event.detail.value || '');
  }

  /**
   * Scan barcode
   */
  async scanBarcode() {
    try {
      const result = await this.barcodeService.scan();
      
      if (result) {
        // Look up product by barcode
        await this.lookupByBarcode(result.text);
      } else if (this.barcodeService.scanError()) {
        // Scanner not available - prompt for manual entry
        this.manualBarcodeEntry();
      }
    } catch (error: any) {
      console.error('Barcode scan error:', error);
      this.showToast('Failed to scan barcode');
    }
  }

  /**
   * Lookup product by barcode
   */
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

  /**
   * Manual barcode entry (fallback)
   */
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

  selectCategory(categoryId: string) {
    this.selectedCategory.set(categoryId);
  }

  addToCart(product: Product) {
    this.cartService.addItem(product, 1);
    this.showToast(`${product.name} added to cart`);
  }

  updateQuantity(item: CartItem, change: number) {
    if (change > 0) {
      this.cartService.incrementItem(item.product._id, change);
    } else {
      this.cartService.decrementItem(item.product._id);
    }
  }

  removeFromCart(item: CartItem) {
    this.cartService.removeItem(item.product._id);
    this.showToast(`${item.product.name} removed from cart`);
  }

  async clearCart() {
    const alert = await this.alertCtrl.create({
      header: 'Clear Cart',
      message: 'Are you sure you want to clear all items from the cart?',
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
            this.showToast('Cart cleared');
          }
        }
      ]
    });

    await alert.present();
  }

  async checkout() {
    if (!this.cartService.hasItems()) {
      this.showToast('Cart is empty');
      return;
    }

    // Navigate to checkout page
    this.router.navigate(['/checkout']);
  }

  openMenu() {
    this.menuCtrl.open();
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
