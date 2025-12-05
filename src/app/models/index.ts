export interface Product {
  _id: string;
  _rev?: string;
  type: 'product';
  name: string;
  barcode: string;
  category: string;
  price: number;
  cost: number;
  quantity: number;
  unit: string;
  description?: string;
  imageUrl?: string;
  taxable: boolean;
  active: boolean;
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
  order: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  price: number;
  discount: number;
  tax: number;
  total: number;
}

export interface Order {
  _id: string;
  _rev?: string;
  type: 'order';
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amountPaid: number;
  change: number;
  paymentMethod: 'cash' | 'card' | 'mobile' | 'credit';
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  customer?: Customer;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  completedAt?: number;
  printedAt?: number;
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
  createdAt: number;
  updatedAt: number;
}

export interface User {
  _id: string;
  _rev?: string;
  type: 'user';
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: Permission[];
  pin?: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Permission {
  module: string;
  name: string;
  value: boolean;
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

export interface Terminal {
  _id: string;
  _rev?: string;
  type: 'terminal';
  name: string;
  location: string;
  printerAddress?: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}
