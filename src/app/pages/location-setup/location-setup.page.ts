import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonText,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonNote,
} from '@ionic/angular/standalone';

import { SettingsService } from '../../core/services/settings.service';
import { StorageService } from '../../core/services/storage.service';
import { COUNTRIES, Country, getCountryByName } from '../../core/data/countries.data';

@Component({
  selector: 'app-location-setup',
  templateUrl: './location-setup.page.html',
  styleUrls: ['./location-setup.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonList,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonText,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonNote,
  ],
})
export class LocationSetupPage implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private settingsService = inject(SettingsService);
  private storage = inject(StorageService);
  private fb = inject(FormBuilder);

  countries = COUNTRIES;
  selectedCountry = signal<Country | null>(null);
  availableCities = computed(() => this.selectedCountry()?.cities || []);
  supportsZRA = computed(() => this.selectedCountry()?.supportsZRA || false);
  isExistingUser = signal(false);

  locationForm = this.fb.group({
    country: ['', Validators.required],
    city: ['', Validators.required],
  });

  async ngOnInit() {
    // Check if this is an existing user (has business name)
    const settings = this.settingsService.settings();
    this.isExistingUser.set(!!settings.businessName && settings.businessName !== 'ZPOS');

    // Pre-fill if country was already partially set
    if (settings.country) {
      this.locationForm.patchValue({
        country: settings.country,
        city: settings.city || '',
      });
      this.onCountryChange(settings.country);
    }
  }

  onCountryChange(countryName: string) {
    const country = getCountryByName(countryName);
    this.selectedCountry.set(country || null);
    
    // Reset city when country changes
    this.locationForm.patchValue({ city: '' });
  }

  async saveLocation() {
    if (!this.locationForm.valid) return;

    const location = this.locationForm.value;
    const country = getCountryByName(location.country!);

    // Update settings
    await this.settingsService.updateSettings({
      country: location.country!,
      city: location.city!,
      currency: country?.currency || this.settingsService.settings().currency,
    });

    // Store ZRA support flag
    await this.storage.set('zra_supported', this.supportsZRA());
    await this.storage.set('country', location.country);
    await this.storage.set('city', location.city);

    // Get return URL or default to POS
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/pos';
    this.router.navigate([returnUrl], { replaceUrl: true });
  }

  get canSave() {
    return this.locationForm.valid;
  }
}
