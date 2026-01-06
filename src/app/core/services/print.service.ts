import { Injectable, signal, inject } from '@angular/core';
import { Platform } from '@ionic/angular/standalone';
import { BleClient, BleDevice, numberToUUID } from '@capacitor-community/bluetooth-le';
import { StorageService } from './storage.service';
import { SettingsService } from './settings.service';
import { Printer, PrinterSettings, ReceiptData, CartItem, Table, KitchenOrder } from '../../models';
import { ESC_POS_COMMANDS, PrinterCommands } from './printer-commands';
import { NetworkPrinter } from '../plugins/network-printer.plugin';
import { Q1Printer } from '../plugins/q1-printer.plugin';
import { L156Printer } from '../plugins/l156-printer.plugin';

@Injectable({
  providedIn: 'root'
})
export class PrintService {
  private platform = inject(Platform);
  private storage = inject(StorageService);
  private settings = inject(SettingsService);

  // Printer state
  printers = signal<Printer[]>([]);
  defaultPrinter = signal<Printer | null>(null);
  printerSettings = signal<PrinterSettings>({
    autoPrint: false,
    printCopies: 1,
    openCashDrawer: false,
    autoCut: true,
    printLogo: false,
    paperWidth: 58,
    fontSize: 'normal',
    businessInfo: {
      name: 'POS System',
      address: '',
      phone: '',
      email: '',
      taxNumber: '',
      taxId: ''
    },
    receiptFooter: 'Thank you for your business!'
  });

  isPrinting = signal<boolean>(false);
  isConnected = signal<boolean>(false);
  isScanning = signal<boolean>(false);
  lastError = signal<string | null>(null);
  
  // Bluetooth state
  private connectedDevice: BleDevice | null = null;
  private readonly PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
  private readonly PRINTER_WRITE_CHAR_UUID = '00002af1-0000-1000-8000-00805f9b34fb';
  
  // Retry configuration
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // ms
  private readonly SCAN_TIMEOUT = 5000; // ms
  private readonly CONNECT_TIMEOUT = 10000; // ms
  private readonly PRINT_TIMEOUT = 30000; // ms

  constructor() {
    this.loadPrinterSettings();
    this.initializeBluetooth();
  }

  /**
   * Simple kitchen ticket printing for hospitality mode.
   * Groups items by mapped kitchen printer (category-based mapping for now)
   * and prints a lightweight kitchen order per printer.
   */
  async printKitchenTickets(context: {
    table: Pick<Table, 'number' | 'guestName' | 'guestCount' | 'waiterName'>;
    items: CartItem[];
  }, targetPrinter?: Printer | string): Promise<void> {
    const printer = this.resolveTargetPrinter(targetPrinter);
    if (!printer || !printer.printing) {
      console.warn('No printer configured for kitchen tickets');
      return;
    }

    const now = new Date();
    const headerLines: string[] = [];
    headerLines.push('*** KITCHEN ORDER ***');
    headerLines.push(`Table: ${context.table.number}`);
    if (context.table.guestName) {
      headerLines.push(`Guest: ${context.table.guestName}`);
    }
    if (context.table.guestCount) {
      headerLines.push(`Guests: ${context.table.guestCount}`);
    }
    if (context.table.waiterName) {
      headerLines.push(`Waiter: ${context.table.waiterName}`);
    }
    headerLines.push(now.toLocaleString());
    headerLines.push('');

    const itemLines = context.items.map(item => {
      const qty = item.quantity || item.Quantity || 1;
      const name = item.name || item.product?.name || '';
      return `${qty} x ${name}`;
    });

    const footerLines = ['','--------------------------','END OF ORDER'];
    const raw = [...headerLines, ...itemLines, ...footerLines].join('\n');

    try {
      this.isPrinting.set(true);
      await Promise.race([
        this.sendToPrinter(raw, printer),
        this.timeoutPromise(this.PRINT_TIMEOUT, 'Kitchen print timeout')
      ]);
    } catch (error) {
      console.error('Kitchen print error:', error);
    } finally {
      this.isPrinting.set(false);
    }
  }

  /**
   * Initialize Bluetooth
   */
  private async initializeBluetooth(): Promise<void> {
    try {
      await BleClient.initialize();
      console.log('Bluetooth initialized');
      this.lastError.set(null);
    } catch (error) {
      const errorMsg = 'Bluetooth initialization failed. Please enable Bluetooth and grant permissions.';
      console.error('Bluetooth initialization error:', error);
      this.lastError.set(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Check Bluetooth permissions and availability
   */
  async checkBluetoothPermissions(): Promise<boolean> {
    try {
      // Try to initialize - this will request permissions if needed
      await BleClient.initialize();
      
      // On Android, check if Bluetooth is enabled
      if (this.platform.is('android')) {
        try {
          // If we can scan, Bluetooth is enabled
          await BleClient.requestLEScan({}, () => {});
          await BleClient.stopLEScan();
        } catch (error: any) {
          if (error?.message?.includes('disabled') || error?.message?.includes('off')) {
            this.lastError.set('Bluetooth is disabled. Please enable Bluetooth in your device settings.');
            return false;
          }
        }
      }
      
      this.lastError.set(null);
      return true;
    } catch (error: any) {
      let errorMsg = 'Unable to access Bluetooth.';
      
      if (error?.message?.includes('permission')) {
        errorMsg = 'Bluetooth permission denied. Please grant Bluetooth permissions in app settings.';
      } else if (error?.message?.includes('not available')) {
        errorMsg = 'Bluetooth is not available on this device.';
      }
      
      this.lastError.set(errorMsg);
      console.error('Bluetooth permission check failed:', error);
      return false;
    }
  }

  /**
   * Load printer settings from storage
   */
  private async loadPrinterSettings(): Promise<void> {
    try {
      const [defaultPrinter, settings, printersList] = await Promise.all([
        this.storage.get<Printer>('default-printer'),
        this.storage.get<PrinterSettings>('printer-settings'),
        this.storage.get<Printer[]>('printers-list')
      ]);

      if (defaultPrinter) {
        this.defaultPrinter.set(defaultPrinter);
      }

      if (settings) {
        this.printerSettings.set(settings);
      }

      if (printersList && printersList.length > 0) {
        this.printers.set(printersList);
      }
    } catch (error) {
      console.error('Error loading printer settings:', error);
    }
  }

  /**
   * Save printer settings
   */
  async savePrinterSettings(settings: Partial<PrinterSettings>): Promise<void> {
    const current = this.printerSettings();
    const updated = { ...current, ...settings };
    
    this.printerSettings.set(updated);
    await this.storage.set('printer-settings', updated);
  }

  /**
   * Save printers list
   */
  async savePrintersList(): Promise<void> {
    const printersList = this.printers();
    await this.storage.set('printers-list', printersList);
  }

  /**
   * Add printer to list
   */
  async addPrinter(printer: Printer): Promise<void> {
    const current = this.printers();
    const exists = current.find(p => p.deviceId === printer.deviceId);
    
    if (!exists) {
      this.printers.set([...current, printer]);
      await this.savePrintersList();
    }
  }

  /**
   * Remove printer from list
   */
  async removePrinter(deviceId: string): Promise<void> {
    const current = this.printers();
    const updated = current.filter(p => p.deviceId !== deviceId);
    this.printers.set(updated);
    await this.savePrintersList();

    // Clear default if removing default printer
    if (this.defaultPrinter()?.deviceId === deviceId) {
      this.defaultPrinter.set(null);
      await this.storage.remove('default-printer');
    }
  }

  /**
   * Set default printer
   */
  async setDefaultPrinter(printer: Printer): Promise<void> {
    this.defaultPrinter.set(printer);
    await this.storage.set('default-printer', printer);
  }

  /**
   * List available Bluetooth devices
   */
  async listBluetoothDevices(): Promise<Printer[]> {
    try {
      this.isScanning.set(true);
      this.lastError.set(null);
      const devices: Printer[] = [];

      // Check permissions first
      const hasPermission = await this.checkBluetoothPermissions();
      if (!hasPermission) {
        this.isScanning.set(false);
        throw new Error(this.lastError() || 'Bluetooth permission required');
      }

      // Request Bluetooth permissions
      await BleClient.initialize();

      // Scan for devices with timeout
      const scanPromise = BleClient.requestLEScan(
        {},
        (result) => {
          // Filter for printer-like devices
          if (result.device.name && this.isPrinterDevice(result.device.name)) {
            const printer: Printer = {
              name: result.device.name || 'Unknown Printer',
              macAddress: result.device.deviceId,
              address: result.device.deviceId,
              size: '58mm', // Default, can be configured
              characters: 32,
              printing: true,
              printerType: 'BT',
              model: this.detectPrinterModel(result.device.name || ''),
              deviceId: result.device.deviceId,
              paperCutter: true,
              cashDrawer: false,
              active: true
            };

            // Avoid duplicates
            if (!devices.find(d => d.deviceId === printer.deviceId)) {
              devices.push(printer);
              console.log('Found printer:', printer.name);
            }
          }
        }
      );

      // Wait for scan timeout
      await Promise.race([
        scanPromise,
        this.delay(this.SCAN_TIMEOUT)
      ]);
      
      await this.delay(this.SCAN_TIMEOUT);
      
      try {
        await BleClient.stopLEScan();
      } catch (stopError) {
        console.warn('Error stopping scan:', stopError);
      }

      this.isScanning.set(false);
      this.printers.set(devices);
      
      if (devices.length === 0) {
        this.lastError.set('No printers found. Make sure your printer is on and in pairing mode.');
      }
      
      return devices;
    } catch (error: any) {
      console.error('Bluetooth scan error:', error);
      this.isScanning.set(false);
      
      let errorMsg = 'Failed to scan for printers.';
      if (error?.message?.includes('permission')) {
        errorMsg = 'Bluetooth permission denied. Please grant permissions in settings.';
      } else if (error?.message?.includes('disabled')) {
        errorMsg = 'Bluetooth is disabled. Please enable Bluetooth.';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      this.lastError.set(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Check if device name suggests it's a printer
   */
  private isPrinterDevice(name: string): boolean {
    const printerKeywords = [
      'printer', 'print', 'pos', 'receipt',
      'datecs', 'epson', 'star', 'bixolon',
      'thermal', 'bluebamboo', 'rpp', 'inner'
    ];
    
    const nameLower = name.toLowerCase();
    return printerKeywords.some(keyword => nameLower.includes(keyword));
  }

  /**
   * Detect printer model from device name
   */
  private detectPrinterModel(name: string): string {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('datecs')) return 'Datecs';
    if (nameLower.includes('epson')) return 'Epson';
    if (nameLower.includes('star')) return 'Star';
    if (nameLower.includes('bixolon')) return 'Bixolon';
    if (nameLower.includes('bluebamboo')) return 'BlueBamboo';
    
    return 'Generic';
  }

  /**
   * Connect to printer with retry logic
   */
  async connect(printer: Printer, retries = 0): Promise<boolean> {
    try {
      this.lastError.set(null);
      
      if (printer.printerType === 'BT') {
        // Check permissions first
        const hasPermission = await this.checkBluetoothPermissions();
        if (!hasPermission) {
          throw new Error(this.lastError() || 'Bluetooth permission required');
        }

        // Connect with timeout
        const connectPromise = BleClient.connect(
          printer.deviceId!,
          (deviceId) => {
            console.log('Printer disconnected:', deviceId);
            this.isConnected.set(false);
            this.connectedDevice = null;
            this.lastError.set('Printer disconnected unexpectedly');
          }
        );

        // Wait for connection with timeout
        await Promise.race([
          connectPromise,
          this.timeoutPromise(this.CONNECT_TIMEOUT, 'Connection timeout')
        ]);

        this.connectedDevice = {
          deviceId: printer.deviceId!,
          name: printer.name
        };

        this.isConnected.set(true);
        
        // Save as default and add to list
        await this.setDefaultPrinter(printer);
        await this.addPrinter(printer);
        
        console.log('Connected to printer:', printer.name);
        return true;
      } else if (printer.printerType === 'Network') {
        // Network printer connection (future implementation)
        console.log('Connecting to network printer:', printer.address);
        this.isConnected.set(true);
        await this.setDefaultPrinter(printer);
        await this.addPrinter(printer);
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('Printer connection error:', error);
      this.isConnected.set(false);
      
      let errorMsg = 'Failed to connect to printer.';
      
      if (error?.message?.includes('timeout')) {
        errorMsg = 'Connection timeout. Make sure the printer is on and in range.';
      } else if (error?.message?.includes('permission')) {
        errorMsg = 'Bluetooth permission denied.';
      } else if (error?.message?.includes('not found')) {
        errorMsg = 'Printer not found. It may be out of range or turned off.';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      // Retry logic
      if (retries < this.MAX_RETRIES && !error?.message?.includes('permission')) {
        console.log(`Retrying connection (${retries + 1}/${this.MAX_RETRIES})...`);
        await this.delay(this.RETRY_DELAY * (retries + 1)); // Exponential backoff
        return this.connect(printer, retries + 1);
      }
      
      this.lastError.set(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Disconnect from printer
   */
  async disconnect(): Promise<void> {
    try {
      if (this.connectedDevice) {
        await BleClient.disconnect(this.connectedDevice.deviceId);
        console.log('Disconnected from printer');
        this.connectedDevice = null;
      }
      this.isConnected.set(false);
      this.lastError.set(null);
    } catch (error: any) {
      console.error('Disconnect error:', error);
      this.isConnected.set(false);
      this.connectedDevice = null;
      // Don't throw on disconnect errors - always mark as disconnected
      if (error?.message && !error.message.includes('not connected')) {
        this.lastError.set('Error during disconnect, but printer is now disconnected.');
      }
    }
  }

  /**
   * Get line width based on paper size
   */
  private getLineWidth(): number {
    const settings = this.printerSettings();
    return settings.paperWidth === 58 ? 32 : 48;
  }

  /**
   * Build receipt content
   */
  private buildReceipt(data: ReceiptData): string {
    const settings = this.printerSettings();
    const width = this.getLineWidth();
    const cmd = ESC_POS_COMMANDS;
    let receipt = '';

    // Initialize printer
    receipt += cmd.HARDWARE.HW_INIT;

    // Business name (centered, large)
    receipt += cmd.TEXT_FORMAT.TXT_4SQUARE;
    receipt += cmd.TEXT_FORMAT.TXT_ALIGN_CT;
    if (settings.businessInfo.name) {
      const nameLines = PrinterCommands.wrapText(settings.businessInfo.name, 16);
      receipt += nameLines.join(cmd.EOL).toUpperCase();
      receipt += cmd.EOL;
    }

    // Business details (centered, normal)
    receipt += cmd.TEXT_FORMAT.TXT_NORMAL;
    if (settings.businessInfo.address) {
      const addressLines = PrinterCommands.wrapText(settings.businessInfo.address, 24);
      receipt += addressLines.join(cmd.EOL);
      receipt += cmd.EOL;
    }

    if (settings.businessInfo.taxId) {
      receipt += 'TPIN: ' + settings.businessInfo.taxId;
      receipt += cmd.EOL;
    }

    if (settings.businessInfo.email) {
      receipt += settings.businessInfo.email;
      receipt += cmd.EOL;
    }

    if (settings.businessInfo.phone) {
      receipt += settings.businessInfo.phone;
      receipt += cmd.EOL;
    }

    // Date and time
    const date = this.formatDate(data.timestamp);
    const time = this.formatTime(data.timestamp);
    receipt += date + ' - ' + time;
    receipt += cmd.EOL;

    // Invoice number
    if (data.orderNumber || data.invoice_no) {
      receipt += 'Invoice: #' + (data.orderNumber || data.invoice_no);
      receipt += cmd.EOL;
    }

    // Cashier
    if (data.user) {
      receipt += 'Cashier: ' + data.user;
      receipt += cmd.EOL;
    }

    receipt += cmd.EOL;

    // Separator line
    receipt += PrinterCommands.horizontalLine(width);

    // Items section (left aligned)
    receipt += cmd.TEXT_FORMAT.TXT_ALIGN_LT;

    for (const item of data.items) {
      const qty = item.quantity || item.qty || 0;
      const itemLines = PrinterCommands.formatItemLine(
        item.name,
        qty,
        item.price,
        item.total,
        width
      );
      receipt += itemLines.join(cmd.EOL);
      receipt += cmd.EOL;
    }

    // Separator
    receipt += PrinterCommands.horizontalLine(width);

    // Totals section (right aligned)
    receipt += cmd.TEXT_FORMAT.TXT_ALIGN_RT;

    if (data.subtotal) {
      receipt += PrinterCommands.twoColumn('Subtotal:', data.subtotal.toFixed(2), width);
      receipt += cmd.EOL;
    }

    if (data.tax > 0) {
      receipt += PrinterCommands.twoColumn('Tax:', data.tax.toFixed(2), width);
      receipt += cmd.EOL;
    }

    if (data.discount > 0) {
      receipt += PrinterCommands.twoColumn('Discount:', data.discount.toFixed(2), width);
      receipt += cmd.EOL;
    }

    // Total (bold)
    receipt += cmd.TEXT_FORMAT.TXT_BOLD_ON;
    const total = data.total || data.grandTotal || 0;
    receipt += PrinterCommands.twoColumn('Total:', total.toFixed(2), width);
    receipt += cmd.TEXT_FORMAT.TXT_BOLD_OFF;
    receipt += cmd.EOL;

    // Payments
    if (data.payments && data.payments.length > 0) {
      receipt += cmd.EOL;
      data.payments.forEach(payment => {
        const method = payment.paymentOption || payment.type || 'Payment';
        receipt += PrinterCommands.twoColumn(method + ':', payment.amount.toFixed(2), width);
        receipt += cmd.EOL;
      });
    } else {
      receipt += cmd.EOL;
      receipt += PrinterCommands.twoColumn(data.paymentMethod + ':', data.amountPaid.toFixed(2), width);
      receipt += cmd.EOL;
    }

    // Change
    if (data.change > 0 || (data.changeTotal && data.changeTotal > 0)) {
      const change = data.change || data.changeTotal || 0;
      receipt += PrinterCommands.twoColumn('Change:', change.toFixed(2), width);
      receipt += cmd.EOL;
    }

    // Balance (for account sales)
    if (data.balance !== undefined && data.balance > 0) {
      receipt += PrinterCommands.twoColumn('Balance:', data.balance.toFixed(2), width);
      receipt += cmd.EOL;
    }

    // Customer info
    if (data.customer) {
      receipt += cmd.EOL;
      receipt += PrinterCommands.horizontalLine(width);
      receipt += cmd.TEXT_FORMAT.TXT_ALIGN_LT;
      receipt += 'Customer: ' + data.customer.name;
      receipt += cmd.EOL;
      if (data.customer.phone) {
        receipt += 'Phone: ' + data.customer.phone;
        receipt += cmd.EOL;
      }
      if (data.customer.balance !== undefined) {
        receipt += 'Account Balance: ' + data.customer.balance.toFixed(2);
        receipt += cmd.EOL;
      }
    }

    // Notes
    if (data.notes) {
      receipt += cmd.EOL;
      receipt += PrinterCommands.horizontalLine(width);
      receipt += cmd.TEXT_FORMAT.TXT_ALIGN_LT;
      const notesLines = PrinterCommands.wrapText(data.notes, width);
      receipt += notesLines.join(cmd.EOL);
      receipt += cmd.EOL;
    }

    // Footer
    if (settings.receiptFooter) {
      receipt += cmd.EOL;
      receipt += PrinterCommands.horizontalLine(width);
      receipt += cmd.TEXT_FORMAT.TXT_ALIGN_CT;
      const footerLines = PrinterCommands.wrapText(settings.receiptFooter, width);
      receipt += footerLines.join(cmd.EOL);
      receipt += cmd.EOL;
    }

    // Feed paper
    receipt += cmd.FEED_CONTROL.CTL_VT;
    receipt += cmd.FEED_CONTROL.CTL_VT;
    receipt += cmd.FEED_CONTROL.CTL_VT;
    receipt += cmd.FEED_CONTROL.CTL_VT;

    // Cut paper if supported
    const printer = this.defaultPrinter();
    if (printer?.paperCutter) {
      receipt += cmd.PAPER.PAPER_FULL_CUT;
    }

    // Open cash drawer if enabled
    if (settings.openCashDrawer && printer?.cashDrawer) {
      receipt += cmd.CASH_DRAWER.CD_KICK_2;
      receipt += cmd.CASH_DRAWER.CD_KICK_5;
    }

    return receipt;
  }

  /**
   * Format date
   */
  private formatDate(timestamp: string | Date): string {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  /**
   * Format time
   */
  private formatTime(timestamp: string | Date): string {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Test print - creates sample receipt data for testing
   */
  async testPrint(): Promise<boolean> {
    const printer = this.defaultPrinter();
    
    if (!printer) {
      const errorMsg = 'No printer configured. Please connect a printer first.';
      this.lastError.set(errorMsg);
      console.warn(errorMsg);
      throw new Error(errorMsg);
    }

    // Onboard printers (e.g. L156) don't require a Bluetooth connection
    if (!this.isConnected() && printer.printerType !== 'OB' && printer.driver !== 'l156') {
      const errorMsg = 'Printer not connected. Please connect to the printer first.';
      this.lastError.set(errorMsg);
      console.warn(errorMsg);
      throw new Error(errorMsg);
    }

    this.isPrinting.set(true);
    this.lastError.set(null);

    try {
      const settings = this.printerSettings();
      const testData: ReceiptData = {
        orderId: 'TEST_' + Date.now(),
        orderNumber: 'TEST-001',
        timestamp: new Date().toISOString(),
        user: 'Test Cashier',
        items: [
          {
            name: 'Test Item 1',
            quantity: 1,
            price: 10.00,
            total: 10.00
          },
          {
            name: 'Test Item 2',
            quantity: 2,
            price: 5.50,
            total: 11.00
          }
        ],
        subtotal: 21.00,
        tax: 1.89,
        discount: 0,
        total: 22.89,
        amountPaid: 25.00,
        change: 2.11,
        paymentMethod: 'Cash',
        payments: [
          {
            paymentOption: 'Cash',
            amount: 25.00
          }
        ]
      };

      const receiptData = this.buildReceipt(testData);
      
      // Print with timeout
      await Promise.race([
        this.sendToPrinter(receiptData),
        this.timeoutPromise(this.PRINT_TIMEOUT, 'Print operation timeout')
      ]);

      this.isPrinting.set(false);
      console.log('Test print successful');
      return true;
    } catch (error: any) {
      console.error('Test print error:', error);
      this.isPrinting.set(false);
      
      let errorMsg = 'Test print failed.';
      if (error?.message?.includes('timeout')) {
        errorMsg = 'Print timeout. The printer may be offline or busy.';
      } else if (error?.message?.includes('not connected')) {
        errorMsg = 'Printer connection lost. Please reconnect.';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      this.lastError.set(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Print receipt with retry logic
   */
  async printReceipt(data: ReceiptData, retries = 0): Promise<boolean> {
    const printer = this.defaultPrinter();
    
    if (!printer || !printer.printing) {
      const errorMsg = 'No printer configured or printing is disabled.';
      this.lastError.set(errorMsg);
      console.warn(errorMsg);
      return false;
    }

    if (!this.isConnected() && printer.printerType === 'BT') {
      const errorMsg = 'Printer not connected. Attempting to reconnect...';
      console.warn(errorMsg);
      
      // Try to reconnect automatically
      try {
        await this.connect(printer);
      } catch (error) {
        this.lastError.set('Failed to reconnect to printer.');
        return false;
      }
    }

    this.isPrinting.set(true);
    this.lastError.set(null);

    try {
      const receiptData = this.buildReceipt(data);
      const settings = this.printerSettings();
      
      // Print multiple copies if configured
      for (let i = 0; i < settings.printCopies; i++) {
        // Print with timeout
        await Promise.race([
          this.sendToPrinter(receiptData),
          this.timeoutPromise(this.PRINT_TIMEOUT, 'Print operation timeout')
        ]);
        
        // Small delay between copies
        if (i < settings.printCopies - 1) {
          await this.delay(500);
        }
      }

      this.isPrinting.set(false);
      console.log('Receipt printed successfully');
      return true;
    } catch (error: any) {
      console.error('Print error:', error);
      this.isPrinting.set(false);
      
      let errorMsg = 'Failed to print receipt.';
      if (error?.message?.includes('timeout')) {
        errorMsg = 'Print timeout. The printer may be offline or busy.';
      } else if (error?.message?.includes('not connected')) {
        errorMsg = 'Printer connection lost.';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      // Retry logic
      if (retries < this.MAX_RETRIES) {
        console.log(`Retrying print (${retries + 1}/${this.MAX_RETRIES})...`);
        await this.delay(this.RETRY_DELAY * (retries + 1));
        return this.printReceipt(data, retries + 1);
      }
      
      this.lastError.set(errorMsg);
      return false;
    }
  }

  /**
   * Send data to physical printer
   */
  private async sendToPrinter(data: string, targetPrinter?: Printer): Promise<void> {
    const printer = targetPrinter || this.defaultPrinter();
    
    if (!printer) {
      throw new Error('No printer configured');
    }

    // Only print on real device
    await this.platform.ready();
    const isNative = this.platform.is('cordova') || this.platform.is('capacitor');
    if (!isNative) {
      console.log('Print preview (browser mode):', data);
      return;
    }

    // Decide based on driver first (SDK/native integrations), then fallback
    // to generic transport by printerType.
    if (printer.driver === 'ocom-q1') {
      await this.printViaQ1(data);
      return;
    }

    if (printer.driver === 'l156') {
      await this.printViaL156(data);
      return;
    }

    switch (printer.printerType) {
      case 'BT':
        await this.printViaBluetooth(data);
        break;
      case 'Network':
        await this.printViaNetwork(data, printer);
        break;
      case 'USB':
        await this.printViaUSB(data);
        break;
      default:
        console.warn('Unsupported printer type:', printer.printerType);
    }
  }

  private async printViaQ1(data: string): Promise<void> {
    await this.platform.ready();
    const isNative = this.platform.is('cordova') || this.platform.is('capacitor');
    if (!isNative) {
      console.warn('Q1 printing is only available on device');
      return;
    }

    // The underlying Cordova plugin expects base64 or raw strings depending
    // on the method; for now we send the raw string and let the native side
    // handle encoding, keeping this wrapper minimal.
    try {
      await Q1Printer.printerInit();
    } catch (err) {
      console.warn('Q1 printerInit failed or not required', err);
    }

    try {
      await Q1Printer.sendRAWData({ data });
    } catch (err) {
      console.error('Q1 print failed', err);
      throw err;
    }
  }

  private async printViaL156(data: string): Promise<void> {
    await this.platform.ready();
    const isNative = this.platform.is('cordova') || this.platform.is('capacitor');
    if (!isNative) {
      console.warn('L156 printing is only available on device');
      return;
    }

    try {
      await L156Printer.printRaw({ data });
    } catch (err) {
      console.error('L156 print failed', err);
      throw err;
    }
  }

  /**
   * Print via Bluetooth with error handling
   */
  private async printViaBluetooth(data: string): Promise<void> {
    if (!this.connectedDevice) {
      throw new Error('No Bluetooth printer connected');
    }

    try {
      // Convert string to Uint8Array
      const encoder = new TextEncoder();
      const dataArray = encoder.encode(data);

      // BLE has a limitation on write size (typically 20 bytes)
      const chunkSize = 20;
      const chunks: Uint8Array[] = [];
      
      for (let i = 0; i < dataArray.length; i += chunkSize) {
        const chunk = dataArray.slice(i, Math.min(i + chunkSize, dataArray.length));
        chunks.push(chunk);
      }

      console.log(`Printing ${dataArray.length} bytes in ${chunks.length} chunks`);

      // Try multiple characteristic UUIDs for compatibility
      const characteristicUUIDs = [
        this.PRINTER_WRITE_CHAR_UUID,
        '0000ff02-0000-1000-8000-00805f9b34fb', // Common alternative
        '49535343-8841-43f4-a8d4-ecbe34729bb3', // Another common UUID
        '0000ffe1-0000-1000-8000-00805f9b34fb'  // Generic serial characteristic
      ];

      let writeSuccess = false;
      let lastError: Error | null = null;

      // Try each characteristic UUID
      for (const charUUID of characteristicUUIDs) {
        try {
          // Write chunks sequentially
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const dataView = new DataView(chunk.buffer);
            
            await BleClient.write(
              this.connectedDevice.deviceId,
              this.PRINTER_SERVICE_UUID,
              charUUID,
              dataView
            );
            
            // Progress logging for large receipts
            if (i > 0 && i % 50 === 0) {
              console.log(`Sent ${i}/${chunks.length} chunks`);
            }
            
            // Small delay between chunks to avoid overwhelming the printer
            if (i < chunks.length - 1) {
              await this.delay(10);
            }
          }
          
          writeSuccess = true;
          console.log(`Successfully printed using characteristic ${charUUID}`);
          break; // Success, exit loop
        } catch (error: any) {
          lastError = error;
          console.warn(`Failed with characteristic ${charUUID}:`, error.message);
          continue; // Try next UUID
        }
      }

      if (!writeSuccess) {
        throw new Error(
          `Failed to write to printer with all known characteristics. Last error: ${lastError?.message || 'Unknown error'}`
        );
      }
    } catch (error: any) {
      console.error('Bluetooth print error:', error);
      
      // Check if disconnected
      if (error?.message?.includes('not connected') || error?.message?.includes('disconnected')) {
        this.isConnected.set(false);
        this.connectedDevice = null;
        throw new Error('Printer connection lost during printing');
      }
      
      throw error;
    }
  }

  /**
   * Print via Network (WiFi/Ethernet)
   */
  private async printViaNetwork(data: string, printer: Printer): Promise<void> {
    await this.platform.ready();
    const isNative = this.platform.is('cordova') || this.platform.is('capacitor');
    if (!isNative) {
      console.warn('Network printing is only available on device');
      return;
    }

    const rawAddress = printer.address || printer.macAddress || printer.deviceId;
    if (!rawAddress) {
      console.error('No network address configured for printer');
      throw new Error('No network address configured for printer');
    }

    let host = rawAddress;
    let port = 9100;

    if (rawAddress.includes(':')) {
      const [h, p] = rawAddress.split(':');
      host = h;
      const parsed = parseInt(p, 10);
      if (!Number.isNaN(parsed)) {
        port = parsed;
      }
    }

    try {
      await NetworkPrinter.print({ host, port, data });
    } catch (err) {
      console.error('Network print failed', err);
      throw err;
    }
  }

  private resolveTargetPrinter(target?: Printer | string): Printer | null {
    if (!target) {
      return this.defaultPrinter();
    }

    if (typeof target !== 'string') {
      return target;
    }

    const printers = this.printers();
    const found = printers.find(p =>
      p.deviceId === target ||
      p.address === target ||
      p.macAddress === target ||
      (p as any)._id === target
    );

    return found || this.defaultPrinter();
  }

  /**
   * Print via USB
   */
  private async printViaUSB(data: string): Promise<void> {
    // TODO: Implement USB printing
    console.log('USB printing not yet implemented');
    console.log('Data to print:', data);
    throw new Error('USB printing is not yet supported');
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Timeout promise helper
   */
  private timeoutPromise(ms: number, errorMessage: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), ms);
    });
  }

  /**
   * Open cash drawer
   */
  async openCashDrawer(): Promise<void> {
    const printer = this.defaultPrinter();
    
    if (!printer?.cashDrawer) {
      console.warn('Printer does not support cash drawer');
      return;
    }

    const cmd = ESC_POS_COMMANDS;
    const drawerCommand = cmd.CASH_DRAWER.CD_KICK_2 + cmd.CASH_DRAWER.CD_KICK_5;
    
    await this.sendToPrinter(drawerCommand);
  }
}
