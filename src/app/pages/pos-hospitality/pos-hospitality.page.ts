import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons,
  IonIcon, IonBadge, IonList, IonItem, IonLabel, IonNote, IonCard,
  IonCardContent, IonCardHeader, IonCardTitle, IonGrid, IonRow, IonCol,
  IonSegment, IonSegmentButton, IonFab, IonFabButton, IonModal, IonInput,
  IonSelect, IonSelectOption, IonTextarea, IonChip, IonFooter
} from '@ionic/angular/standalone';
import {
  gridOutline, listOutline, addOutline, removeOutline, trashOutline,
  checkmarkOutline, personOutline, timeOutline, restaurantOutline,
  peopleOutline, cashOutline, cardOutline, printOutline, closeOutline,
  swapHorizontalOutline, arrowForwardOutline, sendOutline
} from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { Table, Product, CartItem, Waiter, Order } from '../../models';
import { TablesService } from '../../core/services/tables.service';
import { WaitersService } from '../../core/services/waiters.service';
import { AuthService } from '../../core/services/auth.service';
import { ProductsService } from '../../core/services/products.service';
import { OrdersService } from '../../core/services/orders.service';

@Component({
  selector: 'app-pos-hospitality',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons,
    IonIcon, IonBadge, IonList, IonItem, IonLabel, IonNote, IonCard,
    IonCardContent, IonCardHeader, IonCardTitle, IonGrid, IonRow, IonCol,
    IonSegment, IonSegmentButton, IonFab, IonFabButton, IonModal, IonInput,
    IonSelect, IonSelectOption, IonTextarea, IonChip, IonFooter
  ],
  templateUrl: './pos-hospitality.page.html',
  styleUrls: ['./pos-hospitality.page.scss']
})
export class PosHospitalityPage implements OnInit {
  private tablesService = inject(TablesService);
  private waitersService = inject(WaitersService);
  private auth = inject(AuthService);
  private productsService = inject(ProductsService);
  private ordersService = inject(OrdersService);

  // Signals
  tables = signal<Table[]>([]);
  waiters = signal<Waiter[]>([]);
  products = signal<Product[]>([]);
  selectedTable = signal<Table | null>(null);
  selectedSection = signal<string>('all');
  viewMode = signal<'grid' | 'list'>('grid');
  showNewOrderModal = signal(false);
  showCheckoutModal = signal(false);
  showTableModal = signal(false);
  
  // New order form
  guestName = signal('');
  guestCount = signal(1);
  selectedWaiterId = signal('');
  tableNotes = signal('');

  // Product selection
  selectedCategory = signal('all');
  categories = signal<string[]>([]);
  orderItems = signal<CartItem[]>([]);

  // Checkout
  paymentMethod = signal<'cash' | 'card' | 'mobile' | 'account'>('cash');
  amountPaid = signal(0);

  // Computed
  filteredTables = computed(() => {
    const section = this.selectedSection();
    if (section === 'all') return this.tables();
    return this.tables().filter(t => t.section === section);
  });

  sections = computed(() => {
    const allSections = this.tables().map(t => t.section).filter(s => !!s) as string[];
    return ['all', ...Array.from(new Set(allSections))];
  });

  occupiedCount = computed(() => 
    this.tables().filter(t => t.status === 'occupied').length
  );

  totalRevenue = computed(() =>
    this.tables()
      .filter(t => t.status === 'occupied')
      .reduce((sum, t) => sum + t.amount, 0)
  );

  filteredProducts = computed(() => {
    const category = this.selectedCategory();
    if (category === 'all') return this.products();
    return this.products().filter(p => p.category === category);
  });

  orderTotal = computed(() =>
    this.orderItems().reduce((sum, item) => sum + item.total, 0)
  );

  constructor() {
    addIcons({
      gridOutline, listOutline, addOutline, removeOutline, trashOutline,
      checkmarkOutline, personOutline, timeOutline, restaurantOutline,
      peopleOutline, cashOutline, cardOutline, printOutline, closeOutline,
      swapHorizontalOutline, arrowForwardOutline, sendOutline
    });
  }

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    const terminalId = this.auth.currentTerminal()?._id;
    await Promise.all([
      this.tablesService.loadTables(terminalId),
      this.waitersService.loadWaiters(),
      this.loadProducts()
    ]);

    this.tables.set(this.tablesService.tables());
    this.waiters.set(this.waitersService.getActiveWaiters());
  }

  async loadProducts() {
    const products = await this.productsService.loadProducts();
    const activeProducts = products.filter(p => p.active);

    this.products.set(activeProducts);
    
    const cats = Array.from(new Set(activeProducts.map(p => p.category)));
    this.categories.set(['all', ...cats]);
  }

  getTableStatusColor(status: Table['status']): string {
    switch (status) {
      case 'free': return 'success';
      case 'occupied': return 'danger';
      case 'reserved': return 'warning';
      case 'cleaning': return 'medium';
      default: return 'medium';
    }
  }

  getTableIcon(table: Table): string {
    return table.status === 'occupied' ? 'restaurant-outline' : 'checkmark-outline';
  }

  selectTable(table: Table) {
    this.selectedTable.set(table);
    
    if (table.status === 'free') {
      this.showTableModal.set(true);
    } else if (table.status === 'occupied') {
      this.orderItems.set([...table.items]);
      this.showNewOrderModal.set(true);
    }
  }

  async occupyTable() {
    const table = this.selectedTable();
    if (!table) return;

    const waiter = this.waiters().find(w => w._id === this.selectedWaiterId());
    
    await this.tablesService.occupyTable(
      table._id,
      this.guestName(),
      this.guestCount(),
      this.selectedWaiterId(),
      waiter?.name
    );

    await this.loadData();
    this.resetTableForm();
    this.showTableModal.set(false);
    
    // Open order screen
    const updatedTable = this.tables().find(t => t._id === table._id);
    if (updatedTable) {
      this.selectedTable.set(updatedTable);
      this.showNewOrderModal.set(true);
    }
  }

  resetTableForm() {
    this.guestName.set('');
    this.guestCount.set(1);
    this.selectedWaiterId.set('');
    this.tableNotes.set('');
  }

  addProductToOrder(product: Product, quantity = 1) {
    const existingIndex = this.orderItems().findIndex(item => item.product._id === product._id);

    if (existingIndex >= 0) {
      this.updateOrderQuantity(existingIndex, this.orderItems()[existingIndex].quantity + quantity);
    } else {
      const newItem: CartItem = {
        product,
        Quantity: quantity,
        quantity,
        price: product.price,
        itemTotalPrice: product.price * quantity,
        total: product.price * quantity,
        itemDiscount: 0,
        discount: 0,
        tax_amount: product.taxable ? product.price * 0.16 : 0,
        itemTotalTax: product.taxable ? product.price * quantity * 0.16 : 0,
        tax: product.taxable ? product.price * quantity * 0.16 : 0,
        taxExempt: !product.taxable,
        name: product.name,
        category: product.category,
        courseType: product.courseType,
        sentToKitchen: false
      };

      this.orderItems.update(items => [...items, newItem]);
    }
  }

  updateOrderQuantity(index: number, newQuantity: number) {
    if (newQuantity <= 0) {
      this.removeOrderItem(index);
      return;
    }

    this.orderItems.update(items => {
      const updated = [...items];
      const item = updated[index];
      item.quantity = newQuantity;
      item.Quantity = newQuantity;
      item.total = item.price * newQuantity;
      item.itemTotalPrice = item.total;
      item.tax = item.taxExempt ? 0 : item.price * newQuantity * 0.16;
      item.itemTotalTax = item.tax;
      return updated;
    });
  }

  removeOrderItem(index: number) {
    this.orderItems.update(items => items.filter((_, i) => i !== index));
  }

  async sendToKitchen() {
    const table = this.selectedTable();
    if (!table) return;

    // Mark items as sent to kitchen
    const newItems = this.orderItems().filter(item => !item.sentToKitchen);
    newItems.forEach(item => {
      item.sentToKitchen = true;
      item.sentAt = Date.now();
    });

    // Add items to table
    await this.tablesService.addItems(table._id, newItems);
    await this.loadData();

    // TODO: Print to kitchen printer
    
    this.showNewOrderModal.set(false);
    this.orderItems.set([]);
  }

  async saveOrder() {
    const table = this.selectedTable();
    if (!table) return;

    await this.tablesService.addItems(table._id, this.orderItems());
    await this.loadData();

    this.showNewOrderModal.set(false);
    this.orderItems.set([]);
  }

  openCheckout(table: Table) {
    this.selectedTable.set(table);
    this.amountPaid.set(table.amount);
    this.showCheckoutModal.set(true);
  }

  async completePayment() {
    const table = this.selectedTable();
    if (!table) return;

    // Create order
    const subtotal = table.items.reduce((sum, item) => sum + (item.total - item.tax), 0);
    const tax = table.items.reduce((sum, item) => sum + item.tax, 0);
    const total = table.amount;
    const amountPaid = this.amountPaid();

    // Create an order via OrdersService so it goes through the unified
    // SQLite-backed sales flow, using the current cart contents.
    // Temporarily, we do not attach the table items to the global cart;
    // instead, we treat this as a simple paid sale with the given totals.
    await this.ordersService.createOrder({
      paymentType: this.paymentMethod(),
      amountPaid,
      customer: undefined,
      notes: `Table ${table.number} - hospitality checkout`,
      payments: [{
        type: this.paymentMethod(),
        amount: total,
        timestamp: Date.now()
      }]
    });

    // Clear table
    await this.tablesService.clearTable(table._id);
    await this.loadData();

    // Update waiter stats
    if (table.waiterId) {
      await this.waitersService.updateStats(table.waiterId, table.amount);
    }

    this.showCheckoutModal.set(false);
    this.selectedTable.set(null);
  }

  async transferTable(table: Table) {
    // TODO: Show waiter selection modal
  }

  async mergeTable(table: Table) {
    // TODO: Show table selection modal for merge
  }

  closeModals() {
    this.showTableModal.set(false);
    this.showNewOrderModal.set(false);
    this.showCheckoutModal.set(false);
    this.selectedTable.set(null);
    this.orderItems.set([]);
  }

  getElapsedTime(startTime: number): string {
    const elapsed = Date.now() - startTime;
    const minutes = Math.floor(elapsed / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }
}
