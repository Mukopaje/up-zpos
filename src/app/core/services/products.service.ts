import { Injectable, inject, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { DbService } from './db.service';
import { StorageService } from './storage.service';
import { Product, Category, ItemInv } from '../../models';

interface Department {
  _id: string;
  _rev?: string;
  name: string;
  type: 'department';
  location: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private db = inject(DbService);
  private storage = inject(StorageService);

  // Reactive state with signals
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  departments = signal<Department[]>([]);
  isLoading = signal<boolean>(false);

  // BehaviorSubject for backwards compatibility
  private _categorySubject = new BehaviorSubject<Category | null>(null);
  category$ = this._categorySubject.asObservable();

  // Computed values
  activeProducts = computed(() => 
    this.products().filter(p => p.active)
  );

  productCount = computed(() => this.products().length);

  private locationId: string = '';
  private warehouseId: string = '';

  constructor() {
    this.initializeLocation();
    this.loadInitialData();
  }

  private async initializeLocation() {
    try {
      this.locationId = await this.storage.get('location_id') || 'default';
      this.warehouseId = await this.storage.get('warehouse') || 'main';
    } catch (error) {
      console.error('Error loading location settings:', error);
    }
  }

  private async loadInitialData() {
    await this.loadProducts();
    await this.loadCategories();
    await this.loadDepartments();
  }

  /**
   * Load all products from database
   */
  async loadProducts(): Promise<Product[]> {
    this.isLoading.set(true);
    try {
      const result = await this.db.find<Product>({
        type: 'product'
      });

      const processedProducts = await this.processProducts(result);
      this.products.set(processedProducts);
      
      return processedProducts;
    } catch (error) {
      console.error('Error loading products:', error);
      return [];
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Process products - handle inventory filtering and image attachments
   */
  private async processProducts(products: Product[]): Promise<Product[]> {
    const dataURIPrefix = 'data:image/jpeg;base64,';
    
    return products.map(item => {
      // Filter inventory for current location and warehouse
      const filteredInventory = this.processInventory(item.inventory || []);
      
      // Process image attachment
      let imageData = '';
      if (item._attachments?.['product.jpg']?.data) {
        imageData = dataURIPrefix + item._attachments['product.jpg'].data;
      }

      return {
        ...item,
        inventory: filteredInventory,
        imageUrl: imageData
      };
    });
  }

  /**
   * Filter inventory for current location/warehouse
   */
  private processInventory(inventory: ItemInv[]): ItemInv[] {
    const filtered = inventory.find(
      item => item.location === this.locationId && item.warehouse === this.warehouseId
    );

    if (filtered) {
      return [filtered];
    }

    // Return default inventory if none found
    return [{
      location: this.locationId,
      warehouse: this.warehouseId,
      qty: 0,
      cost: 0
    }];
  }

  /**
   * Get single product by ID
   */
  async getProduct(id: string): Promise<Product | null> {
    try {
      const doc = await this.db.get<Product>(id);
      
      if (!doc) return null;

      const dataURIPrefix = 'data:image/jpeg;base64,';
      let imageData = '';
      
      if (doc._attachments?.['product.jpg']?.data) {
        imageData = dataURIPrefix + doc._attachments['product.jpg'].data;
      }

      return {
        ...doc,
        inventory: this.processInventory(doc.inventory || []),
        imageUrl: imageData
      };
    } catch (error) {
      console.error('Error getting product:', error);
      return null;
    }
  }

  /**
   * Get product by barcode
   */
  async getProductByBarcode(barcode: string): Promise<Product | null> {
    try {
      const products = this.products();
      const product = products.find(p => p.barcode === barcode);
      
      if (product) {
        return product;
      }

      // Fallback to database search
      const result = await this.db.find<Product>({
        type: 'product',
        barcode: barcode
      });

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Error finding product by barcode:', error);
      return null;
    }
  }

  /**
   * Create new product
   */
  async createProduct(
    name: string,
    barcode: string,
    category: string,
    price: number,
    cost: number,
    qty: number,
    imageBase64: string = '',
    options: {
      description?: string;
      measure?: string;
      taxExempt?: boolean;
      departments?: string[];
    } = {}
  ): Promise<Product | null> {
    try {
      const timestamp = new Date().toISOString();
      const base64String = imageBase64 ? imageBase64.substring(23) : '';

      const product: Product = {
        _id: 'PRD_' + timestamp,
        type: 'product',
        name,
        barcode,
        category,
        price,
        description: options.description || '',
        unit: options.measure || 'unit',
        taxable: !options.taxExempt,
        active: true,
        quantity: qty, // Kept for compatibility
        cost,
        inventory: [{
          location: this.locationId,
          warehouse: this.warehouseId,
          qty,
          cost
        }],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: await this.storage.get('user-id') || 'system',
        updatedBy: await this.storage.get('user-id') || 'system',
        imageUrl: '',
        _attachments: base64String ? {
          'product.jpg': {
            content_type: 'image/jpeg',
            data: base64String
          }
        } : undefined
      };

      const savedProduct = await this.db.put(product);
      
      // Reload products
      await this.loadProducts();
      
      return savedProduct;
    } catch (error) {
      console.error('Error creating product:', error);
      return null;
    }
  }

  /**
   * Update existing product
   */
  async updateProduct(
    id: string,
    updates: Partial<Product>,
    qty?: number,
    cost?: number
  ): Promise<Product | null> {
    try {
      const existing = await this.db.get<Product>(id);
      
      if (!existing) {
        throw new Error('Product not found');
      }

      // Update inventory if provided
      if (qty !== undefined || cost !== undefined) {
        const inventory = existing.inventory || [];
        const currentInvIndex = inventory.findIndex(
          inv => inv.location === this.locationId && inv.warehouse === this.warehouseId
        );

        if (currentInvIndex >= 0) {
          inventory[currentInvIndex] = {
            ...inventory[currentInvIndex],
            qty: qty !== undefined ? qty : inventory[currentInvIndex].qty,
            cost: cost !== undefined ? cost : inventory[currentInvIndex].cost
          };
        } else {
          inventory.push({
            location: this.locationId,
            warehouse: this.warehouseId,
            qty: qty || 0,
            cost: cost || 0
          });
        }

        updates.inventory = inventory;
      }

      // Handle image update
      if (updates.imageUrl && updates.imageUrl.includes('base64')) {
        const base64String = updates.imageUrl.substring(23);
        updates._attachments = {
          'product.jpg': {
            content_type: 'image/jpeg',
            data: base64String
          }
        };
      }

      const updatedProduct: Product = {
        ...existing,
        ...updates,
        updatedAt: Date.now(),
        updatedBy: await this.storage.get('user-id') || 'system'
      };

      const saved = await this.db.put(updatedProduct);
      
      // Reload products
      await this.loadProducts();
      
      return saved;
    } catch (error) {
      console.error('Error updating product:', error);
      return null;
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(id: string): Promise<boolean> {
    try {
      const product = await this.db.get<Product>(id);
      
      if (!product || !product._rev) return false;

      await this.db.delete(product as any);
      
      // Reload products
      await this.loadProducts();
      
      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      return false;
    }
  }

  /**
   * Load all categories
   */
  async loadCategories(): Promise<Category[]> {
    try {
      const result = await this.db.find<Category>({
        type: 'category'
      });

      const processedCategories = result.map(cat => {
        const dataURIPrefix = 'data:image/jpeg;base64,';
        let imageData = '';
        
        if (cat._attachments?.['category.jpg']?.data) {
          imageData = dataURIPrefix + cat._attachments['category.jpg'].data;
        }

        return {
          ...cat,
          icon: imageData,
          active: cat.active !== false
        };
      });

      this.categories.set(processedCategories);
      return processedCategories;
    } catch (error) {
      console.error('Error loading categories:', error);
      return [];
    }
  }

  /**
   * Get category by ID
   */
  async getCategory(id: string): Promise<Category | null> {
    try {
      const doc = await this.db.get<any>(id);
      
      if (!doc) return null;

      const dataURIPrefix = 'data:image/jpeg;base64,';
      let imageData = '';
      
      if (doc._attachments?.['category.jpg']?.data) {
        imageData = dataURIPrefix + doc._attachments['category.jpg'].data;
      }

      return {
        _id: doc._id,
        _rev: doc._rev,
        type: 'category',
        name: doc.name,
        description: doc.description || '',
        icon: imageData,
        order: doc.order || 0,
        active: doc.active !== false,
        createdAt: doc.createdAt || Date.now(),
        updatedAt: doc.updatedAt || Date.now()
      };
    } catch (error) {
      console.error('Error getting category:', error);
      return null;
    }
  }

  /**
   * Create new category
   */
  async createCategory(
    name: string,
    description: string = '',
    imageBase64: string = ''
  ): Promise<Category | null> {
    try {
      const timestamp = new Date().toISOString();
      const base64String = imageBase64 ? imageBase64.substring(23) : '';

      const category: Category = {
        _id: 'CAT_' + timestamp,
        type: 'category',
        name,
        description,
        icon: '',
        order: this.categories().length,
        active: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        _attachments: base64String ? {
          'category.jpg': {
            content_type: 'image/jpeg',
            data: base64String
          }
        } : undefined
      };

      const saved = await this.db.put(category);
      
      this._categorySubject.next(saved);
      await this.loadCategories();
      
      return saved;
    } catch (error) {
      console.error('Error creating category:', error);
      return null;
    }
  }

  /**
   * Update category
   */
  async updateCategory(
    id: string,
    name: string,
    description: string = '',
    imageBase64: string = ''
  ): Promise<Category | null> {
    try {
      const existing = await this.db.get<any>(id);
      
      if (!existing) return null;

      const base64String = imageBase64 ? imageBase64.substring(23) : '';

      const updated: any = {
        ...existing,
        name,
        description,
        updatedAt: Date.now(),
        _attachments: base64String ? {
          'category.jpg': {
            content_type: 'image/jpeg',
            data: base64String
          }
        } : existing._attachments
      };

      const saved = await this.db.put(updated);
      
      this._categorySubject.next(saved);
      await this.loadCategories();
      
      return saved;
    } catch (error) {
      console.error('Error updating category:', error);
      return null;
    }
  }

  /**
   * Load departments
   */
  async loadDepartments(): Promise<Department[]> {
    try {
      const result = await this.db.find<Department>({
        type: 'department'
      });

      this.departments.set(result);
      return result;
    } catch (error) {
      console.error('Error loading departments:', error);
      return [];
    }
  }

  /**
   * Search products
   */
  searchProducts(searchTerm: string): Product[] {
    if (!searchTerm) {
      return this.products();
    }

    const term = searchTerm.toLowerCase();
    return this.products().filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.barcode.includes(term) ||
      p.description?.toLowerCase().includes(term)
    );
  }

  /**
   * Filter products by category
   */
  filterByCategory(categoryId: string): Product[] {
    if (!categoryId || categoryId === 'all') {
      return this.products();
    }

    return this.products().filter(p => p.category === categoryId);
  }

  /**
   * Get category name by ID
   */
  getCategoryName(categoryId: string): string {
    const category = this.categories().find(c => c._id === categoryId);
    return category?.name || 'Uncategorized';
  }

  /**
   * Check if product exists by name
   */
  async productExists(name: string): Promise<boolean> {
    const products = this.products();
    return products.some(p => p.name.toLowerCase() === name.toLowerCase());
  }

  /**
   * Check if category exists by name
   */
  async categoryExists(name: string): Promise<boolean> {
    const categories = this.categories();
    return categories.some(c => c.name.toLowerCase() === name.toLowerCase());
  }

  /**
   * Update product price
   */
  async updatePrice(id: string, price: number): Promise<boolean> {
    try {
      const product = await this.db.get<Product>(id);
      
      if (!product) return false;

      product.price = price;
      product.updatedAt = Date.now();
      
      await this.db.put(product);
      await this.loadProducts();
      
      return true;
    } catch (error) {
      console.error('Error updating price:', error);
      return false;
    }
  }

  /**
   * Update product quantity (for current location/warehouse)
   */
  async updateQuantity(id: string, quantity: number): Promise<boolean> {
    try {
      const product = await this.db.get<Product>(id);
      
      if (!product) return false;

      const inventory = product.inventory || [];
      const invIndex = inventory.findIndex(
        inv => inv.location === this.locationId && inv.warehouse === this.warehouseId
      );

      if (invIndex >= 0) {
        inventory[invIndex].qty = quantity;
      } else {
        inventory.push({
          location: this.locationId,
          warehouse: this.warehouseId,
          qty: quantity,
          cost: product.cost || 0
        });
      }

      product.inventory = inventory;
      product.updatedAt = Date.now();
      
      await this.db.put(product);
      await this.loadProducts();
      
      return true;
    } catch (error) {
      console.error('Error updating quantity:', error);
      return false;
    }
  }

  /**
   * Reduce quantity (for sales)
   */
  async reduceQuantity(id: string, amount: number): Promise<boolean> {
    try {
      const product = await this.db.get<Product>(id);
      
      if (!product) return false;

      const inventory = product.inventory || [];
      const invIndex = inventory.findIndex(
        inv => inv.location === this.locationId && inv.warehouse === this.warehouseId
      );

      if (invIndex >= 0) {
        inventory[invIndex].qty = Math.max(0, inventory[invIndex].qty - amount);
        product.inventory = inventory;
        product.updatedAt = Date.now();
        
        await this.db.put(product);
        await this.loadProducts();
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error reducing quantity:', error);
      return false;
    }
  }
}
