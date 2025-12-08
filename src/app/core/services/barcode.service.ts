/// <reference path="../../../types/capacitor-mlkit-barcode-scanning.d.ts" />

import { Injectable, signal, inject } from '@angular/core';
import { Platform } from '@ionic/angular/standalone';

// Barcode formats
export enum BarcodeFormat {
  CODE_128 = 'CODE_128',
  CODE_39 = 'CODE_39',
  CODE_93 = 'CODE_93',
  CODABAR = 'CODABAR',
  EAN_13 = 'EAN_13',
  EAN_8 = 'EAN_8',
  ITF = 'ITF',
  UPC_A = 'UPC_A',
  UPC_E = 'UPC_E',
  QR_CODE = 'QR_CODE',
  PDF_417 = 'PDF_417',
  AZTEC = 'AZTEC',
  DATA_MATRIX = 'DATA_MATRIX'
}

export interface BarcodeScanResult {
  text: string;
  format: string;
  rawValue?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BarcodeService {
  private platform = inject(Platform);

  // State
  isScanning = signal<boolean>(false);
  lastScan = signal<BarcodeScanResult | null>(null);
  scanError = signal<string | null>(null);

  // Check if barcode scanning is supported
  private barcodeScanner: any = null;

  constructor() {
    this.initializeScanner();
  }

  /**
   * Initialize barcode scanner
   */
  private async initializeScanner(): Promise<void> {
    try {
      // Dynamic import for Capacitor plugin
      if (this.platform.is('capacitor')) {
        // Try to import @capacitor-mlkit/barcode-scanning
        try {
          const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');
          this.barcodeScanner = BarcodeScanner;
          console.log('Barcode scanner initialized (ML Kit)');
        } catch (error) {
          console.warn('ML Kit barcode scanner not available, using fallback');
          // Fallback to manual input
        }
      } else {
        console.log('Barcode scanning not available in browser mode');
      }
    } catch (error) {
      console.error('Error initializing barcode scanner:', error);
    }
  }

  /**
   * Check if scanning is supported
   */
  async isSupported(): Promise<boolean> {
    if (!this.platform.is('capacitor')) {
      return false;
    }

    if (this.barcodeScanner) {
      try {
        const { supported } = await this.barcodeScanner.isSupported();
        return supported;
      } catch (error) {
        return false;
      }
    }

    return false;
  }

  /**
   * Check camera permissions
   */
  async checkPermissions(): Promise<boolean> {
    if (!this.barcodeScanner) {
      return false;
    }

    try {
      const { camera } = await this.barcodeScanner.checkPermissions();
      return camera === 'granted' || camera === 'limited';
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }

  /**
   * Request camera permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (!this.barcodeScanner) {
      this.scanError.set('Barcode scanner not available');
      return false;
    }

    try {
      const { camera } = await this.barcodeScanner.requestPermissions();
      return camera === 'granted' || camera === 'limited';
    } catch (error) {
      console.error('Error requesting permissions:', error);
      this.scanError.set('Failed to get camera permissions');
      return false;
    }
  }

  /**
   * Scan barcode
   */
  async scan(): Promise<BarcodeScanResult | null> {
    // Check if running in browser
    if (!this.platform.is('capacitor')) {
      return await this.scanFallback();
    }

    // Check if scanner is available
    if (!this.barcodeScanner) {
      return await this.scanFallback();
    }

    this.isScanning.set(true);
    this.scanError.set(null);

    try {
      // Check permissions
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          throw new Error('Camera permission denied');
        }
      }

      // Start scanning
      const { barcodes } = await this.barcodeScanner.scan({
        formats: [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.QR_CODE
        ]
      });

      if (barcodes && barcodes.length > 0) {
        const result: BarcodeScanResult = {
          text: barcodes[0].displayValue || barcodes[0].rawValue,
          format: barcodes[0].format,
          rawValue: barcodes[0].rawValue
        };

        this.lastScan.set(result);
        this.isScanning.set(false);
        return result;
      }

      this.isScanning.set(false);
      return null;
    } catch (error: any) {
      console.error('Scan error:', error);
      this.isScanning.set(false);
      
      // If user cancelled, return null
      if (error?.message?.includes('cancel')) {
        return null;
      }

      this.scanError.set(error.message || 'Failed to scan barcode');
      
      // Fallback to manual input
      return await this.scanFallback();
    }
  }

  /**
   * Fallback manual barcode entry (for browser/testing)
   */
  private async scanFallback(): Promise<BarcodeScanResult | null> {
    return new Promise((resolve) => {
      // This will be handled by the UI layer
      // Return null to indicate fallback is needed
      this.scanError.set('Scanner not available - please enter barcode manually');
      resolve(null);
    });
  }

  /**
   * Stop scanning
   */
  async stopScan(): Promise<void> {
    if (this.barcodeScanner) {
      try {
        await this.barcodeScanner.stopScan();
      } catch (error) {
        console.error('Error stopping scan:', error);
      }
    }
    this.isScanning.set(false);
  }

  /**
   * Open device settings for permissions
   */
  async openSettings(): Promise<void> {
    if (this.barcodeScanner) {
      try {
        await this.barcodeScanner.openSettings();
      } catch (error) {
        console.error('Error opening settings:', error);
      }
    }
  }

  /**
   * Check if barcode is valid
   */
  isValidBarcode(barcode: string): boolean {
    // Remove whitespace
    const cleaned = barcode.trim();

    // Check minimum length
    if (cleaned.length < 8) {
      return false;
    }

    // Check if alphanumeric
    const alphanumeric = /^[a-zA-Z0-9]+$/;
    return alphanumeric.test(cleaned);
  }

  /**
   * Format barcode for display
   */
  formatBarcode(barcode: string): string {
    const cleaned = barcode.trim();
    
    // Format based on length (common barcode formats)
    if (cleaned.length === 13) {
      // EAN-13: 123-4567890123
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    } else if (cleaned.length === 12) {
      // UPC-A: 12345-67890-1
      return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 10)}-${cleaned.slice(10)}`;
    } else if (cleaned.length === 8) {
      // EAN-8: 1234-5678
      return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    }

    return cleaned;
  }

  /**
   * Get barcode format name
   */
  getFormatName(format: string): string {
    const formatMap: { [key: string]: string } = {
      'CODE_128': 'Code 128',
      'CODE_39': 'Code 39',
      'CODE_93': 'Code 93',
      'CODABAR': 'Codabar',
      'EAN_13': 'EAN-13',
      'EAN_8': 'EAN-8',
      'ITF': 'ITF',
      'UPC_A': 'UPC-A',
      'UPC_E': 'UPC-E',
      'QR_CODE': 'QR Code',
      'PDF_417': 'PDF417',
      'AZTEC': 'Aztec',
      'DATA_MATRIX': 'Data Matrix'
    };

    return formatMap[format] || format;
  }

  /**
   * Clear last scan
   */
  clearLastScan(): void {
    this.lastScan.set(null);
  }

  /**
   * Clear error
   */
  clearError(): void {
    this.scanError.set(null);
  }
}
