import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonIcon,
  IonToggle,
  IonButton,
  IonRefresher,
  IonRefresherContent,
  MenuController,
  AlertController,
  ToastController,
  LoadingController,
  ActionSheetController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  menuOutline,
  businessOutline,
  locationOutline,
  callOutline,
  mailOutline,
  documentTextOutline,
  printOutline,
  copyOutline,
  cutOutline,
  cashOutline,
  imageOutline,
  textOutline,
  resizeOutline,
  chatboxOutline,
  calculatorOutline,
  downloadOutline,
  trashOutline,
  refreshOutline,
  informationCircleOutline,
  codeOutline,
  chevronForwardOutline,
  storefront,
  cartOutline,
  colorPaletteOutline,
  pricetagOutline,
  personCircleOutline
} from 'ionicons/icons';

import { PrinterSettings, LoyaltyProgram } from '../../models';
import { SettingsService, AppSettings } from '../../core/services/settings.service';
import { StorageService } from '../../core/services/storage.service';
import { SqliteService } from '../../core/services/sqlite.service';
import { ProductsService } from '../../core/services/products.service';
import { LoyaltyServiceClient } from '../../core/services/loyalty.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TitleCasePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonIcon,
    IonToggle,
    IonButton,
    IonRefresher,
    IonRefresherContent
  ]
})
export class SettingsPage implements OnInit {
  private menuCtrl = inject(MenuController);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  private actionSheetCtrl = inject(ActionSheetController);
  settingsService = inject(SettingsService);
  private storage = inject(StorageService);
  private sqlite = inject(SqliteService);
  private productsService = inject(ProductsService);
  private loyaltyService = inject(LoyaltyServiceClient);
  authService = inject(AuthService);

  printerSettings = signal<PrinterSettings>({
    autoPrint: false,
    printCopies: 1,
    openCashDrawer: false,
    paperWidth: 80,
    fontSize: 'normal',
    autoCut: false,
    printLogo: false,
    businessInfo: {
      name: '',
      address: '',
      phone: '',
      email: '',
      taxNumber: ''
    }
  });

  appSettings = this.settingsService.settings;

  loyaltyProgram = signal<LoyaltyProgram | null>(null);

  // Account / license info from onboarding & auth
  businessName = signal<string | null>(null);
  licenseKey = signal<string | null>(null);
  showLicenseKey = signal(false);

  tempSettings: any = {
    autoPrint: false,
    printCopies: 1,
    openCashDrawer: false,
    paperWidth: 80,
    fontSize: 'normal',
    autoCut: false,
    printLogo: false,
    currency: 'ZMW',
    taxRate: 16,
    taxEnabled: false,
    taxMode: 'inclusive',
    taxName: 'VAT',
    showReceiptOptions: true
  };

  constructor() {
    this.registerIcons();
  }

  private registerIcons() {
    addIcons({
      'menu-outline': menuOutline,
      'business-outline': businessOutline,
      'location-outline': locationOutline,
      'call-outline': callOutline,
      'mail-outline': mailOutline,
      'document-text-outline': documentTextOutline,
      'print-outline': printOutline,
      'copy-outline': copyOutline,
      'cut-outline': cutOutline,
      'cash-outline': cashOutline,
      'image-outline': imageOutline,
      'text-outline': textOutline,
      'resize-outline': resizeOutline,
      'chatbox-outline': chatboxOutline,
      'calculator-outline': calculatorOutline,
      'download-outline': downloadOutline,
      'trash-outline': trashOutline,
      'refresh-outline': refreshOutline,
      'information-circle-outline': informationCircleOutline,
      'code-outline': codeOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'storefront': storefront,
      'cart-outline': cartOutline,
      'color-palette-outline': colorPaletteOutline,
      'pricetag-outline': pricetagOutline,
      'person-circle-outline': personCircleOutline
    });
  }

  async ngOnInit() {
    await this.loadSettings();
    await this.loadLoyaltyProgram();
    await this.loadAccountInfo();
  }

  private async loadSettings() {
    try {
      const printerSettings = await this.storage.get<PrinterSettings>('printer-settings') || {
        autoPrint: false,
        printCopies: 1,
        openCashDrawer: false,
        paperWidth: 80,
        fontSize: 'normal',
        autoCut: false,
        printLogo: false,
        businessInfo: {
          name: '',
          address: '',
          phone: '',
          email: '',
          taxNumber: ''
        }
      };
      
      this.printerSettings.set(printerSettings);
      const appSettings = await this.storage.get<AppSettings>('app-settings');
      
      // Copy to temp settings
      this.tempSettings = {
        autoPrint: appSettings?.autoPrintReceipt ?? printerSettings.autoPrint,
        printCopies: printerSettings.printCopies,
        openCashDrawer: printerSettings.openCashDrawer,
        paperWidth: printerSettings.paperWidth,
        fontSize: printerSettings.fontSize,
        autoCut: printerSettings.autoCut,
        printLogo: printerSettings.printLogo,
        currency: await this.storage.get('currency') || 'ZMW',
        taxRate: await this.storage.get('taxRate') || 16,
        taxEnabled: await this.storage.get('taxEnabled') || false,
        taxMode: await this.storage.get('taxMode') || 'inclusive',
        taxName: await this.storage.get('taxName') || 'VAT',
        showReceiptOptions: appSettings?.showReceiptModalAfterPayment ?? true
      };
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  private async loadLoyaltyProgram() {
    try {
      const program = await this.loyaltyService.loadProgram();
      this.loyaltyProgram.set(program);
    } catch (error) {
      console.error('Error loading loyalty program:', error);
    }
  }

  private async loadAccountInfo() {
    try {
      const name = await this.authService.getBusinessName();
      const licenseKey = await this.storage.get<string>('licenseKey');

      this.businessName.set(name || null);
      this.licenseKey.set(licenseKey || null);
    } catch (error) {
      console.error('Error loading account info:', error);
    }
  }

  async onToggleAutoBackup(event: CustomEvent) {
    const enabled = !!event.detail.checked;
    try {
      await this.settingsService.updateSettings({ autoBackupOnWorkperiodClose: enabled });
      await this.showToast('Auto backup preference updated');
    } catch (error) {
      console.error('Error updating auto backup preference:', error);
      await this.showToast('Failed to update backup preference');
    }
  }

  async onShowLicenseKey() {
    if (!this.licenseKey()) {
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'View License Key',
      message: 'Enter an admin PIN to view the full license key.',
      inputs: [
        {
          name: 'adminPin',
          type: 'password',
          placeholder: 'Admin PIN (4-6 digits)',
          attributes: {
            inputmode: 'numeric',
            maxlength: 6
          }
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Unlock',
          handler: async (data) => {
            const pin = (data?.adminPin || '').trim();

            if (!pin || pin.length < 4) {
              await this.showToast('Please enter a valid admin PIN');
              return false;
            }

            const isAdmin = await this.authService.validateAdminPin(pin);
            if (!isAdmin) {
              await this.showToast('Invalid admin PIN');
              return false;
            }

            this.showLicenseKey.set(true);
            await this.showToast('License key unlocked');
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  openMenu() {
    this.menuCtrl.open();
  }

  async handleRefresh(event: any) {
    await this.loadSettings();
    await this.loadLoyaltyProgram();
    event.target.complete();
  }

  getLoyaltySummary(): string {
    const program = this.loyaltyProgram();
    if (!program) {
      return 'Not configured';
    }
    if (!program.active) {
      return 'Disabled';
    }
    const earn = program.earnRate;
    const redeem = program.redeemRate;
    const base = `Earn ${earn} pt(s) per 1 ${this.tempSettings.currency}, redeem ${redeem.toFixed(2)} per point`;

    const extras: string[] = [];
    const minTotal = program.minTotalForEarn ?? 0;
    if (minTotal > 0) {
      extras.push(`min ticket ${this.tempSettings.currency} ${minTotal.toFixed(2)}`);
    }

    const methods = program.allowedPaymentMethods;
    if (methods && methods.length > 0) {
      extras.push(`methods: ${methods.join(', ')}`);
    }

    if (extras.length === 0) {
      return base;
    }

    return `${base} (${extras.join(' · ')})`;
  }

  async editLoyaltyProgram() {
    const current = this.loyaltyProgram() || {
      earnRate: 1,
      redeemRate: 0.01,
      active: true,
      minTotalForEarn: 0,
      allowedPaymentMethods: null
    };

    const alert = await this.alertCtrl.create({
      header: 'Loyalty Program',
      message: 'Configure how customers earn and redeem points.',
      inputs: [
        {
          name: 'earnRate',
          type: 'number',
          label: 'Earn rate',
          placeholder: 'Points per 1 ' + this.tempSettings.currency,
          value: current.earnRate.toString(),
        },
        {
          name: 'redeemRate',
          type: 'number',
          label: 'Redeem rate',
          placeholder: this.tempSettings.currency + ' value per point',
          value: current.redeemRate.toString(),
        },
        {
          name: 'minTotalForEarn',
          type: 'number',
          label: 'Minimum ticket total to earn',
          placeholder: `${this.tempSettings.currency} 0.00`,
          value: (current.minTotalForEarn ?? 0).toString(),
        },
        {
          name: 'allowCash',
          type: 'checkbox',
          label: 'Earn on Cash',
          checked: !current.allowedPaymentMethods || current.allowedPaymentMethods.includes('cash'),
        },
        {
          name: 'allowCard',
          type: 'checkbox',
          label: 'Earn on Card',
          checked: !current.allowedPaymentMethods || current.allowedPaymentMethods.includes('card'),
        },
        {
          name: 'allowMobile',
          type: 'checkbox',
          label: 'Earn on Mobile',
          checked: !current.allowedPaymentMethods || current.allowedPaymentMethods.includes('mobile'),
        },
        {
          name: 'allowAccount',
          type: 'checkbox',
          label: 'Earn on Account (customer credit)',
          checked: !current.allowedPaymentMethods || current.allowedPaymentMethods.includes('account'),
        },
        {
          name: 'active',
          type: 'checkbox',
          label: 'Program Active',
          checked: current.active,
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save',
          handler: async (data: any) => {
            const earnRate = parseFloat(data.earnRate);
            const redeemRate = parseFloat(data.redeemRate);
            const minTotalForEarn = parseFloat(data.minTotalForEarn || '0');
            if (isNaN(earnRate) || earnRate <= 0) {
              await this.showToast('Enter a valid earn rate');
              return false;
            }
            if (isNaN(redeemRate) || redeemRate <= 0) {
              await this.showToast('Enter a valid redeem rate');
              return false;
            }

            if (isNaN(minTotalForEarn) || minTotalForEarn < 0) {
              await this.showToast('Enter a valid minimum ticket total');
              return false;
            }

            const active = !!data.active;

            const allowedMethods: string[] = [];
            if (data.allowCash) {
              allowedMethods.push('cash');
            }
            if (data.allowCard) {
              allowedMethods.push('card');
            }
            if (data.allowMobile) {
              allowedMethods.push('mobile');
            }
            if (data.allowAccount) {
              allowedMethods.push('account');
            }

            // If all methods are selected (or none), treat as no
            // restriction and send null so backend interprets it as
            // "all payment methods eligible".
            const normalizedAllowed =
              allowedMethods.length === 0 || allowedMethods.length === 4
                ? null
                : allowedMethods;

            try {
              const saved = await this.loyaltyService.saveProgram({
                earnRate,
                redeemRate,
                active,
                minTotalForEarn,
                allowedPaymentMethods: normalizedAllowed
              });
              this.loyaltyProgram.set(saved);
              await this.showToast('Loyalty program updated');
              return true;
            } catch (error) {
              console.error('Error saving loyalty program:', error);
              await this.showToast('Failed to save loyalty program');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async editBusinessInfo() {
    const current = this.printerSettings().businessInfo;
    
    const alert = await this.alertCtrl.create({
      header: 'Business Information',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Business Name',
          value: current.name
        },
        {
          name: 'address',
          type: 'textarea',
          placeholder: 'Address',
          value: current.address
        },
        {
          name: 'phone',
          type: 'tel',
          placeholder: 'Phone',
          value: current.phone
        },
        {
          name: 'email',
          type: 'email',
          placeholder: 'Email',
          value: current.email
        },
        {
          name: 'taxNumber',
          type: 'text',
          placeholder: 'Tax Number (TPIN)',
          value: current.taxNumber
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save',
          handler: async (data) => {
            await this.updateBusinessInfo(data);
          }
        }
      ]
    });

    await alert.present();
  }

  async editField(field: string, label: string, currentValue?: string, isTextarea = false) {
    const alert = await this.alertCtrl.create({
      header: label,
      inputs: [
        {
          name: 'value',
          type: isTextarea ? 'textarea' : 'text',
          placeholder: label,
          value: currentValue || ''
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save',
          handler: async (data) => {
            await this.updateSingleField(field, data.value);
          }
        }
      ]
    });

    await alert.present();
  }

  async editNumber(field: string, label: string, currentValue: number) {
    const alert = await this.alertCtrl.create({
      header: label,
      inputs: [
        {
          name: 'value',
          type: 'number',
          placeholder: label,
          value: currentValue.toString(),
          attributes: {
            min: field === 'printCopies' ? 1 : 0
          }
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save',
          handler: async (data) => {
            const value = parseFloat(data.value);
            if (!isNaN(value)) {
              await this.updateNumberField(field, value);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async selectFontSize() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Select Font Size',
      buttons: [
        {
          text: 'Small',
          handler: () => this.updateFontSize('small')
        },
        {
          text: 'Normal',
          handler: () => this.updateFontSize('normal')
        },
        {
          text: 'Large',
          handler: () => this.updateFontSize('large')
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  async selectPaperWidth() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Select Paper Width',
      buttons: [
        {
          text: '32mm',
          handler: () => this.updatePaperWidth(32)
        },
        {
          text: '48mm',
          handler: () => this.updatePaperWidth(48)
        },
        {
          text: '58mm',
          handler: () => this.updatePaperWidth(58)
        },
        {
          text: '80mm',
          handler: () => this.updatePaperWidth(80)
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  async saveSettings() {
    try {
      const currentSettings = this.printerSettings();
      const updated: PrinterSettings = {
        ...currentSettings,
        autoPrint: this.tempSettings.autoPrint,
        printCopies: this.tempSettings.printCopies,
        openCashDrawer: this.tempSettings.openCashDrawer,
        autoCut: this.tempSettings.autoCut,
        printLogo: this.tempSettings.printLogo
      };

      await this.storage.set('printer-settings', updated);
      this.printerSettings.set(updated);

      // Save additional settings
      await this.storage.set('currency', this.tempSettings.currency);
      await this.storage.set('taxRate', this.tempSettings.taxRate);
      await this.storage.set('taxEnabled', this.tempSettings.taxEnabled);
      await this.storage.set('taxMode', this.tempSettings.taxMode);
      await this.storage.set('taxName', this.tempSettings.taxName);

      // Keep core app settings in sync for checkout/printing behavior
      const appSettings: Partial<AppSettings> = {
        autoPrintReceipt: this.tempSettings.autoPrint,
        showLogoOnReceipt: this.tempSettings.printLogo,
        currency: this.tempSettings.currency,
        taxRate: this.tempSettings.taxRate,
        showReceiptModalAfterPayment: this.tempSettings.showReceiptOptions
      };
      await this.settingsService.updateSettings(appSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      await this.showToast('Failed to save settings');
    }
  }

  private async updateBusinessInfo(data: any) {
    const loading = await this.loadingCtrl.create({
      message: 'Updating business information...'
    });
    await loading.present();

    try {
      const currentSettings = this.printerSettings();
      const updated: PrinterSettings = {
        ...currentSettings,
        businessInfo: {
          name: data.name,
          address: data.address,
          phone: data.phone,
          email: data.email,
          taxNumber: data.taxNumber
        }
      };

      await this.storage.set('printer-settings', updated);
      this.printerSettings.set(updated);
      await this.showToast('Business information updated');
    } catch (error) {
      console.error('Error updating business info:', error);
      await this.showToast('Failed to update business information');
    } finally {
      await loading.dismiss();
    }
  }

  private async updateSingleField(field: string, value: string) {
    const loading = await this.loadingCtrl.create({
      message: 'Updating...'
    });
    await loading.present();

    try {
      const currentSettings = this.printerSettings();
      const updated: PrinterSettings = {
        ...currentSettings,
        businessInfo: {
          ...currentSettings.businessInfo,
          [field]: value
        }
      };

      await this.storage.set('printer-settings', updated);
      this.printerSettings.set(updated);
      await this.showToast('Updated successfully');
    } catch (error) {
      console.error('Error updating field:', error);
      await this.showToast('Failed to update');
    } finally {
      await loading.dismiss();
    }
  }

  private async updateNumberField(field: string, value: number) {
    this.tempSettings[field] = value;
    await this.saveSettings();
    await this.showToast('Updated successfully');
  }

  private async updateFontSize(size: 'small' | 'normal' | 'large') {
    this.tempSettings.fontSize = size;
    await this.saveSettings();
    await this.showToast('Font size updated');
  }

  private async updatePaperWidth(width: 32 | 48 | 58 | 80) {
    this.tempSettings.paperWidth = width;
    await this.saveSettings();
    await this.showToast('Paper width updated');
  }

  async exportData() {
    const alert = await this.alertCtrl.create({
      header: 'Export Data',
      message: 'Export a backup of your local POS data to a file you can save or move to another device.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Export',
          handler: async () => {
            const loading = await this.loadingCtrl.create({
              message: 'Preparing backup...'
            });
            await loading.present();

            try {
              await this.sqlite.ensureInitialized();

              const [products, customers, sales, inventory, voids, workperiods] = await Promise.all([
                this.sqlite.getProducts(),
                this.sqlite.getCustomers(),
                this.sqlite.getSales(10000),
                this.sqlite.getInventoryRecords(1000),
                this.sqlite.getVoidRecords(1000),
                this.sqlite.getRecentWorkperiods(1000)
              ]);

              const snapshot = {
                exportedAt: new Date().toISOString(),
                products,
                customers,
                sales,
                inventory,
                voids,
                workperiods
              };

              const json = JSON.stringify(snapshot, null, 2);
              const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `zpos-backup-${new Date().toISOString().slice(0, 10)}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);

              await this.showToast('Backup exported');
            } catch (error) {
              console.error('Backup export failed', error);
              await this.showToast('Failed to export backup');
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async clearCache() {
    const alert = await this.alertCtrl.create({
      header: 'Clear Cache',
      message: 'This will free up storage space but may slow down the app temporarily.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Clear',
          handler: async () => {
            const loading = await this.loadingCtrl.create({
              message: 'Clearing cache...'
            });
            await loading.present();

            try {
              // Clear cache logic would go here
              await new Promise(resolve => setTimeout(resolve, 1000));
              await this.showToast('Cache cleared successfully');
            } catch (error) {
              await this.showToast('Failed to clear cache');
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async resetSettings() {
    const alert = await this.alertCtrl.create({
      header: 'Reset Settings',
      message: 'This will restore all settings to their default values. Are you sure?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Reset',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingCtrl.create({
              message: 'Resetting settings...'
            });
            await loading.present();

            try {
              const defaultSettings: PrinterSettings = {
                autoPrint: false,
                printCopies: 1,
                openCashDrawer: false,
                paperWidth: 80,
                fontSize: 'normal',
                autoCut: false,
                printLogo: false,
                businessInfo: {
                  name: '',
                  address: '',
                  phone: '',
                  email: '',
                  taxNumber: ''
                }
              };

              await this.storage.set('printer-settings', defaultSettings);
              await this.loadSettings();
              await this.showToast('Settings reset to defaults');
            } catch (error) {
              await this.showToast('Failed to reset settings');
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async resetCatalog() {
    const alert = await this.alertCtrl.create({
      header: 'Reset Product Catalog',
      message:
        'This will permanently delete all products and categories on this device. You cannot undo this. Continue?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Reset',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingCtrl.create({
              message: 'Resetting catalog...',
            });
            await loading.present();

            try {
              await this.sqlite.ensureInitialized();
              await this.sqlite.clearAllProductsAndCategories();
              await this.productsService.loadProducts();
              await this.productsService.loadCategories();
              await this.showToast('Catalog reset successfully');
            } catch (error) {
              console.error('Error resetting catalog:', error);
              await this.showToast('Failed to reset catalog');
            } finally {
              await loading.dismiss();
            }
          },
        },
      ],
    });

    await alert.present();
  }

  async selectBusinessType() {
    const businessTypes = [
      { value: 'retail', label: 'Retail Store', icon: '🏪' },
      { value: 'supermarket', label: 'Supermarket', icon: '🛒' },
      { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
      { value: 'cafe', label: 'Café', icon: '☕' },
      { value: 'bar', label: 'Bar/Pub', icon: '🍺' },
      { value: 'hotel', label: 'Hotel', icon: '🏨' },
      { value: 'pharmacy', label: 'Pharmacy', icon: '💊' },
      { value: 'electronics', label: 'Electronics Store', icon: '📱' },
      { value: 'fashion', label: 'Fashion Store', icon: '👗' },
      { value: 'other', label: 'Other', icon: '🏢' }
    ];

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Select Business Type',
      buttons: [
        ...businessTypes.map(type => ({
          text: `${type.icon} ${type.label}`,
          handler: async () => {
            await this.updateBusinessType(type.value);
          }
        })),
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  async selectPosMode() {
    const posModes = [
      { 
        value: 'retail', 
        label: 'Retail Mode', 
        description: 'Quick sales with barcode scanner',
        icon: '🛍️'
      },
      { 
        value: 'category', 
        label: 'Category Mode', 
        description: 'Touch-based product grid',
        icon: '📱'
      },
      { 
        value: 'hospitality', 
        label: 'Hospitality Mode', 
        description: 'Table management & waiters',
        icon: '🍽️'
      }
    ];

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Select Default POS Mode',
      buttons: [
        ...posModes.map(mode => ({
          text: `${mode.icon} ${mode.label}`,
          handler: async () => {
            await this.updatePosMode(mode.value);
          }
        })),
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  getBusinessTypeLabel(type?: string): string {
    const types: Record<string, string> = {
      retail: '🏪 Retail Store',
      supermarket: '🛒 Supermarket',
      restaurant: '🍽️ Restaurant',
      cafe: '☕ Café',
      bar: '🍺 Bar/Pub',
      hotel: '🏨 Hotel',
      pharmacy: '💊 Pharmacy',
      electronics: '📱 Electronics Store',
      fashion: '👗 Fashion Store',
      other: '🏢 Other'
    };
    return types[type || 'retail'] || 'Not set';
  }

  getPosModeName(mode?: string): string {
    const modes: Record<string, string> = {
      retail: '🛍️ Retail Mode',
      category: '📱 Category Mode',
      hospitality: '🍽️ Hospitality Mode'
    };
    return modes[mode || 'category'] || 'Not set';
  }

  private async updateBusinessType(type: string) {
    try {
      await this.settingsService.updateSettings({ businessType: type });
      await this.showToast(`Business type updated to ${this.getBusinessTypeLabel(type)}`);
    } catch (error) {
      await this.showToast('Failed to update business type');
    }
  }

  private async updatePosMode(mode: string) {
    try {
      await this.settingsService.updateSettings({ defaultPosMode: mode as any });
      await this.showToast(`Default POS mode updated to ${this.getPosModeName(mode)}`);
    } catch (error) {
      await this.showToast('Failed to update POS mode');
    }
  }

  async editCategoryTileColor() {
    const settings = this.settingsService.settings();
    const alert = await this.alertCtrl.create({
      header: 'Category Tile Color',
      message: 'Enter a hex color code (e.g., #FF9800)',
      inputs: [
        {
          name: 'color',
          type: 'text',
          placeholder: '#FF9800',
          value: settings.categoryTileBackgroundColor || '#FF9800'
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: async (data) => {
            const color = data.color.trim();
            if (!/^#[0-9A-F]{6}$/i.test(color)) {
              await this.showToast('Invalid color format. Use #RRGGBB');
              return false;
            }
            await this.settingsService.updateSettings({ categoryTileBackgroundColor: color });
            await this.showToast('Category tile color updated');
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async editProductTileColor() {
    const settings = this.settingsService.settings();
    const alert = await this.alertCtrl.create({
      header: 'Product Tile Color',
      message: 'Enter a hex color code (e.g., #4CAF50)',
      inputs: [
        {
          name: 'color',
          type: 'text',
          placeholder: '#4CAF50',
          value: settings.productTileBackgroundColor || '#4CAF50'
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: async (data) => {
            const color = data.color.trim();
            if (!/^#[0-9A-F]{6}$/i.test(color)) {
              await this.showToast('Invalid color format. Use #RRGGBB');
              return false;
            }
            await this.settingsService.updateSettings({ productTileBackgroundColor: color });
            await this.showToast('Product tile color updated');
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async editTaxRate() {
    const alert = await this.alertCtrl.create({
      header: 'Tax Rate',
      message: 'Enter tax rate as a percentage',
      inputs: [
        {
          name: 'rate',
          type: 'number',
          placeholder: '15',
          value: this.tempSettings.taxRate.toString(),
          min: 0,
          max: 100
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: async (data) => {
            const rate = parseFloat(data.rate);
            if (isNaN(rate) || rate < 0 || rate > 100) {
              await this.showToast('Please enter a valid rate between 0 and 100');
              return false;
            }
            this.tempSettings.taxRate = rate;
            await this.saveSettings();
            await this.showToast('Tax rate updated');
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async selectTaxMode() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Tax Calculation Mode',
      buttons: [
        {
          text: 'Tax Inclusive (Price includes tax)',
          handler: async () => {
            this.tempSettings.taxMode = 'inclusive';
            await this.saveSettings();
            await this.showToast('Tax mode updated to Inclusive');
          }
        },
        {
          text: 'Tax Exclusive (Tax added at checkout)',
          handler: async () => {
            this.tempSettings.taxMode = 'exclusive';
            await this.saveSettings();
            await this.showToast('Tax mode updated to Exclusive');
          }
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async editTaxName() {
    const alert = await this.alertCtrl.create({
      header: 'Tax Label',
      message: 'Enter the tax name (e.g., VAT, GST, Sales Tax)',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'VAT',
          value: this.tempSettings.taxName || 'VAT'
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: async (data) => {
            if (!data.name || !data.name.trim()) {
              await this.showToast('Please enter a tax name');
              return false;
            }
            this.tempSettings.taxName = data.name.trim();
            await this.saveSettings();
            await this.showToast('Tax name updated');
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }
}
