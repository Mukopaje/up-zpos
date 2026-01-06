export interface ItemInv {
  location: string;
  warehouse: string;
  qty: number;
  cost: number;
}

// Product Options
export interface ProductVariant {
  id: string;
  name: string; // 'Small', 'Medium', 'Large', 'Red', 'Blue'
  sku?: string;
  priceModifier: number; // Amount to add/subtract from base price
  active: boolean;
}

export interface ProductPortion {
  id: string;
  name: string; // 'Shot', 'Glass', 'Bottle', 'Pitcher'
  size: string; // '30ml', '250ml', '750ml', '1.5L'
  priceMultiplier: number; // 0.5 for shot, 1.0 for glass, 3.0 for pitcher
  active: boolean;
}

export interface ProductBundle {
  id: string;
  name: string; // 'Single', '6-Pack', 'Crate', 'Case'
  quantity: number; // 1, 6, 24, 12
  priceMultiplier: number; // Discount factor: 0.9 for 6-pack, 0.8 for crate
  active: boolean;
}

export interface ModifierOption {
  id: string;
  name: string; // 'Extra Cheese', 'No Onions', 'Spicy'
  price: number; // Additional charge (0 for removal options)
  active: boolean;
}

export interface ModifierGroup {
  _id: string;
  _rev?: string;
  type: 'modifier-group';
  name: string; // 'Toppings', 'Cooking Instructions', 'Add-ons'
  options: ModifierOption[];
  multiSelect: boolean; // Allow multiple selections
  required: boolean; // Must select at least one
  maxSelections?: number; // Limit number of selections
  // Mapping
  categories?: string[]; // Category IDs this applies to
  products?: string[]; // Specific product IDs
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface OrderModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  price: number;
}

export interface Product {
  _id: string;
  _rev?: string;
  type: 'product';
  name: string;
  barcode: string;
  category: string; // @deprecated - kept for backward compatibility, use categories instead
  categories?: string[]; // Array of category IDs - supports multiple categories
  price: number;
  cost: number;
  quantity: number;
  unit: string;
  description?: string;
  imageUrl?: string;
  taxable: boolean;
  active: boolean;
  inventory?: ItemInv[];
  tags?: string[]; // For better search and organization
  subcategory?: string; // @deprecated - use categories with parentId instead
  favorite?: boolean; // Quick access in retail POS
  kitchenPrinter?: string; // For hospitality - which printer to send to
  courseType?: 'starter' | 'main' | 'dessert' | 'beverage'; // For hospitality
  preparationTime?: number; // Minutes - for kitchen display
  // Product options
  variants?: ProductVariant[]; // Size, color, style options
  portions?: ProductPortion[]; // Shot, glass, bottle serving sizes
  bundles?: ProductBundle[]; // Single, 6-pack, crate packaging
  modifierGroups?: string[]; // IDs of applicable modifier groups
  _attachments?: any;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
}

export interface Category {
  _id: string;
  _rev?: string;
  type: 'category';
  name: string;
  description?: string;
  icon?: string;
  color?: string; // For visual distinction
  imageUrl?: string; // Category tile image
  menuId?: string; // Menu this category belongs to (Kitchen, Bar, etc.)
  parentId?: string; // For subcategories - ID of parent category
  parentPath?: string[]; // Full path of parent IDs for nested categories [grandparent, parent]
  level?: number; // Category depth: 0=root, 1=first level subcategory, etc.
  order: number;
  active: boolean;
  productCount?: number; // Cached count of products in this category
  _attachments?: any;
  createdAt: number;
  updatedAt: number;
}

export interface Menu {
  _id: string;
  _rev?: string;
  type: 'menu';
  name: string; // e.g. "Kitchen", "Bar", "Drinks", "Breakfast"
  description?: string;
  color?: string; // Tile color for this menu in POS
  active: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface CartItem {
  _id?: string;
  product: Product;
  Quantity: number; // Match old schema
  quantity: number; // Modern alias
  price: number;
  itemTotalPrice: number; // Match old schema
  total: number; // Modern alias
  itemDiscount?: number; // Match old schema
  discount: number; // Modern alias
  tax_amount?: number; // Match old schema - per unit
  itemTotalTax?: number; // Match old schema - total for all units
  tax: number; // Modern alias
  taxExempt?: boolean;
  measure?: string; // 'fraction' or 'unit'
  barcode?: string;
  name?: string; // Product name for faster access
  category?: string;
  notes?: string; // Special instructions (hospitality)
  courseType?: string; // For course-based ordering
  sentToKitchen?: boolean; // For hospitality
  sentAt?: number; // Timestamp when sent to kitchen
  // Product options selected
  selectedVariant?: ProductVariant;
  selectedPortion?: ProductPortion;
  selectedBundle?: ProductBundle;
  modifiers?: OrderModifier[]; // Selected modifiers with prices
}

export interface Payment {
  _id?: string;
  type: 'cash' | 'card' | 'account' | 'mobile';
  amount: number;
  reference?: string;
  timestamp?: number;
}

export interface Order {
  _id: string;
  _rev?: string;
  type: 'order';
  orderNumber?: string; // Modern
  invoice_no?: string; // Match old schema
  cart?: CartItem[]; // Match old schema
  items: CartItem[]; // Modern alias
  subtotal?: number;
  subTotalPrice?: number; // Match old schema
  tax: number;
  taxAmount?: number; // Match old schema
  discount: number;
  discountAmount?: number; // Match old schema
  ticketDiscount?: number;
  total: number;
  grandTotal?: number; // Match old schema
  amountPaid: number;
  change: number;
  paymentMethod?: 'cash' | 'card' | 'mobile' | 'credit' | 'account';
  paymentOption?: string; // Match old schema
  payment?: Payment[]; // Match old schema - array of payments
  status: 'pending' | 'completed' | 'cancelled' | 'refunded' | 'processed' | 'unprocessed';
  customer?: Customer;
  customerId?: string;
  notes?: string;
  user?: string; // Match old schema - user ID
  createdBy: string;
  createdAt: number;
  timestamp?: string; // Match old schema - ISO string
  updatedAt: number;
  completedAt?: number;
  printedAt?: number;
  location?: string;
  warehouse?: string;
  terminalId?: string; // Which terminal processed this
  tableId?: string; // For hospitality
  roomId?: string; // For hotels
  waiterId?: string; // For hospitality
    covers?: number; // Number of guests/covers for hospitality
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  qty?: number; // Total quantity of items
  trackingId?: number; // Match old schema
  returns?: number; // Total return amount
  returnTotal?: number; // Alternative return tracking
}

export interface Customer {
  _id: string;
  _rev?: string;
  type: 'customer';
  name: string;
  email?: string;
  phone: string;
  address?: string;
  creditLimit: number;
  balance: number;
  active: boolean;
  loyaltyPoints?: number; // For loyalty programs
  visits?: number; // Track customer visits
  lastVisit?: number; // Timestamp
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface User {
  _id: string;
  _rev?: string;
  type: 'user';
  tenantId: string; // Multi-tenant: which business/tenant this user belongs to
  username?: string; // Optional: for username/password login (if implemented)
  passwordHash?: string; // SHA-256 hash of password for username/password login
  email: string;
  firstName: string;
  lastName: string;
  roleId: string; // Reference to Role
  role?: string; // Deprecated - use roleId
  permissions?: Permission[]; // Override role permissions
  pin?: string; // Deprecated - use pinHash
  pinHash?: string; // SHA-256 hash of PIN for quick POS login (4-6 digits)
  active: boolean;
  allowedTerminals?: string[]; // Specific terminal IDs this user can access
  defaultTerminal?: string;
  posMode?: 'retail' | 'category' | 'hospitality'; // User preference
  language?: string;
  avatar?: string;
  phone?: string;
  createdAt: number;
  updatedAt: number;
  lastLogin?: number;
}

// Business License (for cloud sync and provider access)
export interface BusinessLicense {
  _id: string;
  _rev?: string;
  type: 'license';
  businessEmail: string; // Owner/admin email for cloud access
  passwordHash: string; // Hashed password for cloud authentication
  businessName: string;
  licenseKey: string;
  activatedAt: number;
  expiresAt: number;
  deviceId: string;
  status: 'active' | 'expired' | 'suspended';
  maxUsers: number;
  features: string[]; // enabled features
  lastSync?: number;
  createdAt: number;
  updatedAt: number;
}

// Enhanced Permission System
export interface Permission {
  module: string; // 'pos', 'products', 'inventory', 'reports', 'settings', etc.
  actions: string[]; // ['view', 'create', 'edit', 'delete', 'print']
}

export interface Role {
  _id: string;
  _rev?: string;
  type: 'role';
  name: string; // 'Admin', 'Manager', 'Cashier', 'Waiter', 'Kitchen', 'Viewer'
  description: string;
  permissions: Permission[];
  level: number; // Hierarchy: Admin=100, Manager=50, Cashier=30, Staff=10
  active?: boolean;
  canAccessTerminals?: 'all' | 'assigned'; // Terminal access level
  canManageUsers?: boolean;
  canVoidTransactions?: boolean;
  canGiveDiscounts?: boolean;
  maxDiscountPercent?: number;
  requiresApproval?: boolean; // For sensitive operations
  createdAt: number;
  updatedAt: number;
}

export interface Inventory {
  _id: string;
  _rev?: string;
  type: 'inventory';
  product: string;
  quantity: number;
  action: 'purchase' | 'sale' | 'adjustment' | 'return';
  reference?: string;
  notes?: string;
  createdAt: number;
  createdBy: string;
}

// Hospitality Entities
export interface Table {
  _id: string;
  _rev?: string;
  type: 'table';
  number: string; // 'T1', 'T2', etc.
  name?: string; // 'Window Table', 'Corner Booth'
  capacity: number;
  section?: string; // 'Main Floor', 'Terrace', 'VIP'
  floor?: number;
  status: 'free' | 'occupied' | 'reserved' | 'cleaning';
  shape?: 'square' | 'round' | 'rectangular';
  position?: { x: number; y: number }; // For floor plan
  // Current session
  sessionId?: string;
  guestName?: string;
  guestCount?: number;
  waiterId?: string;
  waiterName?: string;
  startTime?: number;
  orderId?: string; // Current order
  items: CartItem[];
  amount: number;
  notes?: string;
  // Config
  terminalId: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Room {
  _id: string;
  _rev?: string;
  type: 'room';
  number: string;
  name?: string;
  roomType: 'standard' | 'deluxe' | 'suite' | 'villa';
  building?: string;
  floor?: number;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  // Guest info
  guestId?: string;
  guestName?: string;
  checkInDate?: number;
  checkOutDate?: number;
  // Running charges
  accommodation: number;
  services: RoomService[];
  totalCharges: number;
  // Config
  terminalId?: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface RoomService {
  _id: string;
  type: 'minibar' | 'laundry' | 'room-service' | 'spa' | 'other';
  description: string;
  items: CartItem[];
  amount: number;
  timestamp: number;
  status: 'pending' | 'completed' | 'billed';
  orderId?: string;
  waiterId?: string;
}

export interface Waiter {
  _id: string;
  _rev?: string;
  type: 'waiter';
  userId: string; // Reference to User
  name: string;
  code?: string; // Short code
  section?: string; // Assigned section
  active: boolean;
  currentTables: string[]; // Active table IDs
  stats?: {
    ordersToday: number;
    salesTotal: number;
    averageOrderValue: number;
  };
  createdAt: number;
  updatedAt: number;
}

export interface TableSession {
  _id: string;
  _rev?: string;
  type: 'table-session';
  tableId: string;
  tableName: string;
  guestName: string;
  guestCount: number;
  waiterId: string;
  waiterName: string;
  startTime: number;
  endTime?: number;
  orders: string[]; // Order IDs
  totalAmount: number;
  status: 'active' | 'completed' | 'cancelled';
  terminalId: string;
  createdAt: number;
  updatedAt: number;
}

// Kitchen Order for printing
export interface KitchenOrder {
  _id: string;
  orderId: string;
  tableNumber?: string;
  roomNumber?: string;
  items: CartItem[];
  courseType?: string;
  priority: 'normal' | 'urgent';
  status: 'pending' | 'preparing' | 'ready' | 'served';
  waiterName: string;
  notes?: string;
  sentAt: number;
  preparedAt?: number;
  estimatedTime?: number; // Minutes
}

// Enhanced Terminal with POS mode
export interface Terminal {
  _id: string;
  _rev?: string;
  type: 'terminal';
  name: string; // 'Main Counter', 'Bar Station', 'Kitchen Display'
  code: string; // Short code like 'POS1', 'BAR1'
  terminalType: 'pos' | 'kitchen' | 'display' | 'kiosk';
  location: string; // Store/branch ID
  posMode: 'retail' | 'category' | 'hospitality';
  hospitalityConfig?: {
    type: 'restaurant' | 'hotel' | 'bar' | 'cafe';
    assignedArea?: string; // 'Main Floor', 'Terrace', 'Building A'
    enableTableManagement: boolean;
    enableWaiterAssignment: boolean;
    enableCourseTiming: boolean;
    printers: {
      receipt?: string; // Receipt printer ID
      kitchen?: { [category: string]: string }; // Category -> Printer mapping
    };
    floorPlan?: {
      backgroundImageUrl?: string;
      labels?: FloorLabel[];
    };
  };
  printerAddress?: string; // Default printer
  ipAddress?: string;
  macAddress?: string;
  deviceInfo?: {
    os: string;
    browser: string;
    screenSize: string;
  };
  active: boolean;
  online?: boolean; // Current status
  lastPing?: number;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface FloorLabel {
  id: string;
  type: 'door' | 'counter' | 'bar' | 'restroom' | 'custom';
  text?: string;
  x: number; // 0-1 normalized position horizontally
  y: number; // 0-1 normalized position vertically
}

export interface Printer {
  _id?: string;
  _rev?: string;
  type?: 'printer';
  name: string;
  macAddress: string;
  address?: string; // Bluetooth address or IP
  size: '58mm' | '80mm';
  characters: number; // Characters per line (32 for 58mm, 48 for 80mm)
  printing: boolean; // Enable/disable printing
  printerType: 'BT' | 'USB' | 'Network' | 'OB'; // Bluetooth, USB, Network, Onboard
  model: string; // 'Generic', 'Datecs', 'Epson', 'Star', etc.
  driver?: 'escpos-generic' | 'ocom-q1' | 'l156' | 'windows' | 'custom';
  connection?: 'bluetooth' | 'network' | 'usb' | 'server';
  deviceId?: string;
  paperCutter: boolean;
  cashDrawer: boolean;
  // Kitchen printer specific
  categories?: string[]; // Which product categories to print
  active: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface PrinterSettings {
  defaultPrinter?: Printer;
  autoPrint: boolean; // Auto-print after successful payment
  printCopies: number; // Number of receipt copies
  openCashDrawer: boolean; // Open cash drawer after print
  paperWidth: 32 | 48 | 58 | 80; // Paper width in mm
  fontSize: 'small' | 'normal' | 'large';
  autoCut: boolean; // Auto-cut paper after print
  printLogo: boolean; // Print business logo
  businessInfo: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    taxNumber?: string; // TPIN or VAT number
    taxId?: string; // Alias for taxNumber
    logo?: string; // Base64 image
    footer?: string; // Receipt footer message
  };
  receiptFooter?: string;
  kitchenPrinters?: { [category: string]: string }; // Category to printer mapping
}

export interface ReceiptData {
  orderId: string;
  orderNumber: string;
  invoice_no?: string;
  timestamp: string;
  user: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  grandTotal?: number;
  amountPaid: number;
  tenderedTotal?: number;
  change: number;
  changeTotal?: number;
  balance?: number;
  paymentMethod: string;
  payments?: ReceiptPayment[];
  customer?: {
    name: string;
    phone?: string;
    balance?: number;
  };
  tableNumber?: string;
  waiterName?: string;
  notes?: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  qty?: number; // Alias
  price: number;
  total: number;
  discount?: number;
  notes?: string;
}

export interface ReceiptPayment {
  paymentOption: string;
  type?: string;
  amount: number;
}

// Held Transactions (for retail POS)
export interface HeldTransaction {
  _id: string;
  _rev?: string;
  type: 'held-transaction';
  items: CartItem[];
  customer?: Customer;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  heldBy: string;
  heldAt: number;
  terminalId: string;
  reason?: string;
}

// Quick Access / Favorites
export interface QuickAccess {
  _id: string;
  _rev?: string;
  type: 'quick-access';
  userId: string;
  terminalId?: string;
  products: string[]; // Product IDs
  maxItems: number; // Max items to show
  autoUpdate: boolean; // Auto-update based on usage
  createdAt: number;
  updatedAt: number;
}

// Loyalty & Promotions

export interface LoyaltyProgram {
  earnRate: number; // points per currency unit spent
  redeemRate: number; // currency value per point when redeeming
  active: boolean;

  // Advanced earning rules (optional and backward-compatible)
  // Minimum ticket total required before any points are awarded.
  minTotalForEarn?: number;

  // Optional whitelist of payment methods that are allowed to
  // earn points (e.g. ['cash', 'card']). When omitted or empty,
  // all payment methods can earn points.
  allowedPaymentMethods?: string[] | null;
}

export interface LoyaltyAccount {
  customerId: string;
  pointsBalance: number;
}

export type PromotionType = 'PERCENT' | 'AMOUNT';

export interface Promotion {
  id: string;
  name: string;
  description?: string;
  type: PromotionType;
  value: number;
  startDate?: string;
  endDate?: string;
  active: boolean;
  conditions?: any;
}
