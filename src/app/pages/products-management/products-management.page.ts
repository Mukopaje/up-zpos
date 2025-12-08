import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
} from 'ionicons/icons';

interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  price: number;
  cost?: number;
  stockQuantity: number;
  description?: string;
  imageUrl?: string;
  aiGeneratedDescription?: string;
  aiGeneratedImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

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
  
  categories = [
    'All Categories',
    'Food & Beverages',
    'Electronics',
    'Clothing & Apparel',
    'Home & Kitchen',
    'Beauty & Personal Care',
    'Hardware & Tools',
    'Office Supplies',
    'Sports & Outdoors',
    'Toys & Games',
    'Health & Wellness',
    'Other',
  ];

  filteredProducts = computed(() => {
    let filtered = this.products();
    
    const query = this.searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.sku?.toLowerCase().includes(query) ||
          p.barcode?.toLowerCase().includes(query)
      );
    }

    const category = this.selectedCategory();
    if (category !== 'all') {
      filtered = filtered.filter((p) => p.category === category);
    }

    return filtered;
  });

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
    });
  }

  async ngOnInit() {
    await this.loadProducts();
  }

  async loadProducts() {
    this.isLoading.set(true);
    try {
      // TODO: Replace with actual SQLite query
      const mockProducts: Product[] = [
        {
          id: '1',
          name: 'Coca Cola 500ml',
          barcode: '5449000000996',
          category: 'Food & Beverages',
          price: 1.50,
          cost: 0.80,
          stockQuantity: 150,
          description: 'Refreshing carbonated soft drink',
          imageUrl: 'https://via.placeholder.com/200',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'Samsung Galaxy Phone',
          sku: 'SAM-GAL-001',
          category: 'Electronics',
          price: 599.99,
          cost: 450.00,
          stockQuantity: 25,
          description: 'Latest smartphone with advanced features',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      this.products.set(mockProducts);
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
    const headers = ['Name', 'SKU', 'Barcode', 'Category', 'Price', 'Cost', 'Stock', 'Description'];
    const rows = products.map((p) => [
      p.name,
      p.sku || '',
      p.barcode || '',
      p.category || '',
      p.price,
      p.cost || '',
      p.stockQuantity,
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
              // TODO: Delete from SQLite
              const updated = this.products().filter((p) => p.id !== product.id);
              this.products.set(updated);
              await this.showToast('Product deleted', 'success');
            } catch (error) {
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
      // TODO: Save to SQLite and add to outbox
      const newProduct = {
        ...product,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      this.products.update((products) => [...products, newProduct]);
      await this.showToast('Product added successfully', 'success');
    } catch (error) {
      await this.showToast('Failed to save product', 'danger');
    }
  }

  async updateProduct(product: Product) {
    try {
      // TODO: Update in SQLite
      this.products.update((products) =>
        products.map((p) => (p.id === product.id ? { ...product, updatedAt: new Date() } : p))
      );
      await this.showToast('Product updated successfully', 'success');
    } catch (error) {
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
      // TODO: Call backend API
      // const response = await this.http.post('/api/products/ai/generate-description', {
      //   productName: this.formData.name,
      //   category: this.formData.category
      // }).toPromise();
      
      // Mock AI response
      await new Promise((resolve) => setTimeout(resolve, 2000));
      this.formData.description = `${this.formData.name} is a premium product designed for African markets. Features high quality construction and competitive pricing. Ideal for retail and wholesale distribution.`;
      
      await this.showToast('Description generated successfully', 'success');
    } catch (error) {
      await this.showToast('Failed to generate description', 'danger');
    } finally {
      this.aiLoading.update((state) => ({ ...state, description: false }));
    }
  }

  async generateImage() {
    if (!this.formData.name) return;

    this.aiLoading.update((state) => ({ ...state, image: true }));
    try {
      // TODO: Call backend API
      // const response = await this.http.post('/api/products/ai/generate-image', {
      //   productName: this.formData.name,
      //   description: this.formData.description
      // }).toPromise();
      
      // Mock AI response
      await new Promise((resolve) => setTimeout(resolve, 3000));
      this.formData.imageUrl = 'https://via.placeholder.com/400?text=' + encodeURIComponent(this.formData.name);
      
      await this.showToast('Image generated successfully', 'success');
    } catch (error) {
      await this.showToast('Failed to generate image', 'danger');
    } finally {
      this.aiLoading.update((state) => ({ ...state, image: false }));
    }
  }

  async generateCategory() {
    if (!this.formData.name) return;

    this.aiLoading.update((state) => ({ ...state, category: true }));
    try {
      // TODO: Call backend API
      await new Promise((resolve) => setTimeout(resolve, 1500));
      this.formData.category = 'Food & Beverages'; // Mock
      
      await this.showToast('Category suggested', 'success');
    } catch (error) {
      await this.showToast('Failed to suggest category', 'danger');
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
