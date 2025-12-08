import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonBackButton,
  IonButtons,
  IonTextarea,
  AlertController,
  ToastController,
  LoadingController,
  NavController,
  MenuController,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cash, card, person, arrowBack, checkmark, close } from 'ionicons/icons';

import { CartService } from '../../core/services/cart.service';
import { OrdersService } from '../../core/services/orders.service';
import { PrintService } from '../../core/services/print.service';
import { AuthService } from '../../core/services/auth.service';
import { SettingsService } from '../../core/services/settings.service';
import { CustomersService } from '../../core/services/customers.service';
import { ReceiptData, Customer } from '../../models';
import { CustomerSelectModalComponent } from './customer-select-modal/customer-select-modal.component';
import { ReceiptModalComponent } from './receipt-modal/receipt-modal.component';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.page.html',
  styleUrls: ['./checkout.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonText,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonBackButton,
    IonButtons,
    IonTextarea
  ]
})
export class CheckoutPage implements OnInit {
  private router = inject(Router);
  private navCtrl = inject(NavController);
  private cartService = inject(CartService);
  private ordersService = inject(OrdersService);
  private printService = inject(PrintService);
  private authService = inject(AuthService);
  private settingsService = inject(SettingsService);
  private customersService = inject(CustomersService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  private menuCtrl = inject(MenuController);
  private modalCtrl = inject(ModalController);

  // Cart data
  cartItems = this.cartService.cartItems;
  cartSummary = this.cartService.summary;

  // Payment state
  paymentType = signal<'cash' | 'card' | 'account' | 'mobile'>('cash');
  amountPaid = signal<number>(0);
  customerNotes = signal<string>('');
  selectedCustomer = signal<Customer | null>(null);

  // Computed
  change = computed(() => {
    const paid = this.amountPaid();
    const total = this.cartSummary().total;
    return Math.max(0, paid - total);
  });

  insufficientPayment = computed(() => {
    return this.amountPaid() < this.cartSummary().total && this.paymentType() !== 'account';
  });

  constructor() {
    this.registerIcons();
  }

  private registerIcons() {
    addIcons({ 
      cash, 
      card, 
      person, 
      'arrow-back': arrowBack, 
      checkmark, 
      close 
    });
  }

  ngOnInit() {
    // Close the menu
    this.menuCtrl.close();
    
    // Check if cart has items
    if (!this.cartService.hasItems()) {
      this.showToast('Cart is empty');
      this.router.navigate(['/pos-category']);
      return;
    }

    // Start with 0, user enters the amount they're paying
    this.amountPaid.set(0);
  }

  addDigit(digit: string) {
    const current = this.amountPaid().toString();
    
    // Handle decimal point - only allow one
    if (digit === '.' && current.includes('.')) {
      return;
    }
    
    // Prevent leading zeros except for decimal
    if (current === '0' && digit !== '.') {
      this.amountPaid.set(parseFloat(digit));
      return;
    }
    
    const newValue = current + digit;
    this.amountPaid.set(parseFloat(newValue));
  }

  setAmount(amount: number) {
    this.amountPaid.set(amount);
  }

  clearAmount() {
    this.amountPaid.set(0);
  }

  backspace() {
    const current = this.amountPaid().toString();
    if (current.length <= 1) {
      this.amountPaid.set(0);
      return;
    }
    const newValue = current.slice(0, -1);
    this.amountPaid.set(parseFloat(newValue) || 0);
  }

  selectPaymentType(type: 'cash' | 'card' | 'account' | 'mobile') {
    this.paymentType.set(type);
  }

  async payWithMethod(method: 'cash' | 'card' | 'account' | 'mobile') {
    this.selectPaymentType(method);
    
    // If account payment, show customer selection
    if (method === 'account') {
      const modal = await this.modalCtrl.create({
        component: CustomerSelectModalComponent,
        componentProps: {
          totalAmount: this.cartSummary().total
        }
      });

      await modal.present();
      const { data, role } = await modal.onWillDismiss();

      if (role === 'selected' && data) {
        this.selectedCustomer.set(data);
        // Set amount to total for account payment
        this.amountPaid.set(this.cartSummary().total);
        await this.processPayment();
      }
      return;
    }
    
    const amountEntered = this.amountPaid();
    if (amountEntered <= 0) {
      this.showToast('Please enter an amount');
      return;
    }

    // Allow partial payments - process whatever amount was entered
    await this.processPayment();
  }

  setExactAmount() {
    this.amountPaid.set(this.cartSummary().total);
  }

  addQuickAmount(amount: number) {
    this.amountPaid.set(this.amountPaid() + amount);
  }

  async processPayment() {
    if (this.insufficientPayment()) {
      this.showToast('Insufficient payment amount');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Processing payment...'
    });
    await loading.present();

    try {
      // Prepare order data
      const orderData: any = {
        paymentType: this.paymentType(),
        amountPaid: this.amountPaid(),
        notes: this.customerNotes()
      };

      // Add customer info if account payment
      if (this.paymentType() === 'account' && this.selectedCustomer()) {
        orderData.customer = this.selectedCustomer();
        orderData.customerId = this.selectedCustomer()?._id;
      }

      const order = await this.ordersService.createOrder(orderData);

      // If account payment, add to customer balance
      if (this.paymentType() === 'account' && this.selectedCustomer()) {
        await this.customersService.addCredit(
          this.selectedCustomer()!._id,
          this.cartSummary().total
        );
      }

      await loading.dismiss();

      // Auto-print if printer is enabled
      const settings = this.settingsService.settings();
      if (settings.printerEnabled && settings.autoPrintReceipt) {
        await this.printReceipt(order.orderNumber || '');
      }

      // Show formatted receipt dialog
      await this.showReceiptDialog(order._id, order.orderNumber || '');

      // Navigate back to POS
      this.router.navigate(['/pos-category']);
    } catch (error) {
      await loading.dismiss();
      console.error('Payment error:', error);
      this.showToast(error instanceof Error ? error.message : 'Error processing payment. Please try again.');
    }
  }

  async showReceiptDialog(orderId: string, orderNumber: string) {
    try {
      // Get the completed order
      const order = await this.ordersService.getOrder(orderId);
      if (!order) {
        this.showToast('Order not found');
        return;
      }

      // Get business info
      const businessSettings = await this.authService.getBusinessSettings();
      const businessName = businessSettings?.businessName || 'ZPOS';

      // Show receipt modal
      const modal = await this.modalCtrl.create({
        component: ReceiptModalComponent,
        componentProps: {
          order: order,
          businessName: businessName,
          onPrint: () => this.printReceipt(orderNumber),
          onWhatsApp: () => this.shareViaWhatsApp(order, businessName),
          onEmail: () => this.shareViaEmail(order, businessName, orderNumber)
        },
        cssClass: 'receipt-modal'
      });

      await modal.present();
    } catch (error) {
      console.error('Error showing receipt:', error);
      this.showToast('Error displaying receipt');
    }
  }

  private getPlainReceiptText(order: any, businessName: string): string {
    const date = new Date(order.createdAt).toLocaleString();
    let text = `${businessName}\n`;
    text += `${date}\n`;
    text += `Order #${order.orderNumber || order.invoice_no}\n`;
    text += `${'='.repeat(40)}\n`;

    // Items
    order.items.forEach((item: any) => {
      const name = item.name || item.product?.name || 'Item';
      const qty = item.quantity || item.Quantity || 1;
      const total = item.total || item.itemTotalPrice || 0;
      text += `${qty}x ${name} - ${total.toFixed(2)}\n`;
    });

    text += `${'='.repeat(40)}\n`;
    text += `Subtotal: ${(order.subtotal || order.subTotalPrice || 0).toFixed(2)}\n`;
    
    if (order.tax || order.taxAmount) {
      text += `Tax: ${(order.tax || order.taxAmount).toFixed(2)}\n`;
    }
    
    if (order.discount || order.discountAmount) {
      text += `Discount: -${(order.discount || order.discountAmount).toFixed(2)}\n`;
    }
    
    text += `TOTAL: ${(order.total || order.grandTotal || 0).toFixed(2)}\n`;
    text += `Paid (${order.paymentMethod || order.paymentOption}): ${(order.amountPaid || 0).toFixed(2)}\n`;
    
    if (order.change && order.change > 0) {
      text += `Change: ${order.change.toFixed(2)}\n`;
    }
    
    text += `\nThank you for your business!`;
    return text;
  }

  async shareViaWhatsApp(order: any, businessName: string) {
    try {
      const receiptText = this.getPlainReceiptText(order, businessName);
      
      const encodedText = encodeURIComponent(receiptText);
      const whatsappUrl = `https://wa.me/?text=${encodedText}`;
      
      window.open(whatsappUrl, '_blank');
      this.showToast('Opening WhatsApp...');
    } catch (error) {
      console.error('WhatsApp share error:', error);
      this.showToast('Error sharing via WhatsApp');
    }
  }

  async shareViaEmail(order: any, businessName: string, orderNumber: string) {
    try {
      const receiptText = this.getPlainReceiptText(order, businessName);
      
      const subject = encodeURIComponent(`Receipt - Order #${orderNumber}`);
      const body = encodeURIComponent(receiptText);
      const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
      
      window.open(mailtoUrl, '_blank');
      this.showToast('Opening email client...');
    } catch (error) {
      console.error('Email share error:', error);
      this.showToast('Error sharing via email');
    }
  }

  async printReceipt(orderNumber: string) {
    try {
      // Get the completed order
      const order = await this.ordersService.getOrder(`ORD_${orderNumber}`);
      
      if (!order) {
        this.showToast('Order not found');
        return;
      }

      // Build receipt data
      const receiptData: ReceiptData = {
        orderId: order._id,
        orderNumber: order.orderNumber || order.invoice_no || orderNumber,
        timestamp: order.timestamp || new Date(order.createdAt).toISOString(),
        user: order.user || order.createdBy,
        items: order.items.map(item => ({
          name: item.name || item.product.name,
          quantity: item.quantity || item.Quantity,
          price: item.price,
          total: item.total || item.itemTotalPrice
        })),
        subtotal: order.subtotal || order.subTotalPrice || 0,
        tax: order.tax || order.taxAmount || 0,
        discount: order.discount || order.discountAmount || 0,
        total: order.total || order.grandTotal || 0,
        amountPaid: order.amountPaid,
        change: order.change,
        paymentMethod: order.paymentMethod || order.paymentOption || '',
        payments: order.payment?.map(p => ({
          paymentOption: p.type,
          type: p.type,
          amount: p.amount
        })),
        customer: order.customer,
        notes: order.notes
      };

      const success = await this.printService.printReceipt(receiptData);
      
      if (success) {
        this.showToast('Receipt printed successfully');
      } else {
        this.showToast('Printing failed or printer not configured');
      }
    } catch (error) {
      console.error('Print error:', error);
      this.showToast('Error printing receipt');
    }
  }

  async cancelCheckout() {
    const alert = await this.alertCtrl.create({
      header: 'Cancel Checkout',
      message: 'Are you sure you want to cancel? Your cart will be preserved.',
      buttons: [
        {
          text: 'Stay',
          role: 'cancel'
        },
        {
          text: 'Cancel Checkout',
          role: 'destructive',
          handler: () => {
            this.navCtrl.back();
          }
        }
      ]
    });

    await alert.present();
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
