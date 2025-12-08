import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent,
  IonSpinner,
  IonText,
  IonProgressBar
} from '@ionic/angular/standalone';

import { DbService } from '../../core/services/db.service';
import { SettingsService } from '../../core/services/settings.service';
import { SeedDataService } from '../../core/services/seed-data.service';

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
  private dbService = inject(DbService);
  private settingsService = inject(SettingsService);
  private seedDataService = inject(SeedDataService);

  loadingMessage = signal('Initializing...');
  progress = signal(0);

  async ngOnInit() {
    await this.initializeApp();
  }

  private async initializeApp() {
    try {
      // Step 1: Initialize database
      this.loadingMessage.set('Initializing database...');
      this.progress.set(0.2);
      await this.delay(500);

      if (!this.dbService.isReady()) {
        await this.dbService.initDB();
      }

      // Step 2: Seed sample data
      this.loadingMessage.set('Loading sample products...');
      this.progress.set(0.4);
      await this.seedDataService.seedSampleData();
      await this.delay(500);

      // Step 3: Load settings
      this.loadingMessage.set('Loading settings...');
      this.progress.set(0.6);
      await this.delay(500);

      // Step 4: Prepare UI
      this.loadingMessage.set('Preparing interface...');
      this.progress.set(0.8);
      await this.delay(500);

      // Step 5: Complete
      this.loadingMessage.set('Ready!');
      this.progress.set(1);
      await this.delay(300);

      // Navigate to appropriate page based on mode
      const mode = this.settingsService.getMode();
      if (mode.category) {
        this.router.navigate(['/pos'], { replaceUrl: true });
      } else if (mode.retail) {
        this.router.navigate(['/pos'], { replaceUrl: true });
      } else if (mode.restaurant || mode.distributor) {
        this.router.navigate(['/menu'], { replaceUrl: true });
      } else {
        this.router.navigate(['/pos-products'], { replaceUrl: true });
      }

    } catch (error) {
      console.error('Initialization error:', error);
      this.loadingMessage.set('Error loading app. Please try again.');
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
