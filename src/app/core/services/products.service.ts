import { Injectable, inject, signal, computed } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StorageService } from './storage.service';
import { SqliteService, Product as SqlProduct, Category as SqlCategory, MenuRow } from './sqlite.service';
import { Product, Category, ItemInv, Menu } from '../../models';

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
  private sqlite = inject(SqliteService);
  private storage = inject(StorageService);

  // Reactive state with signals
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  menus = signal<Menu[]>([]);
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
    await this.sqlite.ensureInitialized();
    await this.loadProducts();
    await this.loadCategories();
    await this.loadMenus();
    await this.loadDepartments();
  }

  /**
   * Map SQLite product row to app Product model
   */
  private mapSqlProductToApp(row: SqlProduct): Product {
    const createdAt = row.created_at ? Date.parse(row.created_at) : Date.now();
    const updatedAt = row.updated_at ? Date.parse(row.updated_at) : createdAt;

    const quantity = row.stock_quantity ?? 0;
    const cost = row.cost ?? 0;

    const inventory: ItemInv[] = [{
      location: this.locationId,
      warehouse: this.warehouseId,
      qty: quantity,
      cost
    }];

    return {
      _id: row.id || '',
      type: 'product',
      name: row.name,
      barcode: row.barcode || '',
      category: row.category || '',
      price: row.price,
      cost,
      quantity,
      unit: 'unit',
      description: row.description || '',
      imageUrl: row.image_url || '',
      taxable: true,
      active: true,
      inventory,
      tags: [],
      favorite: false,
      createdAt,
      updatedAt,
      createdBy: 'system',
      updatedBy: 'system'
    };
  }

  /**
   * Map SQLite category row to app Category model
   */
  private mapSqlCategoryToApp(row: SqlCategory): Category {
    const createdAt = row.created_at ? Date.parse(row.created_at) : Date.now();
    const updatedAt = row.updated_at ? Date.parse(row.updated_at) : createdAt;

    return {
      _id: row.id || '',
      type: 'category',
      name: row.name,
      description: row.description || '',
      icon: row.icon || '',
      color: row.color || '',
      imageUrl: row.image_url || '',
      menuId: row.menu_id || undefined,
      parentId: row.parent_id || undefined,
      order: row.sort_order ?? 0,
      active: row.active !== 0,
      createdAt,
      updatedAt
    };
  }

  private mapSqlMenuToApp(row: MenuRow): Menu {
    const createdAt = row.created_at ? Date.parse(row.created_at) : Date.now();
    const updatedAt = row.updated_at ? Date.parse(row.updated_at) : createdAt;

    return {
      _id: row.id || '',
      type: 'menu',
      name: row.name,
      description: row.description || '',
      color: row.color || undefined,
      order: row.sort_order ?? 0,
      active: row.active !== 0,
      createdAt,
      updatedAt
    };
  }
  /**
   * Load all products from database
   */
  async loadProducts(): Promise<Product[]> {
    this.isLoading.set(true);
    try {
      await this.sqlite.ensureInitialized();
      const rows = await this.sqlite.getProducts();
      const mapped = rows.map(row => this.mapSqlProductToApp(row));
      this.products.set(mapped);
      return mapped;
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
      await this.sqlite.ensureInitialized();
      const row = await this.sqlite.getProductById(id);
      if (!row) return null;
      return this.mapSqlProductToApp(row);
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

      // Fallback to SQLite search
      await this.sqlite.ensureInitialized();
      const row = await this.sqlite.getProductByBarcode(barcode);
      return row ? this.mapSqlProductToApp(row) : null;
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
      await this.sqlite.ensureInitialized();

      const sqlProduct: SqlProduct = {
        name,
        barcode,
        category,
        price,
        cost,
        stock_quantity: qty,
        description: options.description || '',
        image_url: imageBase64 || ''
      };

      const id = await this.sqlite.addProduct(sqlProduct);
      await this.loadProducts();

      const row = await this.sqlite.getProductById(id);
      return row ? this.mapSqlProductToApp(row) : null;
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
      await this.sqlite.ensureInitialized();

      const sqlUpdates: Partial<SqlProduct> = {
        name: updates.name,
        barcode: updates.barcode,
        category: updates.category,
        price: updates.price,
        cost: updates.cost,
        description: updates.description,
        image_url: updates.imageUrl
      };

      if (qty !== undefined) {
        sqlUpdates.stock_quantity = qty;
      }

      await this.sqlite.updateProduct(id, sqlUpdates);
      await this.loadProducts();

      const row = await this.sqlite.getProductById(id);
      return row ? this.mapSqlProductToApp(row) : null;
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
      await this.sqlite.ensureInitialized();
      await this.sqlite.deleteProduct(id);
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
      await this.sqlite.ensureInitialized();
      const rows = await this.sqlite.getCategories();
      const mapped = rows.map(row => this.mapSqlCategoryToApp(row));
      this.categories.set(mapped);
      return mapped;
    } catch (error) {
      console.error('Error loading categories:', error);
      return [];
    }
  }

  /**
   * Load all menus from database
   */
  async loadMenus(): Promise<Menu[]> {
    try {
      await this.sqlite.ensureInitialized();
      const rows = await this.sqlite.getMenus();
      const mapped = rows.map((row: MenuRow) => this.mapSqlMenuToApp(row));
      this.menus.set(mapped);
      return mapped;
    } catch (error) {
      console.error('Error loading menus:', error);
      return [];
    }
  }

  /**
   * Get category by ID
   */
  async getCategory(id: string): Promise<Category | null> {
    try {
      await this.sqlite.ensureInitialized();
      const row = await this.sqlite.getCategoryById(id);
      if (!row) return null;
      return this.mapSqlCategoryToApp(row);
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
    imageBase64: string = '',
    parentId?: string,
    menuId?: string
  ): Promise<Category | null> {
    try {
      await this.sqlite.ensureInitialized();

      const sqlCategory: SqlCategory = {
        name,
        description,
        color: undefined,
        icon: undefined,
        image_url: imageBase64 || '',
        parent_id: parentId,
        menu_id: menuId
      };

      const id = await this.sqlite.addCategory(sqlCategory);
      await this.loadCategories();

      const row = await this.sqlite.getCategoryById(id);
      const mapped = row ? this.mapSqlCategoryToApp(row) : null;
      this._categorySubject.next(mapped);
      return mapped;
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
    imageBase64: string = '',
    parentId?: string,
    menuId?: string
  ): Promise<Category | null> {
    try {
      await this.sqlite.ensureInitialized();

      const sqlUpdates: Partial<SqlCategory> = {
        name,
        description,
        image_url: imageBase64 || undefined,
        parent_id: parentId,
        menu_id: menuId
      };

      await this.sqlite.updateCategory(id, sqlUpdates);
      await this.loadCategories();

      const row = await this.sqlite.getCategoryById(id);
      const mapped = row ? this.mapSqlCategoryToApp(row) : null;
      this._categorySubject.next(mapped);
      return mapped;
    } catch (error) {
      console.error('Error updating category:', error);
      return null;
    }
  }

  /**
   * Delete category
   */
  async deleteCategory(id: string): Promise<boolean> {
    try {
      await this.sqlite.ensureInitialized();
      await this.sqlite.deleteCategory(id);
      await this.loadCategories();
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  /**
   * Get subcategories of a category
   */
  getSubcategories(parentId: string): Category[] {
    return this.categories().filter(c => c.parentId === parentId);
  }

  /**
   * Get root categories (no parent)
   */
  getRootCategories(): Category[] {
    return this.categories().filter(c => !c.parentId);
  }

  /**
   * Get category hierarchy (parent and all ancestors)
   */
  getCategoryHierarchy(categoryId: string): Category[] {
    const hierarchy: Category[] = [];
    let currentId: string | undefined = categoryId;

    while (currentId) {
      const category = this.categories().find(c => c._id === currentId);
      if (category) {
        hierarchy.unshift(category);
        currentId = category.parentId;
      } else {
        break;
      }
    }

    return hierarchy;
  }

  /**
   * Update product categories (many-to-many)
   */
  async updateProductCategories(productId: string, categoryIds: string[]): Promise<boolean> {
    try {
      await this.sqlite.ensureInitialized();
      const primaryCategory = categoryIds[0] || '';
      await this.sqlite.updateProduct(productId, { category: primaryCategory });
      await this.loadProducts();
      return true;
    } catch (error) {
      console.error('Error updating product categories:', error);
      return false;
    }
  }

  /**
   * Load departments
   */
  async loadDepartments(): Promise<Department[]> {
    // Departments were previously stored in PouchDB; not yet migrated.
    this.departments.set([]);
    return [];
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
   * Filter products by category (supports multiple categories)
   */
  filterByCategory(categoryId: string): Product[] {
    if (!categoryId || categoryId === 'all') {
      return this.products();
    }

    return this.products().filter(p => {
      // Support both old single category and new multiple categories
      if (p.categories && p.categories.length > 0) {
        return p.categories.includes(categoryId);
      }
      return p.category === categoryId;
    });
  }

  /**
   * Filter products by multiple categories
   */
  filterByCategories(categoryIds: string[]): Product[] {
    if (!categoryIds || categoryIds.length === 0) {
      return this.products();
    }

    return this.products().filter(p => {
      // Support both old single category and new multiple categories
      if (p.categories && p.categories.length > 0) {
        return p.categories.some(catId => categoryIds.includes(catId));
      }
      return categoryIds.includes(p.category);
    });
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
      await this.sqlite.ensureInitialized();
      await this.sqlite.updateProduct(id, { price });
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
      await this.sqlite.ensureInitialized();
      await this.sqlite.updateProduct(id, { stock_quantity: quantity });
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
      await this.sqlite.ensureInitialized();
      const row = await this.sqlite.getProductById(id);
      if (!row) return false;
      const currentQty = row.stock_quantity ?? 0;
      const newQty = Math.max(0, currentQty - amount);
      await this.sqlite.updateProduct(id, { stock_quantity: newQty });
      await this.loadProducts();
      return true;
    } catch (error) {
      console.error('Error reducing quantity:', error);
      return false;
    }
  }
  /**
   * Menu helpers
   */
  async createMenu(name: string, description: string = '', color?: string): Promise<void> {
    try {
      await this.sqlite.ensureInitialized();

      const menu: MenuRow = {
        id: '',
        name,
        description,
        color,
        sort_order: undefined,
        active: 1
      };

      await this.sqlite.addMenu(menu);
      await this.loadMenus();
    } catch (error) {
      console.error('Error creating menu:', error);
      throw error;
    }
  }

  async updateMenu(id: string, updates: { name?: string; description?: string; color?: string; active?: number; sort_order?: number }): Promise<void> {
    try {
      await this.sqlite.ensureInitialized();
      await this.sqlite.updateMenu(id, updates);
      await this.loadMenus();
    } catch (error) {
      console.error('Error updating menu:', error);
      throw error;
    }
  }

  async deleteMenu(id: string): Promise<void> {
    try {
      await this.sqlite.ensureInitialized();
      await this.sqlite.deleteMenu(id);
      await this.loadMenus();
    } catch (error) {
      console.error('Error deleting menu:', error);
      throw error;
    }
  }
}
