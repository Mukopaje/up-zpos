import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons,
  IonIcon, IonList, IonItem, IonLabel, IonBadge, IonCard, IonCardContent,
  IonRefresher, IonRefresherContent, IonChip, IonSpinner, IonNote
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  restaurantOutline, timeOutline, personOutline, checkmarkCircleOutline,
  refreshOutline, fastFoodOutline, wineOutline, cafeOutline
} from 'ionicons/icons';
import { TablesService } from '../../core/services/tables.service';
import { Table, CartItem } from '../../models';

@Component({
  selector: 'app-kitchen-display',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons,
    IonIcon, IonList, IonItem, IonLabel, IonBadge, IonCard, IonCardContent,
    IonRefresher, IonRefresherContent, IonChip, IonSpinner, IonNote
  ],
  templateUrl: './kitchen-display.page.html',
  styleUrls: ['./kitchen-display.page.scss']
})
export class KitchenDisplayPage {
  private tablesService = inject(TablesService);

  // Active orders from occupied tables
  orders = computed(() => {
    return this.tablesService.tables()
      .filter(t => t.status === 'occupied' && t.items && t.items.length > 0)
      .map(t => ({
        tableId: t._id,
        tableNumber: t.number,
        waiterName: t.waiterName,
        startTime: t.startTime,
        items: t.items.filter(item => item.sentToKitchen)
      }))
      .filter(o => o.items.length > 0)
      .sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
  });

  constructor() {
    addIcons({
      restaurantOutline, timeOutline, personOutline, checkmarkCircleOutline,
      refreshOutline, fastFoodOutline, wineOutline, cafeOutline
    });
  }

  async ngOnInit() {
    await this.refresh();
  }

  async refresh(event?: any) {
    await this.tablesService.loadTables();
    if (event) event.target.complete();
  }

  async markItemReady(tableId: string, itemIndex: number) {
    // Logic to mark specific item as ready
    // For now we just log, implementation requires updating Table items status
    console.log('Marking item ready:', tableId, itemIndex);
  }

  getElapsedTime(startTime?: number): string {
    if (!startTime) return '0m';
    const elapsed = Date.now() - startTime;
    return `${Math.floor(elapsed / 60000)}m`;
  }

  getWaitTimeColor(startTime?: number): string {
    if (!startTime) return 'success';
    const minutes = Math.floor((Date.now() - startTime) / 60000);
    if (minutes > 20) return 'danger';
    if (minutes > 10) return 'warning';
    return 'success';
  }
}
