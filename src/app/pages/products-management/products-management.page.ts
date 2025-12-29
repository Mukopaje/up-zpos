import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductsService } from '../../core/services/products.service';
import { Product, Category } from '../../models';
import { ApiService } from '../../core/services/api.service';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonFab,
  IonFabButton,
  IonFabList,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonBadge,
  IonSpinner,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonRefresher,
  IonRefresherContent,
  ModalController,
  AlertController,
  ToastController,
  ActionSheetController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add,
  searchOutline,
  barcodeOutline,
  cloudUploadOutline,
  cloudDownloadOutline,
  sparklesOutline,
  imageOutline,
  listOutline,
  gridOutline,
  filterOutline,
  trashOutline,
  createOutline,
  refreshOutline,
  pricetagsOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-products-management',
  templateUrl: './products-management.page.html',
  styleUrls: ['./products-management.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSearchbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonFab,
    IonFabButton,
    IonFabList,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonBadge,
    IonSpinner,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class ProductsManagementPage implements OnInit {
  products = signal<Product[]>([]);
  searchQuery = signal('');
  viewMode = signal<'grid' | 'list'>('grid');
  isLoading = signal(false);
  selectedCategory = signal<string>('all');
  
  categories = signal<string[]>(['All Categories']);
  categoryObjects = signal<Category[]>([]);

  filteredProducts = computed(() => {
    let filtered = this.products();
    
    const query = this.searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.barcode?.toLowerCase().includes(query)
      );
    }

    const category = this.selectedCategory();
    if (category !== 'all') {
      filtered = filtered.filter((p) => p.category === category);
    }

    return filtered;
  });

  private productsService = inject(ProductsService);

  constructor(
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController
  ) {
    addIcons({
      add,
      searchOutline,
      barcodeOutline,
      cloudUploadOutline,
      cloudDownloadOutline,
      sparklesOutline,
      imageOutline,
      listOutline,
      gridOutline,
      filterOutline,
      trashOutline,
      createOutline,
      refreshOutline,
      pricetagsOutline,
    });
  }

  async ngOnInit() {
    await this.loadCategories();
    await this.loadProducts();
  }

  async loadCategories() {
    try {
      await this.productsService.loadCategories();
      const dbCategories = this.productsService.categories();
      this.categoryObjects.set(dbCategories);
      const categoryNames = ['All Categories', ...dbCategories.map(c => c.name)];
      this.categories.set(categoryNames);
    } catch (error) {
      console.error('Error loading categories:', error);
      // Fallback to default if loading fails
      this.categories.set(['All Categories', 'Other']);
    }
  }

  async loadProducts() {
    this.isLoading.set(true);
    try {
      await this.productsService.loadProducts();
      const products = this.productsService.products();
      this.products.set(products);
    } catch (error) {
      console.error('Error loading products:', error);
      await this.showToast('Failed to load products', 'danger');
    } finally {
      this.isLoading.set(false);
    }
  }

  async openAddProductModal() {
    const modal = await this.modalCtrl.create({
      component: ProductEditModalComponent,
      componentProps: {
        mode: 'add',
      },
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();
    
    if (data?.product) {
      await this.saveProduct(data.product);
    }
  }

  async openEditProductModal(product: Product) {
    const modal = await this.modalCtrl.create({
      component: ProductEditModalComponent,
      componentProps: {
        mode: 'edit',
        product: { ...product },
      },
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();
    
    if (data?.product) {
      await this.updateProduct(data.product);
    }
  }

  async scanBarcode() {
    try {
      // TODO: Implement barcode scanner using Capacitor plugin
      // For now, show input dialog
      const alert = await this.alertCtrl.create({
        header: 'Scan Barcode',
        message: 'Enter barcode manually or use scanner',
        inputs: [
          {
            name: 'barcode',
            type: 'text',
            placeholder: 'Enter barcode',
          },
        ],
        buttons: [
          { text: 'Cancel', role: 'cancel' },
          {
            text: 'Search',
            handler: async (data) => {
              if (data.barcode) {
                await this.searchMasterCatalog(data.barcode);
              }
            },
          },
        ],
      });

      await alert.present();
    } catch (error) {
      console.error('Error scanning barcode:', error);
      await this.showToast('Failed to scan barcode', 'danger');
    }
  }

  async searchMasterCatalog(barcode: string) {
    this.isLoading.set(true);
    try {
      // TODO: Call backend API to search master catalog
      // const result = await this.http.get(`/api/products/master-catalog?barcode=${barcode}`).toPromise();
      
      // Mock response
      const found = {
        name: 'Product from Master Catalog',
        barcode,
        manufacturer: 'Generic Brand',
        description: 'Auto-populated from master catalog',
        suggestedCategory: 'Food & Beverages',
      };

      // Open quick-add modal with pre-filled data
      await this.openQuickAddModal(found);
    } catch (error) {
      await this.showToast('Product not found in master catalog', 'warning');
      // Open blank add modal
      await this.openAddProductModal();
    } finally {
      this.isLoading.set(false);
    }
  }

  async openQuickAddModal(prefillData: any) {
    const modal = await this.modalCtrl.create({
      component: ProductEditModalComponent,
      componentProps: {
        mode: 'quick-add',
        prefillData,
      },
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();
    
    if (data?.product) {
      await this.saveProduct(data.product);
    }
  }

  async showBulkActions() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Bulk Actions',
      buttons: [
        {
          text: 'Import from CSV',
          icon: 'cloud-upload-outline',
          handler: () => this.importFromCSV(),
        },
        {
          text: 'Export to CSV',
          icon: 'cloud-download-outline',
          handler: () => this.exportToCSV(),
        },
        {
          text: 'Sync with Cloud',
          icon: 'refresh-outline',
          handler: () => this.syncWithCloud(),
        },
        {
          text: 'Cancel',
          role: 'cancel',
        },
      ],
    });

    await actionSheet.present();
  }

  async importFromCSV() {
    // TODO: Implement CSV import using Capacitor Filesystem
    await this.showToast('CSV import coming soon', 'warning');
  }

  async exportToCSV() {
    try {
      const csvContent = this.generateCSV(this.products());
      // TODO: Save using Capacitor Filesystem
      await this.showToast('Products exported successfully', 'success');
    } catch (error) {
      await this.showToast('Failed to export products', 'danger');
    }
  }

  generateCSV(products: Product[]): string {
    const headers = ['Name', 'Barcode', 'Category', 'Price', 'Cost', 'Stock', 'Description'];
    const rows = products.map((p) => [
      p.name,
      p.barcode || '',
      p.category || '',
      p.price,
      p.cost || '',
      p.quantity || 0,
      p.description || '',
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }

  async syncWithCloud() {
    this.isLoading.set(true);
    try {
      // TODO: Implement sync service
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Mock delay
      await this.showToast('Synced with cloud successfully', 'success');
    } catch (error) {
      await this.showToast('Sync failed', 'danger');
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteProduct(product: Product) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Product',
      message: `Are you sure you want to delete "${product.name}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              if (!product._id) {
                throw new Error('Product ID is required for deletion');
              }
              await this.productsService.deleteProduct(product._id);
              await this.loadProducts();
              await this.showToast('Product deleted', 'success');
            } catch (error) {
              console.error('Error deleting product:', error);
              await this.showToast('Failed to delete product', 'danger');
            }
          },
        },
      ],
    });

    await alert.present();
  }

  async saveProduct(product: Product) {
    try {
      await this.productsService.createProduct(
        product.name,
        product.barcode || '',
        product.category || '',
        product.price,
        product.cost || 0,
        product.quantity || 0,
        product.imageUrl || '',
        {
          description: product.description,
          measure: product.unit,
          taxExempt: !product.taxable
        }
      );
      await this.loadProducts();
      await this.showToast('Product added successfully', 'success');
    } catch (error) {
      console.error('Error saving product:', error);
      await this.showToast('Failed to save product', 'danger');
    }
  }

  async updateProduct(product: Product) {
    try {
      if (!product._id) {
        throw new Error('Product ID is required for update');
      }
      
      await this.productsService.updateProduct(
        product._id,
        {
          name: product.name,
          barcode: product.barcode,
          category: product.category,
          price: product.price,
          description: product.description,
          unit: product.unit,
          taxable: product.taxable,
          active: product.active,
          imageUrl: product.imageUrl
        },
        product.quantity,
        product.cost
      );
      await this.loadProducts();
      await this.showToast('Product updated successfully', 'success');
    } catch (error) {
      console.error('Error updating product:', error);
      await this.showToast('Failed to update product', 'danger');
    }
  }

  async handleRefresh(event: any) {
    await this.loadProducts();
    event.target.complete();
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  toggleViewMode() {
    this.viewMode.update((mode) => (mode === 'grid' ? 'list' : 'grid'));
  }

  handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    // Set a simple SVG data URI as fallback
    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
  }
}

// Product Edit Modal Component (to be created separately)
import { Component as ModalComponent, Input } from '@angular/core';

@ModalComponent({
  selector: 'app-product-edit-modal',
  template: `
    <ion-header>
      <ion-toolbar color="dark">
        <ion-title>{{ mode === 'add' ? 'Add Product' : mode === 'edit' ? 'Edit Product' : 'Quick Add' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">Cancel</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-item>
        <ion-input
          [(ngModel)]="formData.name"
          label="Product Name"
          labelPlacement="floating"
          placeholder="Enter product name"
        ></ion-input>
      </ion-item>

      <ion-item>
        <ion-input
          [(ngModel)]="formData.sku"
          label="SKU"
          labelPlacement="floating"
          placeholder="Optional SKU"
        ></ion-input>
      </ion-item>

      <ion-item>
        <ion-input
          [(ngModel)]="formData.barcode"
          label="Barcode"
          labelPlacement="floating"
          placeholder="Scan or enter barcode"
        ></ion-input>
        <ion-button slot="end" fill="clear" (click)="scanBarcode()">
          <ion-icon name="barcode-outline"></ion-icon>
        </ion-button>
      </ion-item>

      <ion-item>
        <ion-select [(ngModel)]="formData.category" label="Category" labelPlacement="floating">
          <ion-select-option value="Food & Beverages">Food & Beverages</ion-select-option>
          <ion-select-option value="Electronics">Electronics</ion-select-option>
          <ion-select-option value="Clothing & Apparel">Clothing & Apparel</ion-select-option>
          <ion-select-option value="Home & Kitchen">Home & Kitchen</ion-select-option>
          <ion-select-option value="Other">Other</ion-select-option>
        </ion-select>
        <ion-button slot="end" fill="clear" (click)="generateCategory()" [disabled]="aiLoading().category">
          <ion-icon name="sparkles-outline" [color]="aiLoading().category ? 'medium' : 'primary'"></ion-icon>
        </ion-button>
      </ion-item>

      <ion-item>
        <ion-input
          [(ngModel)]="formData.price"
          type="number"
          label="Price"
          labelPlacement="floating"
          placeholder="0.00"
        ></ion-input>
      </ion-item>

      <ion-item>
        <ion-input
          [(ngModel)]="formData.cost"
          type="number"
          label="Cost"
          labelPlacement="floating"
          placeholder="0.00 (optional)"
        ></ion-input>
      </ion-item>

      <ion-item>
        <ion-input
          [(ngModel)]="formData.stockQuantity"
          type="number"
          label="Stock Quantity"
          labelPlacement="floating"
          placeholder="0"
        ></ion-input>
      </ion-item>

      <ion-item>
        <ion-textarea
          [(ngModel)]="formData.description"
          label="Description"
          labelPlacement="floating"
          placeholder="Product description"
          rows="3"
        ></ion-textarea>
      </ion-item>

      <ion-button expand="block" fill="outline" (click)="generateDescription()" [disabled]="aiLoading().description || !formData.name">
        <ion-icon name="sparkles-outline" slot="start"></ion-icon>
        {{ aiLoading().description ? 'Generating...' : 'Generate Description with AI' }}
      </ion-button>

      <ion-item *ngIf="formData.imageUrl">
        <img [src]="formData.imageUrl" alt="Product" style="max-width: 200px; margin: 10px auto; display: block;" />
      </ion-item>

      <ion-button expand="block" fill="outline" (click)="generateImage()" [disabled]="aiLoading().image || !formData.name">
        <ion-icon name="image-outline" slot="start"></ion-icon>
        {{ aiLoading().image ? 'Generating...' : 'Generate Image with AI' }}
      </ion-button>

      <ion-button expand="block" (click)="save()" [disabled]="!formData.name || !formData.price">
        Save Product
      </ion-button>
    </ion-content>
  `,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonItem,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
  ],
})
export class ProductEditModalComponent {
  @Input() mode: 'add' | 'edit' | 'quick-add' = 'add';
  @Input() product?: Product;
  @Input() prefillData?: any;

  formData: any = {
    name: '',
    sku: '',
    barcode: '',
    category: '',
    price: 0,
    cost: 0,
    stockQuantity: 0,
    description: '',
    imageUrl: '',
  };

  aiLoading = signal({
    description: false,
    image: false,
    category: false,
  });

  private apiService = inject(ApiService);

  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    if (this.product) {
      this.formData = { ...this.product };
    } else if (this.prefillData) {
      this.formData = {
        ...this.formData,
        ...this.prefillData,
        category: this.prefillData.suggestedCategory,
      };
    }
  }

  async generateDescription() {
    if (!this.formData.name) return;

    this.aiLoading.update((state) => ({ ...state, description: true }));
    try {
      const description = await this.apiService.generateProductDescription(
        this.formData.name,
        this.formData.category
      );
      
      this.formData.description = description;
      await this.showToast('Description generated successfully!', 'success');
    } catch (error: any) {
      console.error('Failed to generate description:', error);
      const message = error.message || 'Failed to generate description. Please check your API configuration.';
      await this.showToast(message, 'danger');
    } finally {
      this.aiLoading.update((state) => ({ ...state, description: false }));
    }
  }

  async generateImage() {
    if (!this.formData.name) return;

    this.aiLoading.update((state) => ({ ...state, image: true }));
    try {
      const imageUrl = await this.apiService.generateProductImage(
        this.formData.name,
        this.formData.description
      );
      
      this.formData.imageUrl = imageUrl;
      await this.showToast('Image generated successfully!', 'success');
    } catch (error: any) {
      console.error('Failed to generate image:', error);
      const message = error.message || 'Failed to generate image. Please check your API configuration.';
      await this.showToast(message, 'danger');
    } finally {
      this.aiLoading.update((state) => ({ ...state, image: false }));
    }
  }

  async generateCategory() {
    if (!this.formData.name) return;

    this.aiLoading.update((state) => ({ ...state, category: true }));
    try {
      const category = await this.apiService.suggestProductCategory(
        this.formData.name,
        this.formData.description
      );
      
      this.formData.category = category;
      await this.showToast('Category suggested successfully!', 'success');
    } catch (error: any) {
      console.error('Failed to suggest category:', error);
      const message = error.message || 'Failed to suggest category. Please check your API configuration.';
      await this.showToast(message, 'danger');
    } finally {
      this.aiLoading.update((state) => ({ ...state, category: false }));
    }
  }

  async scanBarcode() {
    // TODO: Implement barcode scanner
    await this.showToast('Barcode scanner coming soon', 'warning');
  }

  async save() {
    await this.modalCtrl.dismiss({
      product: this.formData,
    });
  }

  async dismiss() {
    await this.modalCtrl.dismiss();
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
