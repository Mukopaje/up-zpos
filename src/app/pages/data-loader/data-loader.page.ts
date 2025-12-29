import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent,
  IonSpinner,
  IonText,
  IonProgressBar
} from '@ionic/angular/standalone';

import { SettingsService } from '../../core/services/settings.service';
import { SeedDataService } from '../../core/services/seed-data.service';
import { SqliteService } from '../../core/services/sqlite.service';

@Component({
  selector: 'app-data-loader',
  templateUrl: './data-loader.page.html',
  styleUrls: ['./data-loader.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonSpinner,
    IonText,
    IonProgressBar
  ]
})
export class DataLoaderPage implements OnInit {
  private router = inject(Router);
  private settingsService = inject(SettingsService);
  private seedDataService = inject(SeedDataService);
  private sqliteService = inject(SqliteService);

  loadingMessage = signal('Initializing...');
  progress = signal(0);

  async ngOnInit() {
    await this.initializeApp();
  }

  private async initializeApp() {
    try {
      // Step 1: Initialize SQLite database
      this.loadingMessage.set('Initializing SQLite...');
      this.progress.set(0.1);
      
      try {
        await this.sqliteService.initialize();
        console.log('SQLite initialized successfully');
      } catch (sqliteError) {
        console.error('SQLite initialization error:', sqliteError);
        // Continue anyway - app can still start without local SQLite
      }
      
      await this.delay(300);

      // Step 2: (Legacy PouchDB init removed) - advance progress
      this.loadingMessage.set('Preparing local data...');
      this.progress.set(0.3);
      await this.delay(500);

      // Step 3: Seed sample data
      this.loadingMessage.set('Loading sample products...');
      this.progress.set(0.5);
      await this.seedDataService.seedSampleData();
      await this.delay(500);

      // Step 4: Load settings
      this.loadingMessage.set('Loading settings...');
      this.progress.set(0.7);
      await this.delay(500);

      // Step 5: Prepare UI
      this.loadingMessage.set('Preparing interface...');
      this.progress.set(0.9);
      await this.delay(500);

      // Step 6: Complete
      this.loadingMessage.set('Ready!');
      this.progress.set(1);
      await this.delay(300);

      // Navigate to appropriate page based on mode
      const mode = this.settingsService.getMode();
      console.log('Navigation mode:', mode);
      
      if (mode.retail) {
        this.router.navigate(['/pos-retail'], { replaceUrl: true });
      } else if (mode.category) {
        this.router.navigate(['/pos-category'], { replaceUrl: true });
      } else if (mode.restaurant) {
        this.router.navigate(['/pos-hospitality'], { replaceUrl: true });
      } else {
        // Default to category mode
        this.router.navigate(['/pos-category'], { replaceUrl: true });
      }

    } catch (error) {
      console.error('Initialization error:', error);
      this.loadingMessage.set('Error loading app. Continuing anyway...');
      
      // Still try to navigate even if there was an error
      await this.delay(1000);
      // Default to category mode on error
      this.router.navigate(['/pos-category'], { replaceUrl: true });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
