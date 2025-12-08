import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonChip,
  IonBadge,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonListHeader,
  MenuController,
  AlertController,
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  menuOutline,
  barcodeOutline,
  cubeOutline,
  alertCircleOutline,
  closeCircleOutline,
  cashOutline,
  addOutline,
  removeOutline,
  createOutline,
  swapHorizontalOutline,
  checkmarkCircleOutline,
  alertCircle,
  closeCircle
} from 'ionicons/icons';

import { Product, Inventory } from '../../models';
import { ProductsService } from '../../core/services/products.service';
import { BarcodeService } from '../../core/services/barcode.service';
import { DbService } from '../../core/services/db.service';
import { StorageService } from '../../core/services/storage.service';

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.page.html',
  styleUrls: ['./inventory.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSearchbar,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonText,
    IonChip,
    IonBadge,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonRefresher,
    IonRefresherContent,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
    IonListHeader
  ]
})
export class InventoryPage implements OnInit {
  private menuCtrl = inject(MenuController);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  private productsService = inject(ProductsService);
  private barcodeService = inject(BarcodeService);
  private db = inject(DbService);
  private storage = inject(StorageService);

  // State
  products = this.productsService.products;
  isLoading = this.productsService.isLoading;
  isScanning = this.barcodeService.isScanning;
  
  activeView = signal<'overview' | 'adjustments' | 'alerts'>('overview');
  searchQuery = signal<string>('');
  stockFilter = signal<'all' | 'low' | 'out'>('all');
  adjustmentFilter = signal<'all' | 'purchase' | 'sale' | 'adjustment' | 'return'>('all');
  adjustments = signal<Inventory[]>([]);

  // Computed
  inventoryStats = computed(() => {
    const prods = this.products();
    return {
      totalItems: prods.reduce((sum, p) => sum + p.quantity, 0),
      lowStock: prods.filter(p => p.quantity > 0 && p.quantity <= 10).length,
      outOfStock: prods.filter(p => p.quantity === 0).length,
      totalValue: prods.reduce((sum, p) => sum + (p.price * p.quantity), 0)
    };
  });

  filteredProducts = computed(() => {
    let filtered = this.products();

    // Apply stock filter
    const filter = this.stockFilter();
    if (filter === 'low') {
      filtered = filtered.filter(p => p.quantity > 0 && p.quantity <= 10);
    } else if (filter === 'out') {
      filtered = filtered.filter(p => p.quantity === 0);
    }

    // Apply search query
    const query = this.searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.barcode.includes(query)
      );
    }

    return filtered;
  });

  lowStockProducts = computed(() =>
    this.products().filter(p => p.quantity > 0 && p.quantity <= 10)
  );

  outOfStockProducts = computed(() =>
    this.products().filter(p => p.quantity === 0)
  );

  filteredAdjustments = computed(() => {
    const filter = this.adjustmentFilter();
    if (filter === 'all') {
      return this.adjustments();
    }
    return this.adjustments().filter(a => a.action === filter);
  });

  constructor() {
    this.registerIcons();
  }

  private registerIcons() {
    addIcons({
      'menu-outline': menuOutline,
      'barcode-outline': barcodeOutline,
      'cube-outline': cubeOutline,
      'alert-circle-outline': alertCircleOutline,
      'close-circle-outline': closeCircleOutline,
      'cash-outline': cashOutline,
      'add-outline': addOutline,
      'remove-outline': removeOutline,
      'create-outline': createOutline,
      'swap-horizontal-outline': swapHorizontalOutline,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'alert-circle': alertCircle,
      'close-circle': closeCircle
    });
  }

  async ngOnInit() {
    await this.loadData();
  }

  private async loadData() {
    await this.productsService.loadProducts();
    await this.loadAdjustments();
  }

  private async loadAdjustments() {
    try {
      const result = await this.db.find<Inventory>({
        type: 'inventory'
      });

      // Sort by date descending
      const sorted = result.sort((a, b) => b.createdAt - a.createdAt);
      this.adjustments.set(sorted);
    } catch (error) {
      console.error('Error loading adjustments:', error);
    }
  }

  openMenu() {
    this.menuCtrl.open();
  }

  changeView(view: 'overview' | 'adjustments' | 'alerts') {
    this.activeView.set(view);
  }

  onSearchChange(event: any) {
    this.searchQuery.set(event.target.value || '');
  }

  setStockFilter(filter: 'all' | 'low' | 'out') {
    this.stockFilter.set(filter);
  }

  setAdjustmentFilter(filter: 'all' | 'purchase' | 'sale' | 'adjustment' | 'return') {
    this.adjustmentFilter.set(filter);
  }

  async handleRefresh(event: any) {
    await this.loadData();
    event.target.complete();
  }

  async scanBarcode() {
    try {
      const result = await this.barcodeService.scan();
      if (result?.text) {
        this.searchQuery.set(result.text);
        const product = this.products().find(p => p.barcode === result.text);
        if (product) {
          await this.adjustStock(product, 'add');
        } else {
          await this.showToast('Product not found');
        }
      }
    } catch (error: any) {
      console.error('Error scanning barcode:', error);
      if (error.message !== 'Scan cancelled') {
        await this.showToast(error.message || 'Failed to scan barcode');
      }
    }
  }

  async adjustStock(product: Product, action: 'add' | 'remove' | 'correct') {
    const alert = await this.alertCtrl.create({
      header: action === 'add' ? 'Add Stock' : action === 'remove' ? 'Remove Stock' : 'Correct Stock',
      subHeader: product.name,
      message: `Current quantity: ${product.quantity}`,
      inputs: [
        {
          name: 'quantity',
          type: 'number',
          placeholder: action === 'correct' ? 'New quantity' : 'Quantity',
          value: action === 'correct' ? product.quantity.toString() : '',
          attributes: {
            required: true,
            min: action === 'remove' ? 1 : 0
          }
        },
        {
          name: 'notes',
          type: 'textarea',
          placeholder: 'Notes (optional)'
        },
        {
          name: 'reference',
          type: 'text',
          placeholder: 'Reference (e.g., PO#, Invoice#)'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Confirm',
          handler: async (data) => {
            const qty = parseInt(data.quantity);
            if (isNaN(qty) || qty < 0) {
              await this.showToast('Please enter a valid quantity');
              return false;
            }

            if (action === 'remove' && qty > product.quantity) {
              await this.showToast('Cannot remove more than available quantity');
              return false;
            }

            await this.processStockAdjustment(product, action, qty, data.notes, data.reference);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  private async processStockAdjustment(
    product: Product,
    action: 'add' | 'remove' | 'correct',
    quantity: number,
    notes?: string,
    reference?: string
  ) {
    const loading = await this.loadingCtrl.create({
      message: 'Updating stock...'
    });
    await loading.present();

    try {
      let newQuantity: number;
      let adjustmentQty: number;

      if (action === 'correct') {
        adjustmentQty = quantity - product.quantity;
        newQuantity = quantity;
      } else if (action === 'add') {
        adjustmentQty = quantity;
        newQuantity = product.quantity + quantity;
      } else {
        adjustmentQty = -quantity;
        newQuantity = product.quantity - quantity;
      }

      // Update product quantity
      await this.productsService.updateProduct(product._id, {
        quantity: newQuantity
      });

      // Record inventory adjustment
      const userId = (await this.storage.get('user-id') as string) || 'system';
      const adjustment: Inventory = {
        _id: 'INV_' + Date.now(),
        type: 'inventory',
        product: product._id,
        quantity: adjustmentQty,
        action: 'adjustment',
        reference: reference || undefined,
        notes: notes || undefined,
        createdAt: Date.now(),
        createdBy: userId
      };

      await this.db.put(adjustment);

      // Reload adjustments
      await this.loadAdjustments();

      await this.showToast(`Stock ${action === 'add' ? 'added' : action === 'remove' ? 'removed' : 'corrected'} successfully`);
    } catch (error: any) {
      console.error('Error adjusting stock:', error);
      await this.showToast(error.message || 'Failed to adjust stock');
    } finally {
      await loading.dismiss();
    }
  }

  getStockStatusColor(product: Product): string {
    if (product.quantity === 0) return 'danger';
    if (product.quantity <= 10) return 'warning';
    return 'success';
  }

  getStockStatusLabel(product: Product): string {
    if (product.quantity === 0) return 'Out of Stock';
    if (product.quantity <= 10) return 'Low Stock';
    return 'In Stock';
  }

  getAdjustmentColor(action: string): string {
    switch (action) {
      case 'purchase':
      case 'return':
        return 'success';
      case 'sale':
        return 'primary';
      case 'adjustment':
        return 'warning';
      default:
        return 'medium';
    }
  }

  getProductName(productId: string): string {
    const product = this.products().find(p => p._id === productId);
    return product?.name || 'Unknown Product';
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
