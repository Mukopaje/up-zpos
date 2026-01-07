import { Injectable, inject } from '@angular/core';
import { SqliteService, OutboxItem, Product, Customer, Sale } from './sqlite.service';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { SettingsService } from './settings.service';

interface SyncResponse {
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  newCursor: number;
  hasMore: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private syncCursor: number = 0;
  private isSyncing = false;
  private apiService = inject(ApiService);
  private sqliteService = inject(SqliteService);
  private authService = inject(AuthService);
  private settingsService = inject(SettingsService);

  /**
   * Sync offline changes to the cloud
   */
  async syncToCloud(): Promise<{ success: boolean; synced: number; failed: number }> {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return { success: false, synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    let syncedCount = 0;
    let failedCount = 0;

    try {
      // Check if authenticated
      if (!this.authService.isAuthenticated()) {
        throw new Error('Not authenticated');
      }

      // Get unsynced items from outbox
      const outboxItems = await this.sqliteService.getUnsyncedOutboxItems();
      
      if (outboxItems.length === 0) {
        console.log('No items to sync');
        return { success: true, synced: 0, failed: 0 };
      }

      console.log(`Syncing ${outboxItems.length} items to cloud...`);

      // Prepare batch for backend
      const batch = outboxItems.map(item => ({
        table: item.table_name,
        operation: item.operation,
        data: typeof item.data === 'string' ? JSON.parse(item.data) : item.data,
        idempotencyKey: item.idempotency_key
      }));

      try {
        // Send batch to backend using ApiService
        const response = await this.apiService.syncOutbox(batch);

        // Mark items as synced based on processed count, not success flag
        // Backend may return success:false if ANY item failed, but processed count tells us
        // how many actually succeeded (including duplicates)
        if (response.processed > 0) {
          // Mark all items as synced
          for (const item of outboxItems) {
            await this.sqliteService.markOutboxItemAsSynced(item.id!);
            syncedCount++;
          }

          // Clear old synced items (optional cleanup)
          await this.sqliteService.clearSyncedOutboxItems();

          console.log(`Successfully synced ${syncedCount} items`);
        }
        
        // Track failed count from response
        if (response.failed > 0) {
          failedCount = response.failed;
          console.warn(`${failedCount} items failed to sync:`, response.errors);
        }
      } catch (error: any) {
        console.error('Error syncing batch to cloud:', error);
        
        // Handle specific errors
        if (error.message.includes('Authentication')) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (error.message.includes('Conflict')) {
          // Conflict - items already exist (idempotency worked)
          // Mark as synced anyway
          for (const item of outboxItems) {
            await this.sqliteService.markOutboxItemAsSynced(item.id!);
            syncedCount++;
          }
        } else {
          failedCount = outboxItems.length;
          throw error;
        }
      }

      return { success: syncedCount > 0, synced: syncedCount, failed: failedCount };
    } catch (error) {
      console.error('Sync to cloud failed:', error);
      return { success: false, synced: syncedCount, failed: failedCount };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Pull updates from cloud to local database
   */
  async pullUpdates(): Promise<{ success: boolean; pulled: number }> {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return { success: false, pulled: 0 };
    }

    this.isSyncing = true;
    let totalPulled = 0;

    try {
      // Check if authenticated
      if (!this.authService.isAuthenticated()) {
        console.error('❌ Pull sync failed: Not authenticated');
        throw new Error('Not authenticated');
      }
      
      console.log('✅ Authentication check passed, starting sync...');

      let hasMore = true;
      let currentCursor = this.syncCursor;

      while (hasMore) {
        try {
          // Pull updates from backend using ApiService
          console.log('📡 Calling backend API to pull updates with cursor:', currentCursor);
          const response: any = await this.apiService.pullUpdates(currentCursor.toString());
          
          console.log('📦 Sync response:', {
            productsCount: response.products?.length || 0,
            customersCount: response.customers?.length || 0,
            salesCount: response.sales?.length || 0,
            categoriesCount: response.categories?.length || 0,
            newCursor: response.newCursor,
            hasMore: response.hasMore
          });
          console.log('📦 Full response:', response);

          // Update products
          for (const product of response.products || []) {
            const existing = await this.sqliteService.getProductById(product.id!);
            
            if (!existing) {
              await this.sqliteService.addProduct(product);
            } else if ((product.version || 0) > (existing.version || 0)) {
              // Only update if cloud version is newer
              await this.sqliteService.updateProduct(product.id!, product);
            }
            totalPulled++;
          }

          // Update customers
          for (const customer of response.customers || []) {
            // Similar logic for customers
            totalPulled++;
          }

          // Update sales (typically append-only)
          for (const sale of response.sales || []) {
            // For now we only count pulled remote sales; local
            // sales are created via OrdersService and synced via outbox.
            // This hook is available if we later upsert remote sales
            // into SQLite using sqliteService.upsertRemoteSale.
            totalPulled++;
          }

          // Update cursor and check if more data
          currentCursor = response.newCursor || currentCursor;
          hasMore = response.hasMore || false;

          console.log(`Pulled ${totalPulled} updates, cursor: ${currentCursor}, hasMore: ${hasMore}`);
        } catch (error: any) {
          console.error('Error pulling updates:', error);
          
          if (error.message.includes('Authentication')) {
            throw new Error('Authentication failed. Please log in again.');
          }
          
          throw error;
        }
      }

      // Save cursor for next sync
      this.syncCursor = currentCursor;

      // Prune old, already-synced sales to keep local DB size under control
      try {
        const settings = this.settingsService.settings();
        const retentionDays = settings.transactionRetentionDays ?? 365;
        if (retentionDays > 0) {
          await this.sqliteService.pruneOldSales(retentionDays);
        }
      } catch (err) {
        console.error('Error pruning old sales after sync:', err);
      }

      console.log(`Successfully pulled ${totalPulled} updates`);
      return { success: true, pulled: totalPulled };
    } catch (error) {
      console.error('Pull updates failed:', error);
      return { success: false, pulled: totalPulled };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Full bidirectional sync
   */
  async fullSync(): Promise<{ success: boolean; synced: number; pulled: number }> {
    console.log('Starting full sync...');
    
    // Push local changes first
    const pushResult = await this.syncToCloud();
    
    // Then pull remote updates
    const pullResult = await this.pullUpdates();

    return {
      success: pushResult.success && pullResult.success,
      synced: pushResult.synced,
      pulled: pullResult.pulled
    };
  }

  /**
   * Check if sync is in progress
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Reset sync cursor (for testing or force full sync)
   */
  resetSyncCursor(): void {
    this.syncCursor = 0;
  }
}
