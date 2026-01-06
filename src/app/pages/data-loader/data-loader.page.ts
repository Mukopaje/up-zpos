import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent,
  IonSpinner,
  IonText,
  IonProgressBar,
  IonButton
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
    IonProgressBar,
    IonButton
  ]
})
export class DataLoaderPage implements OnInit {
  private router = inject(Router);
  private settingsService = inject(SettingsService);
  private seedDataService = inject(SeedDataService);
  private sqliteService = inject(SqliteService);

  loadingMessage = signal('Initializing...');
  progress = signal(0);
  showSetupChoice = signal(false);

  async ngOnInit() {
    try {
      const choice = await this.settingsService.get('data-setup-choice');
      if (!choice) {
        this.showSetupChoice.set(true);
        return;
      }

      await this.initializeApp(choice === 'sample');
    } catch (error) {
      console.error('Error loading data setup choice:', error);
      this.showSetupChoice.set(true);
    }
  }

  async startWithSampleData() {
    try {
      await this.settingsService.set('data-setup-choice', 'sample');
    } catch (error) {
      console.error('Error saving data setup choice (sample):', error);
    }

    this.showSetupChoice.set(false);
    await this.initializeApp(true);
  }

  async startWithEmptyData() {
    try {
      await this.settingsService.set('data-setup-choice', 'empty');
    } catch (error) {
      console.error('Error saving data setup choice (empty):', error);
    }

    this.showSetupChoice.set(false);
    await this.initializeApp(false);
  }

  private async initializeApp(useSampleData: boolean) {
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

      // Step 3: Optionally seed sample data
      this.loadingMessage.set(useSampleData ? 'Loading sample products...' : 'Skipping sample products...');
      this.progress.set(0.5);
      if (useSampleData) {
        await this.seedDataService.seedSampleData();
      }
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

      // After initialization, run onboarding once before entering POS
      const onboardingComplete = await this.settingsService.get('onboarding-complete');

      if (!onboardingComplete) {
        this.router.navigate(['/onboarding'], { replaceUrl: true });
        return;
      }

      // Navigate to appropriate page based on configured default POS mode
      const settings = this.settingsService.settings();
      const defaultMode = settings.defaultPosMode || 'category';

      console.log('Navigation default POS mode:', defaultMode);

      switch (defaultMode) {
        case 'retail':
          this.router.navigate(['/pos-retail'], { replaceUrl: true });
          break;
        case 'hospitality':
          this.router.navigate(['/pos-hospitality'], { replaceUrl: true });
          break;
        case 'category':
        default:
          this.router.navigate(['/pos-category'], { replaceUrl: true });
          break;
      }

    } catch (error) {
      console.error('Initialization error:', error);
      this.loadingMessage.set('Error loading app. Continuing anyway...');
      
      // Still try to navigate even if there was an error
      await this.delay(1000);

      // On error, fall back to default POS mode routing
      const settings = this.settingsService.settings();
      const defaultMode = settings.defaultPosMode || 'category';

      this.router.navigate([
        defaultMode === 'retail'
          ? '/pos-retail'
          : defaultMode === 'hospitality'
          ? '/pos-hospitality'
          : '/pos-category'
      ], { replaceUrl: true });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
