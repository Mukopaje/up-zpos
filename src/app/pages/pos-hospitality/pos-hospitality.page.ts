import { Component, OnInit, inject, signal, computed, ViewChild, ElementRef, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons,
  IonIcon, IonBadge, IonList, IonItem, IonLabel, IonNote, IonCard,
  IonCardContent, IonCardHeader, IonCardTitle, IonGrid, IonRow, IonCol,
  IonSegment, IonSegmentButton, IonFab, IonFabButton, IonModal, IonInput,
  IonSelect, IonSelectOption, IonTextarea, IonChip, IonFooter, IonText
} from '@ionic/angular/standalone';
import {
  gridOutline, listOutline, addOutline, removeOutline, trashOutline,
  checkmarkOutline, personOutline, timeOutline, restaurantOutline,
  peopleOutline, cashOutline, cardOutline, printOutline, closeOutline,
  swapHorizontalOutline, arrowForwardOutline, sendOutline, createOutline
} from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { Table, Product, CartItem, Waiter, Order, FloorLabel, Terminal } from '../../models';
import { TablesService } from '../../core/services/tables.service';
import { WaitersService } from '../../core/services/waiters.service';
import { AuthService } from '../../core/services/auth.service';
import { ProductsService } from '../../core/services/products.service';
import { OrdersService } from '../../core/services/orders.service';
import { PrintService } from '../../core/services/print.service';
import { CartService } from '../../core/services/cart.service';
import { HospitalityContextService } from '../../core/services/hospitality-context.service';
import { TerminalsService } from '../../core/services/terminals.service';

@Component({
  selector: 'app-pos-hospitality',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons,
    IonIcon, IonBadge, IonList, IonItem, IonLabel, IonNote, IonCard,
    IonCardContent, IonCardHeader, IonCardTitle, IonGrid, IonRow, IonCol,
    IonSegment, IonSegmentButton, IonFab, IonFabButton, IonModal, IonInput,
    IonSelect, IonSelectOption, IonTextarea, IonChip, IonFooter, IonText
  ],
  templateUrl: './pos-hospitality.page.html',
  styleUrls: ['./pos-hospitality.page.scss']
})
export class PosHospitalityPage implements OnInit {
  private router = inject(Router);
  private tablesService = inject(TablesService);
  private waitersService = inject(WaitersService);
  private auth = inject(AuthService);
  private productsService = inject(ProductsService);
  private ordersService = inject(OrdersService);
  private printService = inject(PrintService);
  private cartService = inject(CartService);
  hospitalityContext = inject(HospitalityContextService);
  private terminalsService = inject(TerminalsService);

  @ViewChild('floorPlanCanvas') floorPlanCanvas?: ElementRef<HTMLDivElement>;
  @ViewChild('occupyTableModal') occupyTableModal?: IonModal;

  // Signals
  tables = signal<Table[]>([]);
  waiters = signal<Waiter[]>([]);
  products = signal<Product[]>([]);
  selectedTable = signal<Table | null>(null);
  selectedSection = signal<string>('all');
  viewMode = signal<'grid' | 'list'>('grid');
  layoutMode = signal<'service' | 'layout'>('service');
  editingLayout = signal(false);
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

  // Floor plan editing state
  private draggingTableId: string | null = null;
  private draggingLabelId: string | null = null;
  labels = signal<FloorLabel[]>([]);
  floorPlanImageUrl = signal<string | null>(null);
  labelType = signal<FloorLabel['type']>('door');
  labelText = signal('');

  // Computed
  filteredTables = computed(() => {
    const section = this.selectedSection();
    if (section === 'all') return this.tables();
    if (section === 'unassigned') {
      return this.tables().filter(t => !t.section);
    }
    return this.tables().filter(t => t.section === section);
  });

  sections = computed(() => {
    const allSections = this.tables().map(t => t.section).filter(s => !!s) as string[];
    const uniqueSections = Array.from(new Set(allSections));
    const hasUnassigned = this.tables().some(t => !t.section);
    const base = ['all', ...uniqueSections];
    return hasUnassigned ? [...base, 'unassigned'] : base;
  });

  occupiedCount = computed(() => 
    this.tables().filter(t => t.status === 'occupied').length
  );

  totalRevenue = computed(() =>
    this.tables()
      .filter(t => t.status === 'occupied')
      .reduce((sum, t) => sum + t.amount, 0)
  );

  // Admin flag for showing management/exit actions
  isAdmin = computed(() => this.auth.isAdmin());

  // Floor plan config derived from the current terminal's hospitalityConfig
  floorPlan = computed(() => {
    const terminal = this.auth.currentTerminal();
    return (terminal?.hospitalityConfig as any)?.floorPlan || null;
  });

  floorLabels = computed(() => {
    return this.labels();
  });

  // Derive waiter record for the currently logged-in user (if any)
  get loggedInWaiter() {
    const user = this.auth.currentUser();
    if (!user) return null;
    return this.waiters().find(w => w.userId === user._id) || null;
  }

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
      swapHorizontalOutline, arrowForwardOutline, sendOutline, createOutline
    });
  }

  async ngOnInit() {
    await this.loadData();
  }

  async ionViewWillEnter() {
    await this.loadData();
  }

  async loadData() {
    const terminal = this.auth.currentTerminal();
    const terminalId = terminal?._id;
    const location = terminal?.location;
    // Ensure new hospitality locations start with sensible defaults
    // (e.g. T1–T16) the first time this POS is used.
    if (terminalId && location && terminal?.posMode === 'hospitality') {
      await this.tablesService.ensureDefaultTablesForLocation(terminalId, location);
    } else {
      await this.tablesService.loadTables(terminalId, location);
    }

    await Promise.all([
      this.waitersService.loadWaiters(),
      this.loadProducts()
    ]);

    this.tables.set(this.tablesService.tables());
    this.waiters.set(this.waitersService.getActiveWaiters());

    // Initialize local floor-plan state from the current terminal's config
    const plan = (terminal?.hospitalityConfig as any)?.floorPlan;
    this.labels.set(plan?.labels || []);
    this.floorPlanImageUrl.set(plan?.backgroundImageUrl || null);

    // If logged-in user is a waiter, auto-select them for new tables
    const waiter = this.loggedInWaiter;
    if (waiter && !this.selectedWaiterId()) {
      this.selectedWaiterId.set(waiter._id);
    }
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
      case 'free': return 'primary';
      case 'occupied': return 'danger';
      case 'reserved': return 'warning';
      case 'cleaning': return 'medium';
      default: return 'medium';
    }
  }

  getTableIcon(table: Table): string {
    return table.status === 'occupied' ? 'restaurant-outline' : 'checkmark-outline';
  }

  getLayoutStyle(table: Table) {
    const anyTable: any = table;
    const position = anyTable.position || {};
    let x = 0.1;
    let y = 0.1;

    if (typeof position.x === 'number' && typeof position.y === 'number') {
      x = position.x;
      y = position.y;
    } else if (typeof position.col === 'number' && typeof position.row === 'number') {
      const cols = 4;
      const col = position.col;
      const row = position.row;
      const rows = Math.max(1, Math.ceil(this.tables().length / cols));
      x = (col + 0.5) / cols;
      y = (row + 0.5) / rows;
    } else {
      const list = this.filteredTables();
      const index = list.findIndex(t => t._id === table._id);
      const cols = 4;
      const col = index >= 0 ? index % cols : 0;
      const row = index >= 0 ? Math.floor(index / cols) : 0;
      const rows = Math.max(1, Math.ceil(list.length / cols));
      x = (col + 0.5) / cols;
      y = (row + 0.5) / rows;
    }

    x = Math.min(0.98, Math.max(0.02, x));
    y = Math.min(0.98, Math.max(0.02, y));

    return {
      top: `${y * 100}%`,
      left: `${x * 100}%`
    };
  }

  toggleLayoutEditing() {
    if (this.layoutMode() !== 'layout') {
      this.layoutMode.set('layout');
    }
    this.editingLayout.update(v => !v);
  }

  onTableClick(table: Table) {
    if (this.editingLayout()) {
      return;
    }
    this.selectTable(table);
  }

  startDragTable(event: MouseEvent | TouchEvent, table: Table) {
    if (!this.editingLayout()) return;
    event.preventDefault();
    this.draggingTableId = table._id;
    this.draggingLabelId = null;
  }

  startDragLabel(event: MouseEvent | TouchEvent, label: FloorLabel) {
    if (!this.editingLayout()) return;
    event.preventDefault();
    this.draggingLabelId = label.id;
    this.draggingTableId = null;
  }

  @HostListener('document:mousemove', ['$event'])
  @HostListener('document:touchmove', ['$event'])
  onPointerMove(event: MouseEvent | TouchEvent) {
    if (!this.editingLayout() || !this.floorPlanCanvas) return;
    const coords = this.getPointerCoords(event);
    if (!coords) return;

    const rect = this.floorPlanCanvas.nativeElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    let x = (coords.x - rect.left) / rect.width;
    let y = (coords.y - rect.top) / rect.height;

    x = Math.min(0.98, Math.max(0.02, x));
    y = Math.min(0.98, Math.max(0.02, y));

    if (this.draggingTableId) {
      const tableId = this.draggingTableId;
      this.tables.update(list =>
        list.map(t => (t._id === tableId ? { ...t, position: { x, y } } : t))
      );
    } else if (this.draggingLabelId) {
      const labelId = this.draggingLabelId;
      this.labels.update(list =>
        list.map(l => (l.id === labelId ? { ...l, x, y } : l))
      );
    }
  }

  @HostListener('document:mouseup', ['$event'])
  @HostListener('document:touchend', ['$event'])
  async onPointerEnd(event: MouseEvent | TouchEvent) {
    if (!this.editingLayout()) {
      this.draggingTableId = null;
      this.draggingLabelId = null;
      return;
    }

    if (this.draggingTableId) {
      const tableId = this.draggingTableId;
      const table = this.tables().find(t => t._id === tableId);
      this.draggingTableId = null;
      if (table && table.position) {
        await this.tablesService.updateTable(table);
        await this.loadData();
      }
    } else if (this.draggingLabelId) {
      this.draggingLabelId = null;
      await this.persistLabels();
    }
  }

  private getPointerCoords(event: MouseEvent | TouchEvent): { x: number; y: number } | null {
    if (event instanceof MouseEvent) {
      return { x: event.clientX, y: event.clientY };
    }

    const touch = event.touches && event.touches[0];
    if (touch) {
      return { x: touch.clientX, y: touch.clientY };
    }

    return null;
  }

  addLabel() {
    const type = this.labelType();
    const text = this.labelText().trim();
    const labels = this.labels();

    const newLabel: FloorLabel = {
      id: `label_${Date.now()}_${labels.length + 1}`,
      type,
      text: text || undefined,
      x: 0.1,
      y: 0.1
    };

    this.labels.set([...labels, newLabel]);
    this.labelText.set('');
    this.persistLabels();
  }

  removeLabel(id: string) {
    this.labels.update(list => list.filter(l => l.id !== id));
    this.persistLabels();
  }

  private async persistLabels() {
    const terminal = this.auth.currentTerminal();
    if (!terminal) {
      return;
    }

    const labels = this.labels();
    const imageUrl = this.floorPlanImageUrl();

    const baseConfig: Terminal['hospitalityConfig'] = terminal.hospitalityConfig
      ? { ...terminal.hospitalityConfig }
      : {
          type: 'restaurant',
          enableTableManagement: true,
          enableWaiterAssignment: true,
          enableCourseTiming: false,
          printers: {}
        };

    const currentPlan = (baseConfig as any).floorPlan || {};

    const updatedTerminal: Terminal = {
      ...terminal,
      hospitalityConfig: {
        ...baseConfig,
        floorPlan: {
          ...currentPlan,
          backgroundImageUrl: imageUrl ?? undefined,
          labels
        }
      }
    };

    await this.terminalsService.updateTerminal(updatedTerminal);
  }

  onFloorImageFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      this.floorPlanImageUrl.set(result);
      this.persistLabels();
    };
    reader.readAsDataURL(file);
  }

  clearFloorImage() {
    this.floorPlanImageUrl.set(null);
    this.persistLabels();
  }

  triggerFloorImagePicker(input: HTMLInputElement) {
    input.click();
  }

  selectTable(table: Table) {
    this.selectedTable.set(table);

    const movingFromId = this.hospitalityContext.movingFromTableId();

    // If we are in the middle of a Change Table flow, treat the
    // first compatible table the user clicks as the destination
    // for the move and carry the active session over.
    if (movingFromId && table._id !== movingFromId) {
      this.handleChangeTableDestination(movingFromId, table);
      return;
    }

    if (table.status === 'free') {
      this.showTableModal.set(true);
    } else if (table.status === 'occupied') {
      this.openTableInCategoryPos(table);
    }
  }

  private async handleChangeTableDestination(sourceTableId: string, targetTable: Table) {
    try {
      await this.tablesService.moveSessionToTable(sourceTableId, targetTable._id);
      await this.loadData();

      const updatedTarget = this.tables().find(t => t._id === targetTable._id);
      if (updatedTarget) {
        // Clear the pending move flag and start a new POS session
        this.hospitalityContext.startFromTable(updatedTarget);
        this.cartService.replaceItems(updatedTarget.items || []);
        this.router.navigate(['/pos-category']);
      }
    } catch (error) {
      console.error('Error moving table session:', error);
    } finally {
      this.hospitalityContext.movingFromTableId.set(null);
    }
  }

  private openTableInCategoryPos(table: Table) {
    // Store hospitality context for use in POS and checkout
    this.hospitalityContext.startFromTable(table);

    // Adopt the table's items into the main cart workflow
    this.cartService.replaceItems(table.items || []);

    // Navigate to the shared category POS screen
    this.router.navigate(['/pos-category']);
  }

  async occupyTable() {
    const table = this.selectedTable();
    if (!table) return;
    let waiter = this.waiters().find(w => w._id === this.selectedWaiterId());

    // If no waiter explicitly selected and logged-in user is a waiter, use them
    if (!waiter && this.loggedInWaiter) {
      waiter = this.loggedInWaiter;
      this.selectedWaiterId.set(waiter._id);
    }

    try {
      await this.tablesService.occupyTable(
        table._id,
        this.guestName(),
        this.guestCount(),
        waiter?._id,
        waiter?.name
      );

      await this.loadData();

      // After opening a new table, jump straight into the
      // unified category POS workflow for selling.
      const updatedTable = this.tables().find(t => t._id === table._id);
      if (updatedTable) {
        // Close the modal before navigating so the overlay
        // is fully torn down and does not remain on top of
        // the category POS screen.
        this.closeOccupyTableModal();
        this.openTableInCategoryPos(updatedTable);
      }
    } catch (error) {
      console.error('Error occupying table:', error);
    } finally {
      this.resetTableForm();
      // Ensure modal state is cleared even if navigation
      // did not happen for some reason.
      this.showTableModal.set(false);
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

    // Print kitchen tickets using terminal + category-based mappings
    if (newItems.length > 0) {
      const terminal = this.auth.currentTerminal() as Terminal | null;

      if (terminal) {
        const printerItemMap = new Map<string, CartItem[]>();

        for (const item of newItems) {
          const category = (item as any).category || item.product?.category;
          const kitchenPrinters = this.terminalsService.getKitchenPrinters(terminal, category);

          // If there is a specific kitchen printer mapping for this category,
          // send the item there. Otherwise, fall back to the terminal's
          // configured receipt/default printer (or global default).
          const targetPrinters = kitchenPrinters.length
            ? kitchenPrinters
            : (this.terminalsService.getReceiptPrinter(terminal)
                ? [this.terminalsService.getReceiptPrinter(terminal) as string]
                : []);

          if (targetPrinters.length === 0) {
            // No mapping at all: items will be printed via the global default
            // by calling printKitchenTickets without a specific target below.
            continue;
          }

          for (const printerId of targetPrinters) {
            if (!printerItemMap.has(printerId)) {
              printerItemMap.set(printerId, []);
            }
            printerItemMap.get(printerId)!.push(item);
          }
        }

        if (printerItemMap.size > 0) {
          for (const [printerId, items] of printerItemMap.entries()) {
            await this.printService.printKitchenTickets({
              table: {
                number: table.number,
                guestName: table.guestName,
                guestCount: table.guestCount,
                waiterName: table.waiterName
              },
              items
            }, printerId);
          }
        } else {
          // Fallback to previous behaviour: single ticket via default printer
          await this.printService.printKitchenTickets({
            table: {
              number: table.number,
              guestName: table.guestName,
              guestCount: table.guestCount,
              waiterName: table.waiterName
            },
            items: newItems
          });
        }
      } else {
        // No terminal context; keep legacy single-printer behaviour
        await this.printService.printKitchenTickets({
          table: {
            number: table.number,
            guestName: table.guestName,
            guestCount: table.guestCount,
            waiterName: table.waiterName
          },
          items: newItems
        });
      }
    }
    
    this.showNewOrderModal.set(false);
    this.orderItems.set([]);
  }

  async saveOrder() {
    const table = this.selectedTable();
    if (!table) return;

    // Persist the current order items as the full table state to avoid duplicates
    const updatedTable: Table = {
      ...table,
      items: [...this.orderItems()],
      amount: this.orderTotal()
    };

    await this.tablesService.updateTable(updatedTable);
    await this.loadData();

    this.showNewOrderModal.set(false);
    this.orderItems.set([]);
  }

  openCheckout(table: Table) {
    this.selectedTable.set(table);
    this.amountPaid.set(table.amount);
    // Ensure order modal is closed when moving into checkout
    this.showNewOrderModal.set(false);
    // Use the unified checkout flow so that printing, receipt
    // options, and table clearing follow the same logic as
    // the main POS checkout page.
    this.hospitalityContext.startFromTable(table);
    this.cartService.replaceItems(table.items || []);
    this.router.navigate(['/checkout']);
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
    // The completePayment logic is now handled in the shared checkout page.
    // This method can be removed or modified as needed.

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

  closeOccupyTableModal() {
    this.showTableModal.set(false);
    if (this.occupyTableModal) {
      this.occupyTableModal.dismiss();
    }
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

  exitToMainPos() {
    this.router.navigate(['/pos']);
  }

  goToTablesManagement() {
    this.router.navigate(['/tables']);
  }
}
