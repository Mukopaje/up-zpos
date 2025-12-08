declare module '@capacitor-mlkit/barcode-scanning' {
  export interface BarcodeScanner {
    isSupported(): Promise<{ supported: boolean }>;
    scan(options?: any): Promise<{ barcodes: Array<{ rawValue: string; format: string }> }>;
    checkPermissions(): Promise<{ camera: string }>;
    requestPermissions(): Promise<{ camera: string }>;
  }
  
  export const BarcodeScanner: BarcodeScanner;
}
