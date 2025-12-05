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
  MenuController,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cart, search, barcode, add, remove, trash, checkmark } from 'ionicons/icons';

import { Product, CartItem, Category } from '../../../models';
import { DbService } from '../../../core/services/db.service';

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
    IonChip
  ]
})
export class PosProductsPage implements OnInit {
  private router = inject(Router);
  private menuCtrl = inject(MenuController);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private dbService = inject(DbService);

  // Reactive state with signals
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  cartItems = signal<CartItem[]>([]);
  selectedCategory = signal<string>('all');
  searchQuery = signal<string>('');
  isLoading = signal<boolean>(false);

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

  cartTotal = computed(() =>
    this.cartItems().reduce((sum, item) => sum + item.total, 0)
  );

  cartItemCount = computed(() =>
    this.cartItems().reduce((sum, item) => sum + item.quantity, 0)
  );

  constructor() {
    this.registerIcons();
  }

  private registerIcons() {
    addIcons({ cart, search, barcode, add, remove, trash, checkmark });
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
      // Load products from database
      const products = await this.dbService.find<Product>({
        type: 'product',
        active: true
      });
      this.products.set(products);

      // Load categories
      const categories = await this.dbService.find<Category>({
        type: 'category',
        active: true
      });
      this.categories.set(categories);

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

  selectCategory(categoryId: string) {
    this.selectedCategory.set(categoryId);
  }

  addToCart(product: Product) {
    const currentCart = this.cartItems();
    const existingItemIndex = currentCart.findIndex(
      item => item.product._id === product._id
    );

    if (existingItemIndex >= 0) {
      // Update quantity
      const updatedCart = [...currentCart];
      updatedCart[existingItemIndex].quantity++;
      updatedCart[existingItemIndex].total =
        updatedCart[existingItemIndex].quantity * product.price;
      this.cartItems.set(updatedCart);
    } else {
      // Add new item
      const cartItem: CartItem = {
        product,
        quantity: 1,
        price: product.price,
        discount: 0,
        tax: product.taxable ? product.price * 0.16 : 0,
        total: product.price
      };
      this.cartItems.set([...currentCart, cartItem]);
    }

    this.showToast(`${product.name} added to cart`);
  }

  updateQuantity(item: CartItem, change: number) {
    const currentCart = this.cartItems();
    const index = currentCart.findIndex(i => i.product._id === item.product._id);

    if (index >= 0) {
      const updatedCart = [...currentCart];
      updatedCart[index].quantity += change;

      if (updatedCart[index].quantity <= 0) {
        // Remove item
        updatedCart.splice(index, 1);
      } else {
        // Update total
        updatedCart[index].total =
          updatedCart[index].quantity * updatedCart[index].price;
      }

      this.cartItems.set(updatedCart);
    }
  }

  removeFromCart(item: CartItem) {
    const currentCart = this.cartItems();
    this.cartItems.set(currentCart.filter(i => i.product._id !== item.product._id));
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
            this.cartItems.set([]);
            this.showToast('Cart cleared');
          }
        }
      ]
    });

    await alert.present();
  }

  async checkout() {
    if (this.cartItems().length === 0) {
      this.showToast('Cart is empty');
      return;
    }

    // Navigate to checkout page with cart data
    this.router.navigate(['/checkout'], {
      state: { cartItems: this.cartItems() }
    });
  }

  openMenu() {
    this.menuCtrl.open();
  }

  async scanBarcode() {
    // TODO: Implement Capacitor barcode scanner
    this.showToast('Barcode scanner not yet implemented');
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
