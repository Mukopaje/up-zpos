import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

export interface Product {
  id?: string;
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  price: number;
  cost?: number;
  stock_quantity?: number;
  description?: string;
  image_url?: string;
  ai_generated_description?: string;
  ai_generated_image?: string;
  tenant_id?: string;
  version?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  credit_limit?: number;
  current_balance?: number;
  tenant_id?: string;
  version?: number;
  created_at?: string;
  updated_at?: string;
}

export interface UserRow {
  id?: string;
  tenant_id: string;
  username?: string;
  password_hash?: string;
  email: string;
  first_name: string;
  last_name: string;
  role_id: string;
  role?: string;
  permissions?: string; // JSON string
  pin?: string;
  pin_hash?: string;
  active?: number;
  allowed_terminals?: string; // JSON string array
  default_terminal?: string;
  pos_mode?: string;
  language?: string;
  avatar?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
}

export interface Sale {
  id?: string;
  order_number: string;
  customer_id?: string;
  total: number;
  subtotal: number;
  tax?: number;
  discount?: number;
  payment_method: string;
  payment_status: string;
  items: any; // JSON string
  tenant_id?: string;
  version?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id?: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  image_url?: string;
  menu_id?: string;
  parent_id?: string;
  sort_order?: number;
  active?: number;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MenuRow {
  id?: string;
  name: string;
  description?: string;
  color?: string;
  sort_order?: number;
  active?: number;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OutboxItem {
  id?: number;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id: string;
  data: string; // JSON string
  idempotency_key: string;
  created_at?: string;
  synced?: number;
}

export interface HeldTransactionRow {
  id: string;
  terminal_id?: string | null;
  held_by?: string | null;
  held_at?: number | null;
  data: string; // JSON string for the full held transaction payload
  created_at?: string;
}

export interface ModifierGroupRow {
  id: string;
  name: string;
  active?: number;
  data: string; // JSON string for full modifier group
  created_at?: string;
  updated_at?: string;
}

export interface InventoryRow {
  id?: string;
  product_id: string;
  quantity: number;
  action: string;
  reference?: string;
  notes?: string;
  created_at?: string;
  created_by: string;
}

export interface VoidRow {
  id?: string;
  sale_id?: string | null;
  table_id?: string | null;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
  reason?: string | null;
  created_by: string;
  created_at?: string;
}

export interface WorkperiodRow {
  id?: string;
  name?: string;
  start_time: string;
  end_time?: string | null;
  opened_by: string;
  closed_by?: string | null;
  opening_notes?: string | null;
  closing_notes?: string | null;
  open_terminal_id?: string | null;
  close_terminal_id?: string | null;
  status: 'open' | 'closed';
  created_at?: string;
}

export interface RoleRow {
  id?: string;
  name: string;
  description: string;
  level: number;
  permissions: string; // JSON string
  active?: number;
  can_access_terminals?: string;
  can_manage_users?: number;
  can_void_transactions?: number;
  can_give_discounts?: number;
  max_discount_percent?: number;
  requires_approval?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TerminalRow {
  id?: string;
  name: string;
  code: string;
  terminal_type: string;
  location: string;
  pos_mode: string;
  hospitality_config?: string; // JSON string
  printer_address?: string;
  active?: number;
  online?: number;
  last_ping?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WaiterRow {
  id?: string;
  user_id: string;
  name: string;
  code?: string;
  section?: string;
  active?: number;
  current_tables?: string; // JSON string array
  stats?: string; // JSON string
  created_at?: string;
  updated_at?: string;
}

export interface TableRow {
  id?: string;
  number: string;
  name?: string;
  capacity: number;
  section?: string;
  floor?: number;
  status: string;
  shape?: string;
  position?: string; // JSON string
  session_id?: string;
  guest_name?: string;
  guest_count?: number;
  waiter_id?: string;
  waiter_name?: string;
  start_time?: string;
  order_id?: string;
  items?: string; // JSON string
  amount?: number;
  notes?: string;
  terminal_id: string;
  active?: number;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SqliteService {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private platform: string;
  // Use a simple logical name without extension so the
  // Capacitor/jeep-sqlite web layer can consistently find
  // the active connection when calling saveToStore.
  private dbName = 'zpos';

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    this.platform = Capacitor.getPlatform();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    console.log('Starting SQLite initialization on platform:', this.platform);
    
    try {
      // On web, initialize jeep-sqlite so we can use the same
      // SQLite schema in the browser as on native devices.
      if (this.platform === 'web') {
        console.log('Web platform detected - initializing jeep-sqlite web store');
        await this.initWebStore();
      }

      console.log('Creating database connection...');
      
      // Try to create connection with retry for Android Keystore issues
      let retries = 3;
      let lastError: any;
      
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          // On Android, check if connection already exists and close it first
          if (this.platform === 'android' && attempt > 1) {
            try {
              const isConnection = await this.sqlite.isConnection(this.dbName, false);
              if (isConnection.result) {
                console.log(`Closing existing connection before retry ${attempt}`);
                await this.sqlite.closeConnection(this.dbName, false);
              }
            } catch (e) {
              console.log('Error checking/closing connection:', e);
            }
          }
          
          // Create/open database
          this.db = await this.sqlite.createConnection(
            this.dbName,
            false, // encrypted
            'no-encryption',
            1, // version
            false // readonly
          );
          
          console.log('Database connection created successfully');
          break; // Success, exit retry loop
          
        } catch (error: any) {
          lastError = error;
          console.error(`Connection attempt ${attempt} failed:`, error);
          
          // If it's a Keystore error and we have retries left, wait and retry
          if (error?.message?.includes('Keystore') && attempt < retries) {
            console.log(`Waiting before retry ${attempt + 1}...`);
            await new Promise(resolve => setTimeout(resolve, 500 * attempt));
            continue;
          }
          
          // If it's not a Keystore error or we're out of retries, throw
          throw error;
        }
      }
      
      if (!this.db) {
        throw lastError || new Error('Failed to create database connection');
      }

      console.log('Opening database...');
      await this.db.open();
      
      console.log('Creating tables...');
      // Create tables
      await this.createTables();
      
      this.isInitialized = true;
      console.log('SQLite database initialized successfully');
    } catch (error) {
      console.error('Error initializing SQLite database:', error);
      // Reset state so callers can detect failure and optionally retry
      this.db = null;
      this.isInitialized = false;
      this.initPromise = null;
      throw error;
    }
  }

  private async initWebStore(): Promise<void> {
    try {
      console.log('Checking for jeep-sqlite element...');
      
      // Wait for jeep-sqlite element to be defined with timeout
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('jeep-sqlite load timeout')), 5000)
      );
      
      await Promise.race([
        customElements.whenDefined('jeep-sqlite'),
        timeout
      ]);
      
      console.log('jeep-sqlite element is defined');
      
      // For web platform, initialize the web store
      await this.sqlite.initWebStore();
      console.log('Web store initialized successfully');
    } catch (error) {
      console.error('Error initializing web store:', error);
      console.log('Continuing without SQLite web support');
      // Continue anyway - the app will work with just PouchDB
    }
  }

  async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  // On web, changes to the in-memory SQLite database must be
  // explicitly persisted to the IndexedDB-backed store using
  // saveToStore. On native platforms this is a no-op.
  private async saveWebStore(): Promise<void> {
    if (this.platform !== 'web') {
      return;
    }

    try {
      await this.sqlite.saveToStore(this.dbName);
    } catch (error) {
      console.error('Error saving SQLite web store:', error);
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const createProductsTable = `
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT,
        barcode TEXT,
        category TEXT,
        price REAL NOT NULL,
        cost REAL,
        stock_quantity INTEGER DEFAULT 0,
        description TEXT,
        image_url TEXT,
        ai_generated_description TEXT,
        ai_generated_image TEXT,
        tenant_id TEXT,
        version INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createCustomersTable = `
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        credit_limit REAL DEFAULT 0,
        current_balance REAL DEFAULT 0,
        tenant_id TEXT,
        version INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        username TEXT,
        password_hash TEXT,
        email TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        role_id TEXT NOT NULL,
        role TEXT,
        permissions TEXT,
        pin TEXT,
        pin_hash TEXT,
        active INTEGER DEFAULT 1,
        allowed_terminals TEXT,
        default_terminal TEXT,
        pos_mode TEXT,
        language TEXT,
        avatar TEXT,
        phone TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_login TEXT
      );
    `;

    const createSalesTable = `
      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        order_number TEXT NOT NULL,
        customer_id TEXT,
        total REAL NOT NULL,
        subtotal REAL NOT NULL,
        tax REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        payment_method TEXT NOT NULL,
        payment_status TEXT NOT NULL,
        items TEXT NOT NULL,
        tenant_id TEXT,
        version INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createCategoriesTable = `
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        color TEXT,
        icon TEXT,
        image_url TEXT,
        menu_id TEXT,
        parent_id TEXT,
        sort_order INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        tenant_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createMenusTable = `
      CREATE TABLE IF NOT EXISTS menus (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        color TEXT,
        sort_order INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        tenant_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createOutboxTable = `
      CREATE TABLE IF NOT EXISTS outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        operation TEXT NOT NULL,
        record_id TEXT NOT NULL,
        data TEXT NOT NULL,
        idempotency_key TEXT UNIQUE NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced INTEGER DEFAULT 0
      );
    `;

    const createInventoryTable = `
      CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        quantity REAL NOT NULL,
        action TEXT NOT NULL,
        reference TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT NOT NULL
      );
    `;

    const createVoidsTable = `
      CREATE TABLE IF NOT EXISTS voids (
        id TEXT PRIMARY KEY,
        sale_id TEXT,
        table_id TEXT,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        quantity REAL NOT NULL,
        price REAL NOT NULL,
        total REAL NOT NULL,
        reason TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createWorkperiodsTable = `
      CREATE TABLE IF NOT EXISTS workperiods (
        id TEXT PRIMARY KEY,
        name TEXT,
        start_time TEXT NOT NULL,
        end_time TEXT,
        opened_by TEXT NOT NULL,
        closed_by TEXT,
        opening_notes TEXT,
        closing_notes TEXT,
        open_terminal_id TEXT,
        close_terminal_id TEXT,
        status TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createHeldTransactionsTable = `
      CREATE TABLE IF NOT EXISTS held_transactions (
        id TEXT PRIMARY KEY,
        terminal_id TEXT,
        held_by TEXT,
        held_at INTEGER,
        data TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createModifierGroupsTable = `
      CREATE TABLE IF NOT EXISTS modifier_groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        data TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createRolesTable = `
      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        level INTEGER NOT NULL,
        permissions TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        can_access_terminals TEXT,
        can_manage_users INTEGER DEFAULT 0,
        can_void_transactions INTEGER DEFAULT 0,
        can_give_discounts INTEGER DEFAULT 0,
        max_discount_percent INTEGER DEFAULT 0,
        requires_approval INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createTerminalsTable = `
      CREATE TABLE IF NOT EXISTS terminals (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        terminal_type TEXT NOT NULL,
        location TEXT NOT NULL,
        pos_mode TEXT NOT NULL,
        hospitality_config TEXT,
        printer_address TEXT,
        active INTEGER DEFAULT 1,
        online INTEGER DEFAULT 0,
        last_ping TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createWaitersTable = `
      CREATE TABLE IF NOT EXISTS waiters (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        code TEXT,
        section TEXT,
        active INTEGER DEFAULT 1,
        current_tables TEXT,
        stats TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createTablesTable = `
      CREATE TABLE IF NOT EXISTS tables (
        id TEXT PRIMARY KEY,
        number TEXT NOT NULL,
        name TEXT,
        capacity INTEGER NOT NULL,
        section TEXT,
        floor INTEGER,
        status TEXT NOT NULL,
        shape TEXT,
        position TEXT,
        session_id TEXT,
        guest_name TEXT,
        guest_count INTEGER,
        waiter_id TEXT,
        waiter_name TEXT,
        start_time TEXT,
        order_id TEXT,
        items TEXT,
        amount REAL DEFAULT 0,
        notes TEXT,
        terminal_id TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_sales_order_number ON sales(order_number);
      CREATE INDEX IF NOT EXISTS idx_outbox_synced ON outbox(synced);
      CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
      CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(active);
      CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
      CREATE INDEX IF NOT EXISTS idx_menus_active ON menus(active);
      CREATE INDEX IF NOT EXISTS idx_roles_level ON roles(level);
      CREATE INDEX IF NOT EXISTS idx_terminals_location ON terminals(location);
      CREATE INDEX IF NOT EXISTS idx_tables_terminal ON tables(terminal_id);
      CREATE INDEX IF NOT EXISTS idx_waiters_section ON waiters(section);
      CREATE INDEX IF NOT EXISTS idx_held_terminal ON held_transactions(terminal_id);
      CREATE INDEX IF NOT EXISTS idx_modifier_groups_name ON modifier_groups(name);
      CREATE INDEX IF NOT EXISTS idx_voids_created_at ON voids(created_at);
      CREATE INDEX IF NOT EXISTS idx_workperiods_status ON workperiods(status);
      CREATE INDEX IF NOT EXISTS idx_workperiods_start_time ON workperiods(start_time);
    `;

    try {
      await this.db.execute(createProductsTable);
      await this.db.execute(createCustomersTable);
      await this.db.execute(createSalesTable);
      await this.db.execute(createUsersTable);
      await this.db.execute(createCategoriesTable);
      await this.db.execute(createMenusTable);
      await this.db.execute(createOutboxTable);
      await this.db.execute(createInventoryTable);
      await this.db.execute(createVoidsTable);
      await this.db.execute(createHeldTransactionsTable);
      await this.db.execute(createModifierGroupsTable);
      await this.db.execute(createRolesTable);
      await this.db.execute(createTerminalsTable);
      await this.db.execute(createWaitersTable);
      await this.db.execute(createTablesTable);
      await this.db.execute(createWorkperiodsTable);

      // Best-effort migration: ensure parent_id and menu_id columns exist on older databases
      // This must run BEFORE we create indexes that reference these columns.
      try {
        const parentExists = await this.columnExists('categories', 'parent_id');
        if (!parentExists) {
          await this.db.execute('ALTER TABLE categories ADD COLUMN parent_id TEXT');
        }
      } catch (e) {
        // Ignore errors if the column already exists
      }

      try {
        const menuExists = await this.columnExists('categories', 'menu_id');
        if (!menuExists) {
          await this.db.execute('ALTER TABLE categories ADD COLUMN menu_id TEXT');
        }
      } catch (e) {
        // Ignore errors if the column already exists
      }

      // Now that the columns are guaranteed to exist, create indexes including parent_id/menu_id
      await this.db.execute(createIndexes);

      console.log('Database tables created successfully');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  private async columnExists(table: string, column: string): Promise<boolean> {
    if (!this.db) {
      return false;
    }

    try {
      const result = await this.db.query(`PRAGMA table_info(${table})`);
      const rows: any[] = result.values || [];
      return rows.some(row => row.name === column);
    } catch (error) {
      console.warn(`Error checking for column ${column} on table ${table}:`, error);
      return false;
    }
  }

  private async seedDefaultCategories(): Promise<void> {
    if (!this.db) return;

    try {
      // Check if categories already exist
      const result = await this.db.query('SELECT COUNT(*) as count FROM categories');
      const count = result.values?.[0]?.count || 0;

      if (count === 0) {
        // Seed default categories
        const defaultCategories = [
          { name: 'Food & Beverages', icon: 'fast-food-outline', color: '#FF6B6B' },
          { name: 'Electronics', icon: 'phone-portrait-outline', color: '#4ECDC4' },
          { name: 'Clothing & Apparel', icon: 'shirt-outline', color: '#45B7D1' },
          { name: 'Home & Kitchen', icon: 'home-outline', color: '#FFA07A' },
          { name: 'Beauty & Personal Care', icon: 'color-palette-outline', color: '#DDA0DD' },
          { name: 'Hardware & Tools', icon: 'hammer-outline', color: '#708090' },
          { name: 'Office Supplies', icon: 'briefcase-outline', color: '#87CEEB' },
          { name: 'Sports & Outdoors', icon: 'football-outline', color: '#32CD32' },
          { name: 'Toys & Games', icon: 'game-controller-outline', color: '#FF69B4' },
          { name: 'Health & Wellness', icon: 'fitness-outline', color: '#98FB98' },
          { name: 'Other', icon: 'apps-outline', color: '#D3D3D3' },
        ];

        for (let i = 0; i < defaultCategories.length; i++) {
          const category = defaultCategories[i];
          const id = this.generateUUID();
          await this.db.run(
            `INSERT INTO categories (id, name, icon, color, sort_order, active) VALUES (?, ?, ?, ?, ?, 1)`,
            [id, category.name, category.icon, category.color, i]
          );
        }

        console.log('Default categories seeded');
      }
    } catch (error) {
      console.error('Error seeding default categories:', error);
    }
  }

  // ========== PRODUCT OPERATIONS ==========

  async getProducts(search?: string): Promise<Product[]> {
    if (!this.db) {
      console.log('SQLite not available - returning empty products');
      return [];
    }

    try {
      let query = 'SELECT * FROM products';
      const params: any[] = [];

      if (search && search.trim()) {
        query += ` WHERE name LIKE ? OR sku LIKE ? OR barcode LIKE ?`;
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam);
      }

      query += ' ORDER BY name ASC';

      const result = await this.db.query(query, params);
      return result.values || [];
    } catch (error) {
      console.error('Error getting products:', error);
      throw error;
    }
  }

  async getProductById(id: string): Promise<Product | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.query('SELECT * FROM products WHERE id = ?', [id]);
      return result.values && result.values.length > 0 ? result.values[0] : null;
    } catch (error) {
      console.error('Error getting product by ID:', error);
      throw error;
    }
  }

  async getProductByBarcode(barcode: string): Promise<Product | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.query('SELECT * FROM products WHERE barcode = ?', [barcode]);
      return result.values && result.values.length > 0 ? result.values[0] : null;
    } catch (error) {
      console.error('Error getting product by barcode:', error);
      throw error;
    }
  }

  async addProduct(product: Product): Promise<string> {
    if (!this.db) {
      // SQLite not available on web, PouchDB will be used instead
      return product.id || this.generateUUID();
    }

    try {
      const id = product.id || this.generateUUID();
      const now = new Date().toISOString();

      const query = `
        INSERT INTO products (
          id, name, sku, barcode, category, price, cost, stock_quantity,
          description, image_url, ai_generated_description, ai_generated_image,
          tenant_id, version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        id,
        product.name,
        product.sku || null,
        product.barcode || null,
        product.category || null,
        product.price,
        product.cost || null,
        product.stock_quantity || 0,
        product.description || null,
        product.image_url || null,
        product.ai_generated_description || null,
        product.ai_generated_image || null,
        product.tenant_id || null,
        product.version || 1,
        now,
        now
      ];

      await this.db.run(query, params);

      // Add to outbox for sync
      await this.addToOutbox('products', 'INSERT', id, { ...product, id });

      return id;
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  }

  async updateProduct(id: string, product: Partial<Product>): Promise<void> {
    if (!this.db) {
      // SQLite not available on web, PouchDB will be used instead
      return;
    }

    try {
      const now = new Date().toISOString();
      const currentProduct = await this.getProductById(id);
      
      if (!currentProduct) {
        throw new Error('Product not found');
      }

      const query = `
        UPDATE products SET
          name = ?,
          sku = ?,
          barcode = ?,
          category = ?,
          price = ?,
          cost = ?,
          stock_quantity = ?,
          description = ?,
          image_url = ?,
          ai_generated_description = ?,
          ai_generated_image = ?,
          version = version + 1,
          updated_at = ?
        WHERE id = ?
      `;

      const params = [
        product.name ?? currentProduct.name,
        product.sku ?? currentProduct.sku,
        product.barcode ?? currentProduct.barcode,
        product.category ?? currentProduct.category,
        product.price ?? currentProduct.price,
        product.cost ?? currentProduct.cost,
        product.stock_quantity ?? currentProduct.stock_quantity,
        product.description ?? currentProduct.description,
        product.image_url ?? currentProduct.image_url,
        product.ai_generated_description ?? currentProduct.ai_generated_description,
        product.ai_generated_image ?? currentProduct.ai_generated_image,
        now,
        id
      ];

      await this.db.run(query, params);

      // Add to outbox for sync
      const updatedProduct = await this.getProductById(id);
      await this.addToOutbox('products', 'UPDATE', id, updatedProduct);
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  async deleteProduct(id: string): Promise<void> {
    if (!this.db) {
      // SQLite not available on web, PouchDB will be used instead
      return;
    }

    try {
      await this.db.run('DELETE FROM products WHERE id = ?', [id]);

      // Add to outbox for sync
      await this.addToOutbox('products', 'DELETE', id, { id });
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  // ========== CUSTOMER OPERATIONS ==========

  async getCustomers(search?: string): Promise<Customer[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      let query = 'SELECT * FROM customers';
      const params: any[] = [];

      if (search && search.trim()) {
        query += ` WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?`;
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam);
      }

      query += ' ORDER BY name ASC';

      const result = await this.db.query(query, params);
      return result.values || [];
    } catch (error) {
      console.error('Error getting customers:', error);
      throw error;
    }
  }

  async getCustomerById(id: string): Promise<Customer | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.query('SELECT * FROM customers WHERE id = ?', [id]);
      return result.values && result.values.length > 0 ? result.values[0] : null;
    } catch (error) {
      console.error('Error getting customer by ID:', error);
      throw error;
    }
  }

  async addCustomer(customer: Customer): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const id = customer.id || this.generateUUID();
      const now = new Date().toISOString();

      const query = `
        INSERT INTO customers (
          id, name, email, phone, address, credit_limit, current_balance,
          tenant_id, version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        id,
        customer.name,
        customer.email || null,
        customer.phone || null,
        customer.address || null,
        customer.credit_limit || 0,
        customer.current_balance || 0,
        customer.tenant_id || null,
        customer.version || 1,
        now,
        now
      ];

      await this.db.run(query, params);

      // Add to outbox for sync
      await this.addToOutbox('customers', 'INSERT', id, { ...customer, id });

      return id;
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  }

  async updateCustomer(id: string, customer: Partial<Customer>): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const now = new Date().toISOString();
      const currentCustomer = await this.getCustomerById(id);

      if (!currentCustomer) {
        throw new Error('Customer not found');
      }

      const query = `
        UPDATE customers SET
          name = ?,
          email = ?,
          phone = ?,
          address = ?,
          credit_limit = ?,
          current_balance = ?,
          version = version + 1,
          updated_at = ?
        WHERE id = ?
      `;

      const params = [
        customer.name ?? currentCustomer.name,
        customer.email ?? currentCustomer.email,
        customer.phone ?? currentCustomer.phone,
        customer.address ?? currentCustomer.address,
        customer.credit_limit ?? currentCustomer.credit_limit ?? 0,
        customer.current_balance ?? currentCustomer.current_balance ?? 0,
        now,
        id
      ];

      await this.db.run(query, params);

      const updatedCustomer = await this.getCustomerById(id);
      await this.addToOutbox('customers', 'UPDATE', id, updatedCustomer);
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  }

  async deleteCustomer(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.run('DELETE FROM customers WHERE id = ?', [id]);
      await this.addToOutbox('customers', 'DELETE', id, { id });
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  }

  // ========== SALE OPERATIONS ==========

  async addSale(sale: Sale): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const id = sale.id || this.generateUUID();
      const now = new Date().toISOString();

      const query = `
        INSERT INTO sales (
          id, order_number, customer_id, total, subtotal, tax, discount,
          payment_method, payment_status, items, tenant_id, version,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        id,
        sale.order_number,
        sale.customer_id || null,
        sale.total,
        sale.subtotal,
        sale.tax || 0,
        sale.discount || 0,
        sale.payment_method,
        sale.payment_status,
        JSON.stringify(sale.items),
        sale.tenant_id || null,
        sale.version || 1,
        now,
        now
      ];

      await this.db.run(query, params);

      // Add to outbox for sync
      await this.addToOutbox('sales', 'INSERT', id, { ...sale, id, items: JSON.stringify(sale.items) });

      return id;
    } catch (error) {
      console.error('Error adding sale:', error);
      throw error;
    }
  }

  /**
   * Upsert a sale that originated from the cloud.
   * This writes into the local sales table WITHOUT adding
   * anything to the outbox, so we don't re-sync the same
   * records back to the server.
   */
  async upsertRemoteSale(sale: Sale): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const id = sale.id || this.generateUUID();
      const existing = await this.getSaleById(id);

      // If we already have this sale and versions are equal or newer, skip
      if (existing && typeof existing.version === 'number' && typeof sale.version === 'number') {
        if (existing.version >= sale.version) {
          return;
        }
      }

      const createdAt = sale.created_at || new Date().toISOString();
      const updatedAt = sale.updated_at || createdAt;
      const version = sale.version || (existing?.version ?? 1);

      if (!existing) {
        const insertQuery = `
          INSERT INTO sales (
            id, order_number, customer_id, total, subtotal, tax, discount,
            payment_method, payment_status, items, tenant_id, version,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const insertParams = [
          id,
          sale.order_number,
          sale.customer_id || null,
          sale.total,
          sale.subtotal,
          sale.tax || 0,
          sale.discount || 0,
          sale.payment_method,
          sale.payment_status,
          JSON.stringify(sale.items),
          sale.tenant_id || null,
          version,
          createdAt,
          updatedAt
        ];

        await this.db.run(insertQuery, insertParams);
      } else {
        const updateQuery = `
          UPDATE sales SET
            order_number = ?,
            customer_id = ?,
            total = ?,
            subtotal = ?,
            tax = ?,
            discount = ?,
            payment_method = ?,
            payment_status = ?,
            items = ?,
            tenant_id = ?,
            version = ?,
            created_at = COALESCE(created_at, ?),
            updated_at = ?
          WHERE id = ?
        `;

        const updateParams = [
          sale.order_number,
          sale.customer_id || null,
          sale.total,
          sale.subtotal,
          sale.tax || 0,
          sale.discount || 0,
          sale.payment_method,
          sale.payment_status,
          JSON.stringify(sale.items),
          sale.tenant_id || existing.tenant_id || null,
          version,
          createdAt,
          updatedAt,
          id
        ];

        await this.db.run(updateQuery, updateParams);
      }
    } catch (error) {
      console.error('Error upserting remote sale:', error);
      throw error;
    }
  }

  async getSaleById(id: string): Promise<Sale | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.query('SELECT * FROM sales WHERE id = ?', [id]);
      if (!result.values || result.values.length === 0) {
        return null;
      }
      const sale: any = result.values[0];
      return {
        ...sale,
        items: typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items
      };
    } catch (error) {
      console.error('Error getting sale by ID:', error);
      throw error;
    }
  }

  async getSales(limit: number = 50): Promise<Sale[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const query = 'SELECT * FROM sales ORDER BY created_at DESC LIMIT ?';
      const result = await this.db.query(query, [limit]);
      
      // Parse items JSON string back to object
      const sales = (result.values || []).map((sale: any) => ({
        ...sale,
        items: typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items
      }));
      
      return sales;
    } catch (error) {
      console.error('Error getting sales:', error);
      throw error;
    }
  }

  /**
   * Prune old sales records from the local device to save space.
   * Only deletes records older than the configured retention window
   * that do NOT have pending outbox entries (i.e. already synced).
   */
  async pruneOldSales(retentionDays: number): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    if (!retentionDays || retentionDays <= 0) {
      return;
    }

    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - retentionDays);
      const cutoffIso = cutoff.toISOString();

      const query = `
        DELETE FROM sales
        WHERE created_at < ?
          AND id NOT IN (
            SELECT record_id FROM outbox
            WHERE table_name = 'sales' AND synced = 0
          )
      `;

      await this.db.run(query, [cutoffIso]);
    } catch (error) {
      console.error('Error pruning old sales:', error);
      throw error;
    }
  }

  async updateSale(id: string, sale: Partial<Sale>): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const now = new Date().toISOString();
      const currentSale = await this.getSaleById(id);

      if (!currentSale) {
        throw new Error('Sale not found');
      }

      const merged: Sale = {
        ...currentSale,
        ...sale
      };

      const query = `
        UPDATE sales SET
          order_number = ?,
          customer_id = ?,
          total = ?,
          subtotal = ?,
          tax = ?,
          discount = ?,
          payment_method = ?,
          payment_status = ?,
          items = ?,
          version = version + 1,
          updated_at = ?
        WHERE id = ?
      `;

      const params = [
        merged.order_number,
        merged.customer_id || null,
        merged.total,
        merged.subtotal,
        merged.tax || 0,
        merged.discount || 0,
        merged.payment_method,
        merged.payment_status,
        JSON.stringify(merged.items),
        now,
        id
      ];

      await this.db.run(query, params);

      const updatedSale = await this.getSaleById(id);
      await this.addToOutbox('sales', 'UPDATE', id, updatedSale);
    } catch (error) {
      console.error('Error updating sale:', error);
      throw error;
    }
  }

  // ========== CATEGORY OPERATIONS ==========

  async getCategories(activeOnly: boolean = false): Promise<Category[]> {
    if (!this.db) {
      // SQLite not available on web, PouchDB will be used instead
      return [];
    }

    try {
      let query = 'SELECT * FROM categories';
      const params: any[] = [];

      if (activeOnly) {
        query += ' WHERE active = 1';
      }

      query += ' ORDER BY sort_order ASC, name ASC';

      const result = await this.db.query(query, params);
      return result.values || [];
    } catch (error) {
      console.error('Error getting categories:', error);
      throw error;
    }
  }

  async getCategoryById(id: string): Promise<Category | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.query('SELECT * FROM categories WHERE id = ?', [id]);
      return result.values && result.values.length > 0 ? result.values[0] : null;
    } catch (error) {
      console.error('Error getting category by ID:', error);
      throw error;
    }
  }

  async getMenus(): Promise<MenuRow[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.query('SELECT * FROM menus ORDER BY sort_order, name');
      return result.values || [];
    } catch (error) {
      console.error('Error getting menus:', error);
      throw error;
    }
  }

  async addCategory(category: Category): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const id = category.id || this.generateUUID();
      const now = new Date().toISOString();

      // Get max sort_order
      const maxOrderResult = await this.db.query('SELECT MAX(sort_order) as max_order FROM categories');
      const maxOrder = maxOrderResult.values?.[0]?.max_order || 0;

      const query = `
        INSERT INTO categories (
          id, name, description, color, icon, image_url, menu_id, parent_id, sort_order, active, tenant_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        id,
        category.name,
        category.description || null,
        category.color || null,
        category.icon || null,
        category.image_url || null,
        category.menu_id || null,
        category.parent_id || null,
        category.sort_order !== undefined ? category.sort_order : maxOrder + 1,
        category.active !== undefined ? category.active : 1,
        category.tenant_id || null,
        now,
        now
      ];

      await this.db.run(query, params);

      // Add to outbox for sync
      await this.addToOutbox('categories', 'INSERT', id, { ...category, id });

      return id;
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  }

  async updateCategory(id: string, category: Partial<Category>): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const now = new Date().toISOString();
      const currentCategory = await this.getCategoryById(id);
      
      if (!currentCategory) {
        throw new Error('Category not found');
      }

      const query = `
        UPDATE categories SET
          name = ?,
          description = ?,
          color = ?,
          icon = ?,
          image_url = ?,
          menu_id = ?,
          parent_id = ?,
          sort_order = ?,
          active = ?,
          updated_at = ?
        WHERE id = ?
      `;

      const params = [
        category.name ?? currentCategory.name,
        category.description ?? currentCategory.description,
        category.color ?? currentCategory.color,
        category.icon ?? currentCategory.icon,
        category.image_url ?? currentCategory.image_url,
        category.menu_id ?? currentCategory.menu_id ?? null,
        category.parent_id ?? currentCategory.parent_id ?? null,
        category.sort_order ?? currentCategory.sort_order,
        category.active ?? currentCategory.active,
        now,
        id
      ];

      await this.db.run(query, params);

      // Add to outbox for sync
      const updatedCategory = await this.getCategoryById(id);
      await this.addToOutbox('categories', 'UPDATE', id, updatedCategory);
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  async deleteCategory(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Check if category is in use
      const productsUsingCategory = await this.db.query(
        'SELECT COUNT(*) as count FROM products WHERE category = (SELECT name FROM categories WHERE id = ?)',
        [id]
      );
      
      const count = productsUsingCategory.values?.[0]?.count || 0;
      
      if (count > 0) {
        throw new Error(`Cannot delete category. ${count} product(s) are using this category.`);
      }

      await this.db.run('DELETE FROM categories WHERE id = ?', [id]);

      // Add to outbox for sync
      await this.addToOutbox('categories', 'DELETE', id, { id });
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  async reorderCategories(categoryIds: string[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      for (let i = 0; i < categoryIds.length; i++) {
        await this.db.run(
          'UPDATE categories SET sort_order = ? WHERE id = ?',
          [i, categoryIds[i]]
        );
      }
    } catch (error) {
      console.error('Error reordering categories:', error);
      throw error;
    }
  }

  // ========== MENU OPERATIONS ==========

  async addMenu(menu: MenuRow): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const id = menu.id || this.generateUUID();
      const now = new Date().toISOString();

      const maxOrderResult = await this.db.query('SELECT MAX(sort_order) as max_order FROM menus');
      const maxOrder = maxOrderResult.values?.[0]?.max_order || 0;

      const query = `
        INSERT INTO menus (
          id, name, description, color, sort_order, active, tenant_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        id,
        menu.name,
        menu.description || null,
        menu.color || null,
        menu.sort_order !== undefined ? menu.sort_order : maxOrder + 1,
        menu.active !== undefined ? menu.active : 1,
        menu.tenant_id || null,
        now,
        now
      ];

      await this.db.run(query, params);

      await this.addToOutbox('menus', 'INSERT', id, { ...menu, id });
      return id;
    } catch (error) {
      console.error('Error adding menu:', error);
      throw error;
    }
  }

  async updateMenu(id: string, menu: Partial<MenuRow>): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const now = new Date().toISOString();
      const currentResult = await this.db.query('SELECT * FROM menus WHERE id = ?', [id]);
      const current = currentResult.values && currentResult.values[0] as MenuRow | undefined;

      if (!current) {
        throw new Error('Menu not found');
      }

      const query = `
        UPDATE menus SET
          name = ?,
          description = ?,
          color = ?,
          sort_order = ?,
          active = ?,
          updated_at = ?
        WHERE id = ?
      `;

      const params = [
        menu.name ?? current.name,
        menu.description ?? current.description,
        menu.color ?? current.color,
        menu.sort_order ?? current.sort_order,
        menu.active ?? current.active ?? 1,
        now,
        id
      ];

      await this.db.run(query, params);

      const updatedResult = await this.db.query('SELECT * FROM menus WHERE id = ?', [id]);
      const updated = updatedResult.values && updatedResult.values[0];
      await this.addToOutbox('menus', 'UPDATE', id, updated);
    } catch (error) {
      console.error('Error updating menu:', error);
      throw error;
    }
  }

  async deleteMenu(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const categoriesUsingMenu = await this.db.query(
        'SELECT COUNT(*) as count FROM categories WHERE menu_id = ?',
        [id]
      );

      const count = categoriesUsingMenu.values?.[0]?.count || 0;

      if (count > 0) {
        throw new Error(`Cannot delete menu. ${count} categor(y/ies) are assigned to this menu.`);
      }

      await this.db.run('DELETE FROM menus WHERE id = ?', [id]);

      await this.addToOutbox('menus', 'DELETE', id, { id });
    } catch (error) {
      console.error('Error deleting menu:', error);
      throw error;
    }
  }

  async clearAllProductsAndCategories(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.execute('DELETE FROM products');
      await this.db.execute('DELETE FROM categories');
      console.log('All products and categories cleared from local SQLite');
    } catch (error) {
      console.error('Error clearing products and categories:', error);
      throw error;
    }
  }

  // ========== USER OPERATIONS ==========

  async getUsers(): Promise<UserRow[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const query = 'SELECT * FROM users ORDER BY first_name ASC, last_name ASC';
      const result = await this.db.query(query);
      return result.values || [];
    } catch (error) {
      console.error('Error getting users:', error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<UserRow | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.query('SELECT * FROM users WHERE id = ?', [id]);
      return result.values && result.values.length > 0 ? (result.values[0] as UserRow) : null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<UserRow | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.query('SELECT * FROM users WHERE username = ?', [username]);
      return result.values && result.values.length > 0 ? (result.values[0] as UserRow) : null;
    } catch (error) {
      console.error('Error getting user by username:', error);
      throw error;
    }
  }

  async addUser(user: UserRow): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const id = user.id || this.generateUUID();
      const now = new Date().toISOString();

      const query = `
        INSERT INTO users (
          id, tenant_id, username, password_hash, email, first_name, last_name,
          role_id, role, permissions, pin, pin_hash, active, allowed_terminals,
          default_terminal, pos_mode, language, avatar, phone, created_at, updated_at, last_login
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        id,
        user.tenant_id || null,
        user.username || null,
        user.password_hash || null,
        user.email,
        user.first_name,
        user.last_name,
        user.role_id,
        user.role || null,
        user.permissions || null,
        user.pin || null,
        user.pin_hash || null,
        user.active ?? 1,
        user.allowed_terminals || null,
        user.default_terminal || null,
        user.pos_mode || null,
        user.language || null,
        user.avatar || null,
        user.phone || null,
        user.created_at || now,
        user.updated_at || now,
        user.last_login || null
      ];

      await this.db.run(query, params);

      await this.addToOutbox('users', 'INSERT', id, { ...user, id });

      return id;
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  }

  async updateUser(id: string, user: Partial<UserRow>): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const now = new Date().toISOString();
      const current = await this.getUserById(id);

      if (!current) {
        throw new Error('User not found');
      }

      const query = `
        UPDATE users SET
          tenant_id = ?,
          username = ?,
          password_hash = ?,
          email = ?,
          first_name = ?,
          last_name = ?,
          role_id = ?,
          role = ?,
          permissions = ?,
          pin = ?,
          pin_hash = ?,
          active = ?,
          allowed_terminals = ?,
          default_terminal = ?,
          pos_mode = ?,
          language = ?,
          avatar = ?,
          phone = ?,
          created_at = ?,
          updated_at = ?,
          last_login = ?
        WHERE id = ?
      `;

      const params = [
        user.tenant_id ?? current.tenant_id,
        user.username ?? current.username,
        user.password_hash ?? current.password_hash,
        user.email ?? current.email,
        user.first_name ?? current.first_name,
        user.last_name ?? current.last_name,
        user.role_id ?? current.role_id,
        user.role ?? current.role,
        user.permissions ?? current.permissions,
        user.pin ?? current.pin,
        user.pin_hash ?? current.pin_hash,
        user.active ?? current.active,
        user.allowed_terminals ?? current.allowed_terminals,
        user.default_terminal ?? current.default_terminal,
        user.pos_mode ?? current.pos_mode,
        user.language ?? current.language,
        user.avatar ?? current.avatar,
        user.phone ?? current.phone,
        current.created_at || now,
        now,
        user.last_login ?? current.last_login,
        id
      ];

      await this.db.run(query, params);

      const updatedUser = await this.getUserById(id);
      await this.addToOutbox('users', 'UPDATE', id, updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.run('DELETE FROM users WHERE id = ?', [id]);
      await this.addToOutbox('users', 'DELETE', id, { id });
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // ========== ROLE OPERATIONS ==========

  async getRoles(): Promise<RoleRow[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const query = 'SELECT * FROM roles ORDER BY level DESC, name ASC';
      const result = await this.db.query(query);
      return result.values || [];
    } catch (error) {
      console.error('Error getting roles:', error);
      throw error;
    }
  }

  async getRoleById(id: string): Promise<RoleRow | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.query('SELECT * FROM roles WHERE id = ?', [id]);
      return result.values && result.values.length > 0 ? (result.values[0] as RoleRow) : null;
    } catch (error) {
      console.error('Error getting role by ID:', error);
      throw error;
    }
  }

  async addRole(role: RoleRow): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const id = role.id || this.generateUUID();
      const now = new Date().toISOString();

      const query = `
        INSERT INTO roles (
          id, name, description, level, permissions, active,
          can_access_terminals, can_manage_users, can_void_transactions,
          can_give_discounts, max_discount_percent, requires_approval,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        id,
        role.name,
        role.description,
        role.level,
        role.permissions,
        role.active ?? 1,
        role.can_access_terminals || null,
        role.can_manage_users ?? 0,
        role.can_void_transactions ?? 0,
        role.can_give_discounts ?? 0,
        role.max_discount_percent ?? 0,
        role.requires_approval ?? 0,
        now,
        now
      ];

      await this.db.run(query, params);

      const outboxData = {
        ...role,
        id,
      };

      await this.addToOutbox('roles', 'INSERT', id, outboxData);

      return id;
    } catch (error) {
      console.error('Error adding role:', error);
      throw error;
    }
  }

  async updateRole(id: string, role: Partial<RoleRow>): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const now = new Date().toISOString();
      const current = await this.getRoleById(id);

      if (!current) {
        throw new Error('Role not found');
      }

      const query = `
        UPDATE roles SET
          name = ?,
          description = ?,
          level = ?,
          permissions = ?,
          active = ?,
          can_access_terminals = ?,
          can_manage_users = ?,
          can_void_transactions = ?,
          can_give_discounts = ?,
          max_discount_percent = ?,
          requires_approval = ?,
          updated_at = ?
        WHERE id = ?
      `;

      const params = [
        role.name ?? current.name,
        role.description ?? current.description,
        role.level ?? current.level,
        role.permissions ?? current.permissions,
        role.active ?? current.active,
        role.can_access_terminals ?? current.can_access_terminals,
        role.can_manage_users ?? current.can_manage_users,
        role.can_void_transactions ?? current.can_void_transactions,
        role.can_give_discounts ?? current.can_give_discounts,
        role.max_discount_percent ?? current.max_discount_percent,
        role.requires_approval ?? current.requires_approval,
        now,
        id
      ];

      await this.db.run(query, params);

      const updatedRole = await this.getRoleById(id);
      await this.addToOutbox('roles', 'UPDATE', id, updatedRole);
    } catch (error) {
      console.error('Error updating role:', error);
      throw error;
    }
  }

  async deleteRole(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.run('DELETE FROM roles WHERE id = ?', [id]);
      await this.addToOutbox('roles', 'DELETE', id, { id });
    } catch (error) {
      console.error('Error deleting role:', error);
      throw error;
    }
  }

  // ========== TERMINAL OPERATIONS ==========

  async getTerminals(): Promise<TerminalRow[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const query = 'SELECT * FROM terminals ORDER BY name ASC';
      const result = await this.db.query(query);
      return result.values || [];
    } catch (error) {
      console.error('Error getting terminals:', error);
      throw error;
    }
  }

  async getTerminalById(id: string): Promise<TerminalRow | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.query('SELECT * FROM terminals WHERE id = ?', [id]);
      return result.values && result.values.length > 0 ? (result.values[0] as TerminalRow) : null;
    } catch (error) {
      console.error('Error getting terminal by ID:', error);
      throw error;
    }
  }

  async addTerminal(terminal: TerminalRow): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const id = terminal.id || this.generateUUID();
      const now = new Date().toISOString();

      const query = `
        INSERT INTO terminals (
          id, name, code, terminal_type, location, pos_mode,
          hospitality_config, printer_address, active, online,
          last_ping, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        id,
        terminal.name,
        terminal.code,
        terminal.terminal_type,
        terminal.location,
        terminal.pos_mode,
        terminal.hospitality_config || null,
        terminal.printer_address || null,
        terminal.active ?? 1,
        terminal.online ?? 0,
        terminal.last_ping || now,
        now,
        now
      ];

      await this.db.run(query, params);

      const outboxData = {
        ...terminal,
        id,
      };

      await this.addToOutbox('terminals', 'INSERT', id, outboxData);

      return id;
    } catch (error) {
      console.error('Error adding terminal:', error);
      throw error;
    }
  }

  async updateTerminal(id: string, terminal: Partial<TerminalRow>): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const now = new Date().toISOString();
      const current = await this.getTerminalById(id);

      if (!current) {
        throw new Error('Terminal not found');
      }

      const query = `
        UPDATE terminals SET
          name = ?,
          code = ?,
          terminal_type = ?,
          location = ?,
          pos_mode = ?,
          hospitality_config = ?,
          printer_address = ?,
          active = ?,
          online = ?,
          last_ping = ?,
          updated_at = ?
        WHERE id = ?
      `;

      const params = [
        terminal.name ?? current.name,
        terminal.code ?? current.code,
        terminal.terminal_type ?? current.terminal_type,
        terminal.location ?? current.location,
        terminal.pos_mode ?? current.pos_mode,
        terminal.hospitality_config ?? current.hospitality_config,
        terminal.printer_address ?? current.printer_address,
        terminal.active ?? current.active,
        terminal.online ?? current.online,
        terminal.last_ping ?? current.last_ping,
        now,
        id
      ];

      await this.db.run(query, params);

      const updatedTerminal = await this.getTerminalById(id);
      await this.addToOutbox('terminals', 'UPDATE', id, updatedTerminal);
    } catch (error) {
      console.error('Error updating terminal:', error);
      throw error;
    }
  }

  async deleteTerminal(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.run('DELETE FROM terminals WHERE id = ?', [id]);
      await this.addToOutbox('terminals', 'DELETE', id, { id });
    } catch (error) {
      console.error('Error deleting terminal:', error);
      throw error;
    }
  }

  // ========== WAITER OPERATIONS ==========

  async getWaiters(): Promise<WaiterRow[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const query = 'SELECT * FROM waiters ORDER BY name ASC';
      const result = await this.db.query(query);
      return result.values || [];
    } catch (error) {
      console.error('Error getting waiters:', error);
      throw error;
    }
  }

  async getWaiterById(id: string): Promise<WaiterRow | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.query('SELECT * FROM waiters WHERE id = ?', [id]);
      return result.values && result.values.length > 0 ? (result.values[0] as WaiterRow) : null;
    } catch (error) {
      console.error('Error getting waiter by ID:', error);
      throw error;
    }
  }

  async addWaiter(waiter: WaiterRow): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const id = waiter.id || this.generateUUID();
      const now = new Date().toISOString();

      const query = `
        INSERT INTO waiters (
          id, user_id, name, code, section, active,
          current_tables, stats, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        id,
        waiter.user_id,
        waiter.name,
        waiter.code || null,
        waiter.section || null,
        waiter.active ?? 1,
        waiter.current_tables || null,
        waiter.stats || null,
        now,
        now
      ];

      await this.db.run(query, params);

      const outboxData = {
        ...waiter,
        id,
      };

      await this.addToOutbox('waiters', 'INSERT', id, outboxData);

      return id;
    } catch (error) {
      console.error('Error adding waiter:', error);
      throw error;
    }
  }

  async updateWaiter(id: string, waiter: Partial<WaiterRow>): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const now = new Date().toISOString();
      const current = await this.getWaiterById(id);

      if (!current) {
        throw new Error('Waiter not found');
      }

      const query = `
        UPDATE waiters SET
          user_id = ?,
          name = ?,
          code = ?,
          section = ?,
          active = ?,
          current_tables = ?,
          stats = ?,
          updated_at = ?
        WHERE id = ?
      `;

      const params = [
        waiter.user_id ?? current.user_id,
        waiter.name ?? current.name,
        waiter.code ?? current.code,
        waiter.section ?? current.section,
        waiter.active ?? current.active,
        waiter.current_tables ?? current.current_tables,
        waiter.stats ?? current.stats,
        now,
        id
      ];

      await this.db.run(query, params);

      const updatedWaiter = await this.getWaiterById(id);
      await this.addToOutbox('waiters', 'UPDATE', id, updatedWaiter);
    } catch (error) {
      console.error('Error updating waiter:', error);
      throw error;
    }
  }

  async deleteWaiter(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.run('DELETE FROM waiters WHERE id = ?', [id]);
      await this.addToOutbox('waiters', 'DELETE', id, { id });
    } catch (error) {
      console.error('Error deleting waiter:', error);
      throw error;
    }
  }

  // ========== TABLE OPERATIONS ==========

  async getTables(terminalId?: string): Promise<TableRow[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      let query = 'SELECT * FROM tables';
      const params: any[] = [];

      if (terminalId) {
        query += ' WHERE terminal_id = ?';
        params.push(terminalId);
      }

      query += ' ORDER BY number ASC';

      const result = await this.db.query(query, params);
      return result.values || [];
    } catch (error) {
      console.error('Error getting tables:', error);
      throw error;
    }
  }

  async getTablesByLocation(location: string): Promise<TableRow[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const query = `
        SELECT t.*
        FROM tables t
        JOIN terminals term ON term.id = t.terminal_id
        WHERE term.location = ?
        ORDER BY t.number ASC
      `;

      const result = await this.db.query(query, [location]);
      return result.values || [];
    } catch (error) {
      console.error('Error getting tables by location:', error);
      throw error;
    }
  }

  async getTableById(id: string): Promise<TableRow | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.query('SELECT * FROM tables WHERE id = ?', [id]);
      return result.values && result.values.length > 0 ? (result.values[0] as TableRow) : null;
    } catch (error) {
      console.error('Error getting table by ID:', error);
      throw error;
    }
  }

  async addTable(table: TableRow): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const id = table.id || this.generateUUID();
      const now = new Date().toISOString();

      const query = `
        INSERT INTO tables (
          id, number, name, capacity, section, floor, status, shape,
          position, session_id, guest_name, guest_count, waiter_id,
          waiter_name, start_time, order_id, items, amount, notes,
          terminal_id, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        id,
        table.number,
        table.name || null,
        table.capacity,
        table.section || null,
        table.floor || null,
        table.status,
        table.shape || null,
        table.position || null,
        table.session_id || null,
        table.guest_name || null,
        table.guest_count || null,
        table.waiter_id || null,
        table.waiter_name || null,
        table.start_time || null,
        table.order_id || null,
        table.items || null,
        table.amount ?? 0,
        table.notes || null,
        table.terminal_id,
        table.active ?? 1,
        now,
        now
      ];

      await this.db.run(query, params);

      const outboxData = {
        ...table,
        id,
      };

      await this.addToOutbox('tables', 'INSERT', id, outboxData);

      return id;
    } catch (error) {
      console.error('Error adding table:', error);
      throw error;
    }
  }

  async updateTable(id: string, table: Partial<TableRow>): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const now = new Date().toISOString();
      const current = await this.getTableById(id);

      if (!current) {
        throw new Error('Table not found');
      }

      const query = `
        UPDATE tables SET
          number = ?,
          name = ?,
          capacity = ?,
          section = ?,
          floor = ?,
          status = ?,
          shape = ?,
          position = ?,
          session_id = ?,
          guest_name = ?,
          guest_count = ?,
          waiter_id = ?,
          waiter_name = ?,
          start_time = ?,
          order_id = ?,
          items = ?,
          amount = ?,
          notes = ?,
          terminal_id = ?,
          active = ?,
          updated_at = ?
        WHERE id = ?
      `;

      const params = [
        table.number ?? current.number,
        table.name ?? current.name,
        table.capacity ?? current.capacity,
        table.section ?? current.section,
        table.floor ?? current.floor,
        table.status ?? current.status,
        table.shape ?? current.shape,
        table.position ?? current.position,
        table.session_id ?? current.session_id,
        table.guest_name ?? current.guest_name,
        table.guest_count ?? current.guest_count,
        table.waiter_id ?? current.waiter_id,
        table.waiter_name ?? current.waiter_name,
        table.start_time ?? current.start_time,
        table.order_id ?? current.order_id,
        table.items ?? current.items,
        table.amount ?? current.amount,
        table.notes ?? current.notes,
        table.terminal_id ?? current.terminal_id,
        table.active ?? current.active,
        now,
        id
      ];

      await this.db.run(query, params);

      const updatedTable = await this.getTableById(id);
      await this.addToOutbox('tables', 'UPDATE', id, updatedTable);
    } catch (error) {
      console.error('Error updating table:', error);
      throw error;
    }
  }

  async deleteTable(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.run('DELETE FROM tables WHERE id = ?', [id]);
      await this.addToOutbox('tables', 'DELETE', id, { id });
    } catch (error) {
      console.error('Error deleting table:', error);
      throw error;
    }
  }

  // ========== OUTBOX OPERATIONS ==========

  private async addToOutbox(
    tableName: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    recordId: string,
    data: any
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const idempotencyKey = this.generateUUID();
      const now = new Date().toISOString();

      const query = `
        INSERT INTO outbox (table_name, operation, record_id, data, idempotency_key, created_at, synced)
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `;

      const params = [
        tableName,
        operation,
        recordId,
        JSON.stringify(data),
        idempotencyKey,
        now
      ];

      await this.db.run(query, params);
      // Persist mutations to the web store so data survives reloads
      // when running in the browser with jeep-sqlite.
      await this.saveWebStore();
    } catch (error) {
      console.error('Error adding to outbox:', error);
      // Don't throw - outbox failures shouldn't block local operations
    }
  }

  async getUnsyncedOutboxItems(): Promise<OutboxItem[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const query = 'SELECT * FROM outbox WHERE synced = 0 ORDER BY created_at ASC';
      const result = await this.db.query(query);
      
      return (result.values || []).map((item: any) => ({
        ...item,
        data: typeof item.data === 'string' ? JSON.parse(item.data) : item.data
      }));
    } catch (error) {
      console.error('Error getting unsynced outbox items:', error);
      throw error;
    }
  }

  async markOutboxItemAsSynced(id: number): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.run('UPDATE outbox SET synced = 1 WHERE id = ?', [id]);
    } catch (error) {
      console.error('Error marking outbox item as synced:', error);
      throw error;
    }
  }

  async clearSyncedOutboxItems(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.run('DELETE FROM outbox WHERE synced = 1');
    } catch (error) {
      console.error('Error clearing synced outbox items:', error);
      throw error;
    }
  }

  // ========== INVENTORY OPERATIONS ==========

  async getInventoryRecords(limit: number = 200): Promise<InventoryRow[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const query = 'SELECT * FROM inventory ORDER BY created_at DESC LIMIT ?';
      const result = await this.db.query(query, [limit]);
      return (result.values || []) as InventoryRow[];
    } catch (error) {
      console.error('Error getting inventory records:', error);
      throw error;
    }
  }

  async addInventoryRecord(record: InventoryRow): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const id = record.id || this.generateUUID();
      const now = new Date().toISOString();

      const query = `
        INSERT INTO inventory (
          id, product_id, quantity, action, reference, notes, created_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        id,
        record.product_id,
        record.quantity,
        record.action,
        record.reference || null,
        record.notes || null,
        record.created_at || now,
        record.created_by
      ];

      await this.db.run(query, params);

      await this.addToOutbox('inventory', 'INSERT', id, {
        ...record,
        id,
        created_at: record.created_at || now
      });

      return id;
    } catch (error) {
      console.error('Error adding inventory record:', error);
      throw error;
    }
  }

  // ========== EMAIL RECEIPT QUEUE (OUTBOX ONLY) ==========

  /**
   * Queue a receipt email request in the generic outbox.
   * This is an outbox-only record (no dedicated table); the
   * backend SyncService will see table_name = 'email_receipts'
   * and trigger the actual email send via MailService.
   */
  async queueEmailReceiptJob(job: {
    id?: string;
    orderId: string;
    orderNumber: string;
    to: string;
    businessName: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    total?: number;
    paymentMethod?: string;
    items?: Array<{
      name?: string;
      quantity?: number;
      price?: number;
      total?: number;
    }>;
    currency?: string;
    storePhone?: string;
    storeEmail?: string;
    storeAddress?: string;
    createdAt?: string;
  }): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const id = job.id || this.generateUUID();
    const createdAt = job.createdAt || new Date().toISOString();

    await this.addToOutbox('email_receipts', 'INSERT', id, {
      ...job,
      id,
      createdAt
    });

    return id;
  }

  // ========== VOID OPERATIONS ==========

  async getVoidRecords(limit: number = 200): Promise<VoidRow[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const query = 'SELECT * FROM voids ORDER BY created_at DESC LIMIT ?';
      const result = await this.db.query(query, [limit]);
      return (result.values || []) as VoidRow[];
    } catch (error) {
      console.error('Error getting void records:', error);
      throw error;
    }
  }

  async addVoidRecord(record: VoidRow): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const id = record.id || this.generateUUID();
      const now = new Date().toISOString();

      const query = `
        INSERT INTO voids (
          id, sale_id, table_id, product_id, product_name,
          quantity, price, total, reason, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        id,
        record.sale_id || null,
        record.table_id || null,
        record.product_id,
        record.product_name,
        record.quantity,
        record.price,
        record.total,
        record.reason || null,
        record.created_by,
        record.created_at || now
      ];

      await this.db.run(query, params);

      await this.addToOutbox('voids', 'INSERT', id, {
        ...record,
        id,
        created_at: record.created_at || now
      });

      return id;
    } catch (error) {
      console.error('Error adding void record:', error);
      throw error;
    }
  }

  // ========== WORKPERIOD OPERATIONS ==========

  async getOpenWorkperiod(): Promise<WorkperiodRow | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const query = `SELECT * FROM workperiods WHERE status = 'open' ORDER BY start_time DESC LIMIT 1`;
      const result = await this.db.query(query);
      const rows = (result.values || []) as WorkperiodRow[];
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error getting open workperiod:', error);
      throw error;
    }
  }

  async getRecentWorkperiods(limit: number = 20): Promise<WorkperiodRow[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const query = 'SELECT * FROM workperiods ORDER BY start_time DESC LIMIT ?';
      const result = await this.db.query(query, [limit]);
      return (result.values || []) as WorkperiodRow[];
    } catch (error) {
      console.error('Error getting recent workperiods:', error);
      throw error;
    }
  }

  async addWorkperiod(row: {
    name?: string;
    opened_by: string;
    opening_notes?: string | null;
    open_terminal_id?: string | null;
  }): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const id = this.generateUUID();
      const now = new Date().toISOString();

      const query = `
        INSERT INTO workperiods (
          id, name, start_time, end_time,
          opened_by, closed_by,
          opening_notes, closing_notes,
          open_terminal_id, close_terminal_id,
          status, created_at
        ) VALUES (?, ?, ?, NULL, ?, NULL, ?, NULL, ?, NULL, 'open', ?)
      `;

      const params = [
        id,
        row.name || null,
        now,
        row.opened_by,
        row.opening_notes || null,
        row.open_terminal_id || null,
        now
      ];

      await this.db.run(query, params);

      await this.addToOutbox('workperiods', 'INSERT', id, {
        id,
        ...row,
        start_time: now,
        status: 'open',
        created_at: now
      });

      return id;
    } catch (error) {
      console.error('Error adding workperiod:', error);
      throw error;
    }
  }

  async closeWorkperiod(
    id: string,
    data: {
      closed_by: string;
      closing_notes?: string | null;
      close_terminal_id?: string | null;
    }
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const now = new Date().toISOString();

      const query = `
        UPDATE workperiods SET
          end_time = ?,
          closed_by = ?,
          closing_notes = ?,
          close_terminal_id = ?,
          status = 'closed'
        WHERE id = ?
      `;

      const params = [
        now,
        data.closed_by,
        data.closing_notes || null,
        data.close_terminal_id || null,
        id
      ];

      await this.db.run(query, params);

      await this.addToOutbox('workperiods', 'UPDATE', id, {
        id,
        end_time: now,
        closed_by: data.closed_by,
        closing_notes: data.closing_notes || null,
        close_terminal_id: data.close_terminal_id || null,
        status: 'closed'
      });
    } catch (error) {
      console.error('Error closing workperiod:', error);
      throw error;
    }
  }

  // ========== HELD TRANSACTION OPERATIONS ==========

  async addHeldTransaction(held: any): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const id: string = held._id || this.generateUUID();
      const terminalId: string | null = held.terminalId || null;
      const heldBy: string | null = held.heldBy || null;
      const heldAt: number | null = typeof held.heldAt === 'number' ? held.heldAt : Date.now();

      const query = `
        INSERT OR REPLACE INTO held_transactions (
          id, terminal_id, held_by, held_at, data
        ) VALUES (?, ?, ?, ?, ?)
      `;

      const params = [
        id,
        terminalId,
        heldBy,
        heldAt,
        JSON.stringify({ ...held, _id: id })
      ];

      await this.db.run(query, params);
      return id;
    } catch (error) {
      console.error('Error adding held transaction:', error);
      throw error;
    }
  }

  async getHeldTransactions(terminalId?: string): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      let query = 'SELECT * FROM held_transactions';
      const params: any[] = [];

      if (terminalId) {
        query += ' WHERE terminal_id = ?';
        params.push(terminalId);
      }

      query += ' ORDER BY held_at DESC, created_at DESC';

      const result = await this.db.query(query, params);
      const rows: HeldTransactionRow[] = (result.values || []) as HeldTransactionRow[];

      return rows.map((row) => {
        try {
          const parsed = JSON.parse(row.data);
          return {
            ...parsed,
            _id: parsed._id || row.id,
            terminalId: parsed.terminalId || row.terminal_id,
            heldBy: parsed.heldBy || row.held_by,
            heldAt: parsed.heldAt || row.held_at,
          };
        } catch (e) {
          console.error('Error parsing held transaction row:', e);
          return {
            _id: row.id,
            terminalId: row.terminal_id,
            heldBy: row.held_by,
            heldAt: row.held_at,
          };
        }
      });
    } catch (error) {
      console.error('Error getting held transactions:', error);
      throw error;
    }
  }

  async deleteHeldTransaction(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.run('DELETE FROM held_transactions WHERE id = ?', [id]);
    } catch (error) {
      console.error('Error deleting held transaction:', error);
      throw error;
    }
  }

  // ========== MODIFIER GROUP OPERATIONS ==========

  async getModifierGroups(): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.query('SELECT * FROM modifier_groups ORDER BY name ASC');
      const rows: ModifierGroupRow[] = (result.values || []) as ModifierGroupRow[];
      return rows.map(row => {
        try {
          const parsed = JSON.parse(row.data);
          return {
            ...parsed,
            _id: parsed._id || row.id,
            name: parsed.name || row.name,
            active: parsed.active ?? (row.active === 0 ? false : true),
          };
        } catch (e) {
          console.error('Error parsing modifier group row:', e);
          return {
            _id: row.id,
            name: row.name,
            active: row.active === 0 ? false : true,
          };
        }
      });
    } catch (error) {
      console.error('Error getting modifier groups:', error);
      throw error;
    }
  }

  async addModifierGroup(group: any): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const id: string = group._id || this.generateUUID();
      const now = new Date().toISOString();

      const query = `
        INSERT INTO modifier_groups (
          id, name, active, data, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      const params = [
        id,
        group.name,
        group.active === false ? 0 : 1,
        JSON.stringify({ ...group, _id: id }),
        now,
        now
      ];

      await this.db.run(query, params);
      return id;
    } catch (error) {
      console.error('Error adding modifier group:', error);
      throw error;
    }
  }

  async updateModifierGroup(group: any): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const id: string = group._id;
      const now = new Date().toISOString();

      const query = `
        UPDATE modifier_groups SET
          name = ?,
          active = ?,
          data = ?,
          updated_at = ?
        WHERE id = ?
      `;

      const params = [
        group.name,
        group.active === false ? 0 : 1,
        JSON.stringify(group),
        now,
        id
      ];

      await this.db.run(query, params);
    } catch (error) {
      console.error('Error updating modifier group:', error);
      throw error;
    }
  }

  async deleteModifierGroup(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.run('DELETE FROM modifier_groups WHERE id = ?', [id]);
    } catch (error) {
      console.error('Error deleting modifier group:', error);
      throw error;
    }
  }

  // ========== UTILITY METHODS ==========

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  async closeConnection(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }

  async clearAllData(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.execute('DELETE FROM products');
      await this.db.execute('DELETE FROM customers');
      await this.db.execute('DELETE FROM sales');
      await this.db.execute('DELETE FROM categories');
      await this.db.execute('DELETE FROM outbox');
      await this.db.execute('DELETE FROM inventory');
      await this.db.execute('DELETE FROM voids');
      await this.db.execute('DELETE FROM held_transactions');
      await this.db.execute('DELETE FROM workperiods');
      await this.db.execute('DELETE FROM modifier_groups');
      console.log('All data cleared');
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }
}
