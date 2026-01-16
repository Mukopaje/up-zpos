import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonFooter,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonText,
  IonSegment,
  IonSegmentButton,
  IonProgressBar,
  IonNote,
  IonSpinner
} from '@ionic/angular/standalone';

import { SettingsService } from '../../core/services/settings.service';
import { StorageService } from '../../core/services/storage.service';
import { COUNTRIES, Country, getCountryByName } from '../../core/data/countries.data';

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonFooter,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonText,
    IonSegment,
    IonSegmentButton,
    IonProgressBar,
    IonNote,
    IonSpinner
  ]
})
export class OnboardingPage {
  private router = inject(Router);
  private settingsService = inject(SettingsService);
  private storage = inject(StorageService);
  private fb = inject(FormBuilder);

  // Add step 0 for country selection
  step = signal<0 | 1 | 2 | 3>(0);

  // Country data
  countries = COUNTRIES;
  selectedCountry = signal<Country | null>(null);
  availableCities = computed(() => this.selectedCountry()?.cities || []);
  supportsZRA = computed(() => this.selectedCountry()?.supportsZRA || false);

  // Step 0: Location Form (Country & City)
  locationForm = this.fb.group({
    country: ['', Validators.required],
    city: ['', Validators.required],
  });

  // TPIN Auto-Config Form
  tpinForm = this.fb.group({
    tpin: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
  });

  isAutoConfiguring = signal(false);
  autoConfigError = signal<string | null>(null);

  // Step 1: Business Form
  businessForm = this.fb.group({
    businessName: ['', Validators.required],
    businessType: ['retail', Validators.required],
    address: [''],
    phone: [''],
    email: ['']
  });

  invoiceForm = this.fb.group({
    prefix: ['INV', [Validators.required, Validators.maxLength(10)]],
    taxRate: [16, [Validators.required, Validators.min(0), Validators.max(100)]],
    currency: ['ZMW', [Validators.required, Validators.maxLength(3)]]
  });

  posModeForm = this.fb.group({
    defaultPosMode: ['category', Validators.required]
  });

  canGoNext = computed(() => {
    const current = this.step();
    if (current === 0) {
      return this.locationForm.valid;
    }
    if (current === 1) {
      if (this.supportsZRA() && this.tpinForm.valid) return true;
      return this.businessForm.valid;
    }
    if (current === 2) {
      return this.invoiceForm.valid;
    }
    if (current === 3) {
      return this.posModeForm.valid;
    }
    return false;
  });

  invoicePreview = computed(() => {
    const prefix = this.invoiceForm.controls.prefix.value || 'INV';
    const exampleDate = '20251229';
    const exampleSeq = '0269';
    return `${prefix}-${exampleDate}-${exampleSeq}`;
  });

  ngOnInit() {
    const current = this.settingsService.settings();

    // Check if location was already set
    if (current.country && current.city) {
      this.locationForm.patchValue({
        country: current.country,
        city: current.city,
      });
      this.onCountryChange(current.country);
    }

    this.businessForm.patchValue({
      businessName: current.businessName || 'ZPOS',
      businessType: current.businessType || 'retail',
      address: current.address || '',
      phone: current.phone || '',
      email: current.email || ''
    });

    this.invoiceForm.patchValue({
      taxRate: current.taxRate,
      currency: current.currency,
      prefix: 'INV'
    });

    this.posModeForm.patchValue({
      defaultPosMode: current.defaultPosMode || 'category'
    });
  }

  onCountryChange(countryName: string) {
    const country = getCountryByName(countryName);
    this.selectedCountry.set(country || null);
    
    // Reset city when country changes
    this.locationForm.patchValue({ city: '' });
    
    // Auto-fill currency and timezone if country supports it
    if (country) {
      this.invoiceForm.patchValue({
        currency: country.currency,
      });
    }
  }

  async onTpinConfig() {
    if (this.tpinForm.invalid) return;

    this.isAutoConfiguring.set(true);
    this.autoConfigError.set(null);

    try {
      // In a real app, this would call the Backend API
      // For this implementation, we simulate the auto-configuration
      // const response = await this.api.post('/zra/auto-configure', { tpin: this.tpinForm.value.tpin });
      
      this.businessForm.patchValue({
        businessName: 'ZRA Auto-Configured Store', // Simulated result
        address: 'Lusaka CBD, Zambia',
      });

      this.invoiceForm.patchValue({
        taxRate: 16,
        currency: 'ZMW'
      });

      // Advance to next step automatically
      this.step.set(2);
    } catch (error: any) {
      this.autoConfigError.set(error.message || 'Failed to auto-configure with TPIN');
    } finally {
      this.isAutoConfiguring.set(false);
    }
  }

  async next() {
    const current = this.step();
    if (current === 0 && this.locationForm.valid) {
      this.step.set(1);
      return;
    }
    if (current === 1) {
      if (this.supportsZRA() && this.tpinForm.valid && !this.businessForm.dirty) {
         await this.onTpinConfig();
         return;
      }
      if (this.businessForm.valid) {
        this.step.set(2);
      }
      return;
    }
    if (current === 2 && this.invoiceForm.valid) {
      this.step.set(3);
      return;
    }
    if (current === 3 && this.posModeForm.valid) {
      await this.finish();
    }
  }

  back() {
    const current = this.step();
    if (current === 0) return; // Can't go back from location
    if (current === 1) {
      this.step.set(0);
    } else if (current === 2) {
      this.step.set(1);
    } else if (current === 3) {
      this.step.set(2);
    }
  }

  async skip() {
    // Cannot skip - location is mandatory
    if (this.step() === 0) {
      return;
    }
    
    await this.storage.set('onboarding-complete', true);
    this.router.navigate(['/pos'], { replaceUrl: true });
  }

  private async finish() {
    const location = this.locationForm.value;
    const business = this.businessForm.value;
    const invoice = this.invoiceForm.value;
    const posMode = this.posModeForm.value;

    await this.settingsService.updateSettings({
      country: location.country || '',
      city: location.city || '',
      businessName: business.businessName || 'ZPOS',
      businessType: business.businessType || 'retail',
      address: business.address || '',
      phone: business.phone || '',
      email: business.email || '',
      taxRate: invoice.taxRate ?? 16,
      currency: invoice.currency || 'ZMW',
      defaultPosMode: posMode.defaultPosMode as any
    });

    if (invoice.prefix) {
      await this.storage.set('invoice_prefix', invoice.prefix.toUpperCase());
    }

    // Store ZRA support flag
    await this.storage.set('zra_supported', this.supportsZRA());
    await this.storage.set('country', location.country);
    await this.storage.set('city', location.city);

    await this.storage.set('onboarding-complete', true);
    this.router.navigate(['/pos'], { replaceUrl: true });
  }
}
