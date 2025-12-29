import { Injectable, signal, inject } from '@angular/core';
import { Platform } from '@ionic/angular/standalone';
import PouchDB from 'pouchdb-browser';
import PouchDBFind from 'pouchdb-find';
import { environment } from '../../../environments/environment';

// Register PouchDB plugins
PouchDB.plugin(PouchDBFind);

@Injectable({
  providedIn: 'root'
})
export class DbService {
  private platform = inject(Platform);
  
  private db: PouchDB.Database | null = null;
  private remoteDb: PouchDB.Database | null = null;
  
  // Reactive state
  isReady = signal<boolean>(false);
  isSyncing = signal<boolean>(false);

  constructor() {
    this.initDB();
  }

  async initDB(): Promise<void> {
    try {
      // Initialize local database
      const dbOptions: PouchDB.Configuration.DatabaseConfiguration = {
        auto_compaction: true
      };

      // Use IndexedDB for browser, default for Capacitor
      if (!this.platform.is('capacitor')) {
        dbOptions.adapter = 'idb';
      }

      this.db = new PouchDB(environment.dbName, dbOptions);

      // Create indexes for common queries
      await this.createIndexes();

      this.isReady.set(true);
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  private async createIndexes(): Promise<void> {
    if (!this.db) return;

    try {
      // Create indexes for common queries
      await this.db.createIndex({
        index: { fields: ['type', 'createdAt'] }
      });

      await this.db.createIndex({
        index: { fields: ['type', 'status'] }
      });

      await this.db.createIndex({
        index: { fields: ['barcode'] }
      });

      await this.db.createIndex({
        index: { fields: ['type', 'firstName'] }
      });

      await this.db.createIndex({
        index: { fields: ['type', 'name'] }
      });

      console.log('Database indexes created');
    } catch (error) {
      console.error('Error creating indexes:', error);
    }
  }

  async setupSync(remoteUrl: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.remoteDb = new PouchDB(remoteUrl);

    // Setup continuous sync
    this.db.sync(this.remoteDb, {
      live: true,
      retry: true
    })
    .on('change', (info: any) => {
      console.log('Sync change:', info);
    })
    .on('paused', (err: any) => {
      this.isSyncing.set(false);
      console.log('Sync paused:', err);
    })
    .on('active', () => {
      this.isSyncing.set(true);
      console.log('Sync active');
    })
    .on('error', (err: any) => {
      console.error('Sync error:', err);
    });
  }

  async get<T>(id: string): Promise<T | null> {
    if (!this.db) return null;

    try {
      const doc = await this.db.get(id);
      return doc as T;
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async put<T extends PouchDB.Core.IdMeta>(doc: T): Promise<T> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.put(doc);
    return { ...doc, _rev: result.rev };
  }

  async delete(doc: PouchDB.Core.IdMeta & PouchDB.Core.GetMeta): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.remove(doc);
  }

  async find<T>(selector: PouchDB.Find.Selector): Promise<T[]> {
    if (!this.db) return [];

    try {
      const result = await this.db.find({
        selector,
        limit: 1000
      });
      return result.docs as T[];
    } catch (error) {
      console.error('Find error:', error);
      return [];
    }
  }

  async allDocs<T>(options?: PouchDB.Core.AllDocsOptions): Promise<T[]> {
    if (!this.db) return [];

    try {
      const result = await this.db.allDocs({
        include_docs: true,
        ...options
      });
      return result.rows.map((row: any) => row.doc as T);
    } catch (error) {
      console.error('AllDocs error:', error);
      return [];
    }
  }

  async bulkDocs<T extends PouchDB.Core.IdMeta>(docs: T[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.bulkDocs(docs);
  }

  async query<T extends {} = any>(
    fun: string | PouchDB.Map<any, any> | PouchDB.Find.FindRequest<T>,
    options?: PouchDB.Query.Options<any, any>
  ): Promise<PouchDB.Find.FindResponse<T> | T[]> {
    if (!this.db) return [];

    try {
      // Check if it's a find request (has selector property)
      if (typeof fun === 'object' && 'selector' in fun) {
        const result = await this.db.find(fun as PouchDB.Find.FindRequest<T>);
        return result as PouchDB.Find.FindResponse<T>;
      }
      
      // Otherwise it's a regular query
      const result = await this.db.query(fun as any, options);
      return result.rows.map((row: any) => row.value as T);
    } catch (error) {
      console.error('Query error:', error);
      return [];
    }
  }

  async compact(): Promise<void> {
    if (!this.db) return;
    await this.db.compact();
  }

  async destroy(): Promise<void> {
    if (!this.db) return;
    await this.db.destroy();
    this.db = null;
    this.isReady.set(false);
  }
}
