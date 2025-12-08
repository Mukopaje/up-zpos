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
  pricetagOutline
} from 'ionicons/icons';

import { PrinterSettings } from '../../models';
import { SettingsService, AppSettings } from '../../core/services/settings.service';
import { StorageService } from '../../core/services/storage.service';

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
    taxName: 'VAT'
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
      'pricetag-outline': pricetagOutline
    });
  }

  async ngOnInit() {
    await this.loadSettings();
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
      
      // Copy to temp settings
      this.tempSettings = {
        autoPrint: printerSettings.autoPrint,
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
        taxName: await this.storage.get('taxName') || 'VAT'
      };
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  openMenu() {
    this.menuCtrl.open();
  }

  async handleRefresh(event: any) {
    await this.loadSettings();
    event.target.complete();
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
      message: 'This feature will export all your data to a backup file.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Export',
          handler: async () => {
            await this.showToast('Export functionality coming soon');
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
