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
  IonProgressBar
} from '@ionic/angular/standalone';

import { SettingsService } from '../../core/services/settings.service';
import { StorageService } from '../../core/services/storage.service';

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
    IonProgressBar
  ]
})
export class OnboardingPage {
  private router = inject(Router);
  private settingsService = inject(SettingsService);
  private storage = inject(StorageService);
  private fb = inject(FormBuilder);

  step = signal<1 | 2 | 3>(1);

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
    if (current === 1) {
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

  async next() {
    const current = this.step();
    if (current === 1 && this.businessForm.valid) {
      this.step.set(2);
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
    if (current === 1) return;
    if (current === 2) {
      this.step.set(1);
    } else if (current === 3) {
      this.step.set(2);
    }
  }

  async skip() {
    await this.storage.set('onboarding-complete', true);
    this.router.navigate(['/pos'], { replaceUrl: true });
  }

  private async finish() {
    const business = this.businessForm.value;
    const invoice = this.invoiceForm.value;
    const posMode = this.posModeForm.value;

    await this.settingsService.updateSettings({
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

    await this.storage.set('onboarding-complete', true);
    this.router.navigate(['/pos'], { replaceUrl: true });
  }
}
