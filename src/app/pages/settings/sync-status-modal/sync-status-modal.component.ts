import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonSpinner,
  ModalController,
  LoadingController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  cloudUploadOutline,
  cloudDownloadOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  refreshOutline
} from 'ionicons/icons';

import { SqliteService } from '../../../core/services/sqlite.service';
import { StorageService } from '../../../core/services/storage.service';
import { SyncService } from '../../../core/services/sync.service';
import { ProductsService } from '../../../core/services/products.service';

@Component({
  selector: 'app-sync-status-modal',
  templateUrl: './sync-status-modal.component.html',
  styleUrls: ['./sync-status-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonButtons,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonSpinner
  ]
})
export class SyncStatusModalComponent implements OnInit {
  private modalCtrl = inject(ModalController);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);
  private sqlite = inject(SqliteService);
  private storage = inject(StorageService);
  private syncService = inject(SyncService);
  private productsService = inject(ProductsService);

  isLoading = signal(true);
  
  // Local database stats
  productsCount = signal(0);
  categoriesCount = signal(0);
  customersCount = signal(0);
  salesCount = signal(0);
  unsyncedCount = signal(0);

  // Authentication status
  hasToken = signal(false);
  hasTenantId = signal(false);
  hasUserId = signal(false);
  tenantId = signal<string>('');

  constructor() {
    addIcons({
      closeOutline,
      cloudUploadOutline,
      cloudDownloadOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      refreshOutline
    });
  }

  async ngOnInit() {
    await this.loadSyncStatus();
  }

  async loadSyncStatus() {
    this.isLoading.set(true);

    try {
      await this.sqlite.ensureInitialized();
      
      // Get local data counts
      const products = await this.sqlite.getProducts();
      const categories = await this.sqlite.getCategories();
      const customers = await this.sqlite.getCustomers();
      const sales = await this.sqlite.getSales(10000);
      const unsynced = await this.sqlite.getUnsyncedOutboxItems();
      
      this.productsCount.set(products.length);
      this.categoriesCount.set(categories.length);
      this.customersCount.set(customers.length);
      this.salesCount.set(sales.length);
      this.unsyncedCount.set(unsynced.length);

      // Get authentication info
      const token = await this.storage.get<string>('token');
      const tenantId = await this.storage.get<string>('tenantId');
      const userId = await this.storage.get<string>('userId');
      
      this.hasToken.set(!!token);
      this.hasTenantId.set(!!tenantId);
      this.hasUserId.set(!!userId);
      this.tenantId.set(tenantId || '');

    } catch (error) {
      console.error('Error loading sync status:', error);
      await this.showToast('Failed to load sync status', 'danger');
    } finally {
      this.isLoading.set(false);
    }
  }

  async syncFromCloud() {
    const loading = await this.loadingCtrl.create({
      message: 'Pulling data from cloud...'
    });
    await loading.present();

    try {
      const result = await this.syncService.pullUpdates();
      
      await loading.dismiss();

      if (result.success) {
        await this.showToast(`Successfully synced ${result.pulled} items from cloud`, 'success');
        
        // Reload data
        await this.productsService.loadProducts();
        await this.productsService.loadCategories();
        
        // Refresh status
        await this.loadSyncStatus();
      } else {
        await this.showToast('Sync completed but no data was pulled', 'warning');
      }
    } catch (error: any) {
      await loading.dismiss();
      console.error('Sync from cloud error:', error);
      await this.showToast('Failed to sync from cloud: ' + (error.message || error), 'danger');
    }
  }

  async syncToCloud() {
    const loading = await this.loadingCtrl.create({
      message: 'Pushing data to cloud...'
    });
    await loading.present();

    try {
      const result = await this.syncService.syncToCloud();
      
      await loading.dismiss();

      if (result.success) {
        await this.showToast(`Successfully synced ${result.synced} items to cloud`, 'success');
        await this.loadSyncStatus();
      } else {
        await this.showToast(`Sync completed: ${result.synced} synced, ${result.failed} failed`, 'warning');
      }
    } catch (error: any) {
      await loading.dismiss();
      console.error('Sync to cloud error:', error);
      await this.showToast('Failed to sync to cloud: ' + (error.message || error), 'danger');
    }
  }

  close() {
    this.modalCtrl.dismiss();
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger' = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
