import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonToggle,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonTextarea,
  IonBackButton,
  IonButtons,
  IonSpinner,
  IonBadge,
  IonRefresher,
  IonRefresherContent,
  AlertController,
  ToastController,
  LoadingController,
  NavController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  bluetooth, 
  print, 
  checkmark, 
  close, 
  search,
  settings,
  arrowBack,
  refresh,
  warning
} from 'ionicons/icons';

import { PrintService } from '../../core/services/print.service';
import { Printer, PrinterSettings } from '../../models';

@Component({
  selector: 'app-printer-settings',
  templateUrl: './printer-settings.page.html',
  styleUrls: ['./printer-settings.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonText,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonToggle,
    IonSelect,
    IonSelectOption,
    IonInput,
    IonTextarea,
    IonBackButton,
    IonButtons,
    IonSpinner,
    IonBadge,
    IonRefresher,
    IonRefresherContent
  ]
})
export class PrinterSettingsPage implements OnInit {
  private router = inject(Router);
  private navCtrl = inject(NavController);
  private printService = inject(PrintService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  // State
  availablePrinters = this.printService.printers;
  defaultPrinter = this.printService.defaultPrinter;
  isScanning = this.printService.isScanning;
  isConnected = this.printService.isConnected;
  isPrinting = this.printService.isPrinting;
  printerSettings = this.printService.printerSettings;
  lastError = this.printService.lastError;

  // Local settings form
  settings = signal<PrinterSettings>(this.printerSettings());

  // Onboard printers metadata (L156 implemented, others placeholders)
  readonly onboardPrinterOptions: Array<{
    id: string;
    name: string;
    description: string;
    driver: Printer['driver'];
    implemented: boolean;
  }> = [
    {
      id: 'l156',
      name: 'L156 Onboard Printer',
      description: 'Built-in receipt printer for the L156 POS device.',
      driver: 'l156',
      implemented: true
    },
    {
      id: 'onboard-generic-1',
      name: 'Onboard Printer (coming soon)',
      description: 'Future onboard printer model – not implemented yet.',
      driver: 'custom',
      implemented: false
    }
  ];

  constructor() {
    this.registerIcons();
  }

  private registerIcons() {
    addIcons({ 
      bluetooth, 
      print, 
      checkmark, 
      close, 
      search,
      settings,
      'arrow-back': arrowBack,
      refresh,
      warning
    });
  }

  ngOnInit() {
    // Sync local settings with service
    this.settings.set({ ...this.printerSettings() });
  }

  /**
   * Helper to check if current default is an onboard printer
   */
  isOnboardDefault(): boolean {
    const printer = this.defaultPrinter();
    return !!printer && (printer.printerType === 'OB' || printer.driver === 'l156');
  }

  /**
   * Network printer helpers for template
   */
  hasNetworkPrinters(): boolean {
    return this.availablePrinters().some(p => p.printerType === 'Network');
  }

  networkPrinters(): Printer[] {
    return this.availablePrinters().filter(p => p.printerType === 'Network');
  }

  /**
   * Onboard printers from saved list
   */
  onboardPrinters(): Printer[] {
    return this.availablePrinters().filter(p => p.printerType === 'OB');
  }

  /**
   * Use / configure an onboard printer (L156 implemented)
   */
  async useOnboardPrinter(optionId: string) {
    const option = this.onboardPrinterOptions.find(o => o.id === optionId);
    if (!option) {
      return;
    }

    if (!option.implemented) {
      this.showToast('This onboard printer is not implemented yet.', 'warning');
      return;
    }

    // For L156 we create a logical onboard printer entry and set it as default.
    const now = Date.now();
    const printer: Printer = {
      name: option.name,
      macAddress: option.id,
      address: option.id,
      size: '58mm',
      characters: 32,
      printing: true,
      printerType: 'OB',
      model: option.name,
      driver: option.driver,
      connection: 'bluetooth',
      deviceId: `onboard-${option.id}`,
      paperCutter: true,
      cashDrawer: false,
      categories: [],
      active: true,
      createdAt: now,
      updatedAt: now
    };

    await this.printService.addPrinter(printer);
    await this.printService.setDefaultPrinter(printer);
    this.showToast(`${option.name} set as default printer`, 'success');
  }

  /**
   * Add a network (IP) printer manually
   */
  async addNetworkPrinter() {
    const alert = await this.alertCtrl.create({
      header: 'Add Network Printer',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Printer name (e.g. Kitchen Printer)'
        },
        {
          name: 'address',
          type: 'text',
          placeholder: 'IP:Port (e.g. 192.168.0.50:9100)'
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
            const name = (data.name || '').trim();
            const address = (data.address || '').trim();

            if (!name || !address) {
              this.showToast('Name and address are required', 'danger');
              return false;
            }

            const printer: Printer = {
              name,
              macAddress: address,
              address,
              size: '58mm',
              characters: 32,
              printing: true,
              printerType: 'Network',
              model: 'Generic',
              deviceId: address,
              paperCutter: true,
              cashDrawer: false,
              categories: [],
              active: true,
              driver: 'escpos-generic',
              connection: 'network',
              createdAt: Date.now(),
              updatedAt: Date.now()
            };

            await this.printService.addPrinter(printer);
            await this.printService.setDefaultPrinter(printer);
            this.showToast('Network printer saved and set as default', 'success');
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Scan for Bluetooth printers
   */
  async scanForPrinters() {
    // Check permissions first
    const hasPermission = await this.printService.checkBluetoothPermissions();
    if (!hasPermission) {
      const alert = await this.alertCtrl.create({
        header: 'Bluetooth Permission Required',
        message: this.lastError() || 'Please enable Bluetooth and grant permissions to scan for printers.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Scanning for printers...',
      duration: 6000 // Slightly longer than scan timeout
    });
    await loading.present();

    try {
      const printers = await this.printService.listBluetoothDevices();
      await loading.dismiss();

      if (printers.length === 0) {
        const alert = await this.alertCtrl.create({
          header: 'No Printers Found',
          message: 'No Bluetooth printers were detected. Please ensure your printer is:<br>• Turned on<br>• In pairing mode<br>• Within range (< 10 meters)',
          buttons: ['OK']
        });
        await alert.present();
      } else {
        this.showToast(`Found ${printers.length} printer${printers.length !== 1 ? 's' : ''}`, 'success');
      }
    } catch (error: any) {
      await loading.dismiss();
      console.error('Scan error:', error);
      
      const alert = await this.alertCtrl.create({
        header: 'Scan Failed',
        message: error.message || 'Could not scan for printers. Please check Bluetooth settings.',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  /**
   * Connect to a printer
   */
  async connectToPrinter(printer: Printer) {
    const loading = await this.loadingCtrl.create({
      message: 'Connecting to printer...',
      duration: 15000 // Account for retries
    });
    await loading.present();

    try {
      const success = await this.printService.connect(printer);
      await loading.dismiss();

      if (success) {
        this.showToast(`Connected to ${printer.name}`, 'success');
      } else {
        this.showToast('Connection failed', 'danger');
      }
    } catch (error: any) {
      await loading.dismiss();
      console.error('Connection error:', error);
      
      const alert = await this.alertCtrl.create({
        header: 'Connection Failed',
        message: error.message || 'Could not connect to printer. Please try again.',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Retry',
            handler: () => {
              this.connectToPrinter(printer);
            }
          }
        ]
      });
      await alert.present();
    }
  }

  /**
   * Disconnect from printer
   */
  async disconnectPrinter() {
    try {
      await this.printService.disconnect();
      this.showToast('Printer disconnected', 'medium');
    } catch (error: any) {
      console.error('Disconnect error:', error);
      // Still show success since disconnect usually works even with errors
      this.showToast('Printer disconnected', 'medium');
    }
  }

  /**
   * Test print
   */
  async testPrint() {
    const loading = await this.loadingCtrl.create({
      message: 'Printing test receipt...',
      duration: 35000 // Account for print timeout
    });
    await loading.present();

    try {
      const success = await this.printService.testPrint();
      await loading.dismiss();

      if (success) {
        const alert = await this.alertCtrl.create({
          header: 'Test Print Sent',
          message: 'Test receipt sent successfully! Check your printer for output.',
          buttons: ['OK']
        });
        await alert.present();
      } else {
        throw new Error('Print failed');
      }
    } catch (error: any) {
      await loading.dismiss();
      console.error('Test print error:', error);
      
      const alert = await this.alertCtrl.create({
        header: 'Print Failed',
        message: error.message || 'Could not print test receipt. Please check printer connection.',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Retry',
            handler: () => {
              this.testPrint();
            }
          }
        ]
      });
      await alert.present();
    }
  }

  /**
   * Save settings
   */
  async saveSettings() {
    const loading = await this.loadingCtrl.create({
      message: 'Saving settings...',
      duration: 3000
    });
    await loading.present();

    try {
      await this.printService.savePrinterSettings(this.settings());
      await loading.dismiss();
      this.showToast('Settings saved successfully', 'success');
    } catch (error: any) {
      await loading.dismiss();
      console.error('Save error:', error);
      this.showToast('Error saving settings', 'danger');
    }
  }

  /**
   * Update local setting
   */
  updateSetting(key: keyof PrinterSettings, value: any) {
    const current = this.settings();
    this.settings.set({
      ...current,
      [key]: value
    });
  }

  onExtraBottomLinesChange(event: any) {
    const raw = Number(event.detail.value);
    const value = isNaN(raw) ? 0 : Math.max(0, raw);
    this.updateSetting('extraBottomFeedLines', value);
  }

  /**
   * Update business info
   */
  updateBusinessInfo(key: string, value: string) {
    const current = this.settings();
    this.settings.set({
      ...current,
      businessInfo: {
        ...current.businessInfo,
        [key]: value
      }
    });
  }

  /**
   * Refresh printers list
   */
  async handleRefresh(event: any) {
    await this.scanForPrinters();
    event.target.complete();
  }

  /**
   * Show toast message
   */
  private async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'medium' = 'medium') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  /**
   * Back navigation
   */
  goBack() {
    this.navCtrl.back();
  }
}
