import { Component, OnInit, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonText,
  IonItem,
  IonLabel,
  IonInput,
  ModalController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close, print, logoWhatsapp, mail } from 'ionicons/icons';

@Component({
  selector: 'app-receipt-modal',
  templateUrl: './receipt-modal.component.html',
  styleUrls: ['./receipt-modal.component.scss'],
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
    IonText,
    IonItem,
    IonLabel,
    IonInput
  ]
})
export class ReceiptModalComponent implements OnInit {
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);

  // Props from parent
  @Input() order: any;
  @Input() businessName: string = 'ZPOS';
  @Input() onPrint?: () => void;
  @Input() onWhatsApp?: () => void;
  @Input() onEmail?: (email?: string) => void;

  // Optional initial email address to pre-fill when the modal
  // opens (e.g. from the selected customer in checkout).
  @Input() initialEmail: string | null = null;

  emailAddress: string = '';

  constructor() {
    addIcons({ close, print, logoWhatsapp, mail });
  }

  ngOnInit() {
    if (this.initialEmail) {
      this.emailAddress = this.initialEmail;
    }
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  handlePrint() {
    if (this.onPrint) {
      this.onPrint();
    }
  }

  handleWhatsApp() {
    if (this.onWhatsApp) {
      this.onWhatsApp();
    }
  }

  async handleEmail() {
    if (!this.onEmail) {
      return;
    }

    const email = this.emailAddress.trim();
    if (!email) {
      const toast = await this.toastCtrl.create({
        message: 'Enter an email address first',
        duration: 2000,
        position: 'bottom'
      });
      await toast.present();
      return;
    }

    this.onEmail(email);
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  getItemName(item: any): string {
    return item.name || item.product?.name || 'Item';
  }

  getItemQuantity(item: any): number {
    return item.quantity || item.Quantity || 1;
  }

  getItemTotal(item: any): number {
    const qty = this.getItemQuantity(item);
    const price = item.price || 0;
    return item.total || item.itemTotalPrice || (qty * price);
  }

  getSubtotal(): number {
    return this.order.subtotal || this.order.subTotalPrice || 0;
  }

  getTax(): number {
    return this.order.tax || this.order.taxAmount || 0;
  }

  getDiscount(): number {
    return this.order.discount || this.order.discountAmount || 0;
  }

  getTotal(): number {
    return this.order.total || this.order.grandTotal || 0;
  }

  getAmountPaid(): number {
    return this.order.amountPaid || 0;
  }

  getChange(): number {
    return this.order.change || 0;
  }

  getPaymentMethod(): string {
    return this.order.paymentMethod || this.order.paymentOption || 'Cash';
  }
}
