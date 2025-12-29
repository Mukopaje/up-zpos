# Barcode Scanning Setup

## Installation

Install the Capacitor ML Kit Barcode Scanning plugin:

```bash
npm install @capacitor-mlkit/barcode-scanning
npx cap sync
```

## iOS Configuration

Add camera permissions to `ios/App/App/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to scan product barcodes</string>
```

## Android Configuration

No additional configuration needed. The plugin handles camera permissions automatically.

## Features

- ✅ Multiple barcode formats: EAN-13, EAN-8, UPC-A, UPC-E, CODE-128, CODE-39, QR codes
- ✅ Permission management (check/request camera access)
- ✅ Browser fallback (manual entry dialog when camera unavailable)
- ✅ Barcode validation and formatting
- ✅ Real-time scanning feedback with visual indicators

## Usage in POS

The barcode button in the POS Products page:
- Shows barcode icon when ready
- Shows spinner when scanning
- Automatically looks up product by barcode
- Falls back to manual entry on web/if scan fails

## Testing

### On Browser (Development)
The service will automatically show a manual entry dialog since camera scanning isn't available in browsers.

### On Device
1. Build and run on iOS/Android
2. Tap the barcode icon in POS Products page
3. Point camera at barcode
4. Product is automatically added to cart

## Supported Barcode Formats

- **EAN-13**: European Article Number (13 digits)
- **EAN-8**: European Article Number (8 digits)
- **UPC-A**: Universal Product Code (12 digits)
- **UPC-E**: Compact UPC (6 digits)
- **CODE-128**: High-density alphanumeric
- **CODE-39**: Standard alphanumeric
- **QR_CODE**: 2D matrix barcode
