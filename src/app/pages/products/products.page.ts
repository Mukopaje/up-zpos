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
  IonFab,
  IonFabButton,
  IonSegment,
  IonSegmentButton,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonCheckbox,
  IonSpinner,
  MenuController,
  AlertController,
  ToastController,
  LoadingController,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  menuOutline,
  addOutline,
  searchOutline,
  createOutline,
  trashOutline,
  listOutline,
  gridOutline,
  barcodeOutline,
  pricetagOutline,
  imageOutline,
  cubeOutline
} from 'ionicons/icons';

import { Product, Category } from '../../models';
import { ProductsService } from '../../core/services/products.service';

@Component({
  selector: 'app-products',
  templateUrl: './products.page.html',
  styleUrls: ['./products.page.scss'],
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
    IonFab,
    IonFabButton,
    IonSegment,
    IonSegmentButton,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonCheckbox,
    IonSpinner
  ]
})
export class ProductsPage implements OnInit {
  private menuCtrl = inject(MenuController);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  private modalCtrl = inject(ModalController);
  private productsService = inject(ProductsService);

  // State
  products = this.productsService.products;
  categories = this.productsService.categories;
  isLoading = this.productsService.isLoading;
  
  searchQuery = signal<string>('');
  selectedCategory = signal<string>('all');
  viewMode = signal<'list' | 'grid'>('grid');

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

  productStats = computed(() => {
    const prods = this.products();
    return {
      total: prods.length,
      lowStock: prods.filter(p => p.quantity <= 10).length, // Use fixed threshold
      outOfStock: prods.filter(p => p.quantity === 0).length,
      value: prods.reduce((sum, p) => sum + (p.price * p.quantity), 0)
    };
  });

  constructor() {
    this.registerIcons();
  }

  private registerIcons() {
    addIcons({
      'menu-outline': menuOutline,
      'add-outline': addOutline,
      'search-outline': searchOutline,
      'create-outline': createOutline,
      'trash-outline': trashOutline,
      'list-outline': listOutline,
      'grid-outline': gridOutline,
      'barcode-outline': barcodeOutline,
      'pricetag-outline': pricetagOutline,
      'image-outline': imageOutline,
      'cube-outline': cubeOutline
    });
  }

  async ngOnInit() {
    await this.loadData();
  }

  private async loadData() {
    await this.productsService.loadProducts();
    await this.productsService.loadCategories();
  }

  openMenu() {
    this.menuCtrl.open();
  }

  onSearchChange(event: any) {
    this.searchQuery.set(event.target.value || '');
  }

  selectCategory(categoryId: string) {
    this.selectedCategory.set(categoryId);
  }

  toggleViewMode() {
    this.viewMode.set(this.viewMode() === 'grid' ? 'list' : 'grid');
  }

  async handleRefresh(event: any) {
    await this.loadData();
    event.target.complete();
  }

  async addProduct() {
    const alert = await this.alertCtrl.create({
      header: 'Add Product',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Product Name',
          attributes: {
            required: true
          }
        },
        {
          name: 'barcode',
          type: 'text',
          placeholder: 'Barcode',
          attributes: {
            required: true
          }
        },
        {
          name: 'price',
          type: 'number',
          placeholder: 'Price',
          attributes: {
            required: true,
            min: 0,
            step: 0.01
          }
        },
        {
          name: 'cost',
          type: 'number',
          placeholder: 'Cost',
          value: '0',
          attributes: {
            min: 0,
            step: 0.01
          }
        },
        {
          name: 'quantity',
          type: 'number',
          placeholder: 'Initial Quantity',
          value: '0',
          attributes: {
            required: true,
            min: 0
          }
        },
        {
          name: 'description',
          type: 'textarea',
          placeholder: 'Description (Optional)'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Add',
          handler: async (data) => {
            if (!data.name || !data.barcode || !data.price) {
              await this.showToast('Please fill in all required fields');
              return false;
            }

            await this.createProduct(data);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  private async createProduct(data: any) {
    const loading = await this.loadingCtrl.create({
      message: 'Creating product...'
    });
    await loading.present();

    try {
      const categoryId = this.selectedCategory() !== 'all' 
        ? this.selectedCategory() 
        : this.categories()[0]?._id || '';

      await this.productsService.createProduct(
        data.name,
        data.barcode,
        categoryId,
        parseFloat(data.price),
        parseFloat(data.cost || '0'),
        parseInt(data.quantity),
        '', // imageBase64
        {
          description: data.description || ''
        }
      );

      // Force reload products to ensure UI updates
      await this.productsService.loadProducts();
      
      await this.showToast('Product created successfully');
    } catch (error: any) {
      console.error('Error creating product:', error);
      await this.showToast(error.message || 'Failed to create product');
    } finally {
      await loading.dismiss();
    }
  }

  async editProduct(product: Product) {
    const alert = await this.alertCtrl.create({
      header: 'Edit Product',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Product Name',
          value: product.name,
          attributes: {
            required: true
          }
        },
        {
          name: 'barcode',
          type: 'text',
          placeholder: 'Barcode',
          value: product.barcode,
          attributes: {
            required: true
          }
        },
        {
          name: 'price',
          type: 'number',
          placeholder: 'Price',
          value: product.price.toString(),
          attributes: {
            required: true,
            min: 0,
            step: 0.01
          }
        },
        {
          name: 'cost',
          type: 'number',
          placeholder: 'Cost',
          value: product.cost?.toString() || '0',
          attributes: {
            min: 0,
            step: 0.01
          }
        },
        {
          name: 'quantity',
          type: 'number',
          placeholder: 'Quantity',
          value: product.quantity.toString(),
          attributes: {
            required: true,
            min: 0
          }
        },
        {
          name: 'description',
          type: 'textarea',
          placeholder: 'Description',
          value: product.description || ''
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save',
          handler: async (data) => {
            if (!data.name || !data.barcode || !data.price) {
              await this.showToast('Please fill in all required fields');
              return false;
            }

            await this.updateProduct(product._id, data);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  private async updateProduct(productId: string, data: any) {
    const loading = await this.loadingCtrl.create({
      message: 'Updating product...'
    });
    await loading.present();

    try {
      await this.productsService.updateProduct(productId, {
        name: data.name,
        barcode: data.barcode,
        price: parseFloat(data.price),
        cost: parseFloat(data.cost || '0'),
        quantity: parseInt(data.quantity),
        description: data.description || ''
      });

      // Force reload products to ensure UI updates
      await this.productsService.loadProducts();
      
      await this.showToast('Product updated successfully');
    } catch (error: any) {
      console.error('Error updating product:', error);
      await this.showToast(error.message || 'Failed to update product');
    } finally {
      await loading.dismiss();
    }
  }

  async deleteProduct(product: Product) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Product',
      message: `Are you sure you want to delete "${product.name}"?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingCtrl.create({
              message: 'Deleting product...'
            });
            await loading.present();

            try {
              await this.productsService.deleteProduct(product._id);
              
              // Force reload products to ensure UI updates
              await this.productsService.loadProducts();
              
              await this.showToast('Product deleted successfully');
            } catch (error: any) {
              console.error('Error deleting product:', error);
              await this.showToast(error.message || 'Failed to delete product');
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async toggleProductStatus(product: Product) {
    const loading = await this.loadingCtrl.create({
      message: 'Updating status...'
    });
    await loading.present();

    try {
      await this.productsService.updateProduct(product._id, {
        active: !product.active
      });
      
      // Force reload products to ensure UI updates
      await this.productsService.loadProducts();
      
      await this.showToast(`Product ${product.active ? 'deactivated' : 'activated'}`);
    } catch (error: any) {
      console.error('Error updating product status:', error);
      await this.showToast(error.message || 'Failed to update status');
    } finally {
      await loading.dismiss();
    }
  }

  getStockStatus(product: Product): { color: string; label: string } {
    if (product.quantity === 0) {
      return { color: 'danger', label: 'Out of Stock' };
    } else if (product.quantity <= 10) { // Use fixed threshold
      return { color: 'warning', label: 'Low Stock' };
    } else {
      return { color: 'success', label: 'In Stock' };
    }
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
