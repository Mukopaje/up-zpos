# Settings Module

The Settings module manages system-wide configuration for the POS application.

## Overview

Settings control:
- POS appearance (tile colors, themes)
- Tax configuration (rates, calculation method)
- Business information
- Hardware integrations
- Default behaviors

## Feature Status

| Feature | Status | Documentation |
|---------|--------|---------------|
| POS Tile Colors | ✅ Complete | [pos-settings.md](./pos-settings.md) |
| Tax Configuration | 🚧 Data Model Only | [tax-configuration.md](./tax-configuration.md) |
| Business Info | ❌ Not Started | - |
| Printer Setup | ❌ Not Started | - |
| Receipt Templates | ❌ Not Started | - |

## Settings Structure

```typescript
interface Settings {
  _id: 'settings';
  type: 'settings';
  
  // POS Settings
  pos: {
    categoryTileBackgroundColor: string;
    productTileBackgroundColor: string;
    categoryTileTextColor?: string;
    productTileTextColor?: string;
    defaultView: 'category' | 'products';
  };
  
  // Tax Settings
  tax: {
    enabled: boolean;
    rate: number;              // 0.15 = 15%
    inclusive: boolean;        // true = price includes tax
    name: string;              // "VAT", "GST", "Sales Tax"
  };
  
  // Business Settings
  business: {
    name: string;
    address: string;
    phone: string;
    email: string;
    taxNumber?: string;
    logo?: string;
  };
  
  // Receipt Settings
  receipt: {
    header: string;
    footer: string;
    showTaxBreakdown: boolean;
    showBusinessInfo: boolean;
  };
  
  // Hardware Settings
  hardware: {
    printer: {
      enabled: boolean;
      type: 'thermal' | 'pdf';
      ipAddress?: string;
    };
    barcodeScanner: {
      enabled: boolean;
      prefix?: string;
      suffix?: string;
    };
  };
}
```

## Configuration Required

### 1. POS Settings Interface ✅ (Partial)

**Status:** Colors implemented, UI needed  
**Required For:** Customizing POS appearance

**Needs:**
- Settings page component
- Color picker for category tiles
- Color picker for product tiles
- Preview of tile colors
- Default view selector
- Save settings to database

**Current Implementation:**
```typescript
// In SettingsService
categoryTileBackgroundColor = signal('#FF9800');
productTileBackgroundColor = signal('#4CAF50');

// Used in POS Category page
[style.background-color]="settingsService.categoryTileBackgroundColor()"
[style.background-color]="settingsService.productTileBackgroundColor()"
```

### 2. Tax Configuration Interface ❌

**Status:** Not Implemented  
**Required For:** Setting up tax calculations

**Needs:**
- Tax enable/disable toggle
- Tax rate input (percentage)
- Tax inclusive/exclusive toggle
- Tax name input ("VAT", "GST", etc.)
- Preview of tax calculations
- Save to database

### 3. Business Information ❌

**Status:** Not Implemented  
**Required For:** Receipts, reports, branding

**Needs:**
- Business name input
- Address input (multi-line)
- Phone number input
- Email input
- Tax number input
- Logo upload
- Preview of receipt header

### 4. Receipt Templates ❌

**Status:** Not Implemented  
**Required For:** Customizing printed receipts

**Needs:**
- Header text editor
- Footer text editor
- Show/hide toggles for sections
- Font size controls
- Receipt preview
- Print test receipt

### 5. Hardware Configuration ❌

**Status:** Not Implemented  
**Required For:** Printer and scanner setup

**Needs:**
- Printer type selector (thermal/PDF)
- Printer IP address input
- Test print button
- Barcode scanner enable toggle
- Scanner prefix/suffix configuration
- Scanner test input

## Database Storage

### Settings Document

```json
{
  "_id": "settings",
  "type": "settings",
  "pos": {
    "categoryTileBackgroundColor": "#FF9800",
    "productTileBackgroundColor": "#4CAF50",
    "categoryTileTextColor": "#FFFFFF",
    "productTileTextColor": "#FFFFFF",
    "defaultView": "category"
  },
  "tax": {
    "enabled": true,
    "rate": 0.15,
    "inclusive": true,
    "name": "VAT"
  },
  "business": {
    "name": "My Store",
    "address": "123 Main St\nCity, State 12345",
    "phone": "+1-555-1234",
    "email": "info@mystore.com",
    "taxNumber": "TAX123456789",
    "logo": "data:image/png;base64,..."
  },
  "receipt": {
    "header": "Thank you for your purchase!",
    "footer": "Please come again",
    "showTaxBreakdown": true,
    "showBusinessInfo": true
  },
  "hardware": {
    "printer": {
      "enabled": true,
      "type": "thermal",
      "ipAddress": "192.168.1.100"
    },
    "barcodeScanner": {
      "enabled": true,
      "prefix": "",
      "suffix": "\n"
    }
  }
}
```

## Usage in Application

### Accessing Settings

```typescript
// In a component
import { SettingsService } from '@app/core/services/settings.service';

export class MyComponent {
  constructor(private settingsService: SettingsService) {}
  
  ngOnInit() {
    // Get current settings
    const categoryColor = this.settingsService.categoryTileBackgroundColor();
    const productColor = this.settingsService.productTileBackgroundColor();
    
    // Use in template
    // [style.background-color]="settingsService.categoryTileBackgroundColor()"
  }
}
```

### Updating Settings

```typescript
// In SettingsService or Settings page
async updatePOSColors(categoryColor: string, productColor: string) {
  // Update signals
  this.categoryTileBackgroundColor.set(categoryColor);
  this.productTileBackgroundColor.set(productColor);
  
  // Update database
  const settings = await this.dbService.getSettings();
  settings.pos.categoryTileBackgroundColor = categoryColor;
  settings.pos.productTileBackgroundColor = productColor;
  await this.dbService.saveSettings(settings);
}
```

## Settings Categories

### 1. POS Settings
- Tile colors (category, product)
- Tile text colors
- Default view on load
- Grid layout preferences
- Keyboard shortcuts enabled/disabled

**Documentation:** [pos-settings.md](./pos-settings.md)

### 2. Tax Settings
- Tax enabled/disabled
- Tax rate (percentage)
- Tax inclusive vs exclusive
- Tax name/label
- Multiple tax rates (future)

**Documentation:** [tax-configuration.md](./tax-configuration.md)

### 3. Business Settings
- Business name
- Address
- Contact information
- Tax registration number
- Logo

### 4. Receipt Settings
- Header message
- Footer message
- Show/hide tax breakdown
- Show/hide business info
- Font size
- Paper width

### 5. Hardware Settings
- Printer configuration
- Barcode scanner setup
- Cash drawer integration (future)
- Customer display (future)

## Configuration UI Layout

### Settings Page Structure

```
┌─────────────────────────────────────┐
│ Settings                            │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ [POS]  [Tax]  [Business]        │ │
│ │ [Receipt]  [Hardware]           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ─── POS Settings ───                │
│                                     │
│ Category Tile Color:                │
│ [🎨 #FF9800] ┌──────┐              │
│              │      │ Preview       │
│              └──────┘               │
│                                     │
│ Product Tile Color:                 │
│ [🎨 #4CAF50] ┌──────┐              │
│              │      │ Preview       │
│              └──────┘               │
│                                     │
│ Default View:                       │
│ ● Category View                     │
│ ○ Products View                     │
│                                     │
│ [Save Changes]                      │
└─────────────────────────────────────┘
```

### Tax Settings Tab

```
┌─────────────────────────────────────┐
│ Tax Configuration                   │
├─────────────────────────────────────┤
│ ☑ Enable Tax                        │
│                                     │
│ Tax Rate: [___]%                    │
│           (e.g., 15 for 15%)        │
│                                     │
│ Tax Name: [___________]             │
│           (e.g., "VAT", "GST")      │
│                                     │
│ Calculation Method:                 │
│ ● Tax Inclusive (Price includes tax)│
│ ○ Tax Exclusive (Tax added at end) │
│                                     │
│ ─── Preview ───                     │
│                                     │
│ Product Price: $10.00               │
│                                     │
│ Tax Inclusive:                      │
│ Subtotal: $8.70                     │
│ VAT (15%): $1.30                    │
│ Total: $10.00                       │
│                                     │
│ Tax Exclusive:                      │
│ Subtotal: $10.00                    │
│ VAT (15%): $1.50                    │
│ Total: $11.50                       │
│                                     │
│ [Save Changes]                      │
└─────────────────────────────────────┘
```

## Best Practices

### 1. Default Values

Always provide sensible defaults:
```typescript
const DEFAULT_SETTINGS = {
  pos: {
    categoryTileBackgroundColor: '#FF9800',
    productTileBackgroundColor: '#4CAF50',
    defaultView: 'category'
  },
  tax: {
    enabled: false,
    rate: 0.15,
    inclusive: true,
    name: 'VAT'
  }
};
```

### 2. Validation

Validate settings before saving:
```typescript
// Tax rate must be between 0 and 100
if (taxRate < 0 || taxRate > 100) {
  throw new Error('Tax rate must be between 0% and 100%');
}

// Color must be valid hex
if (!/^#[0-9A-F]{6}$/i.test(color)) {
  throw new Error('Invalid color format');
}
```

### 3. Live Preview

Show changes in real-time before saving:
```typescript
// Update preview immediately on color change
onColorChange(color: string) {
  this.previewColor = color;
  // Don't save yet, just update preview
}

onSave() {
  // Save to database
  this.settingsService.updatePOSColors(this.previewColor);
}
```

### 4. Reset to Defaults

Provide a reset option:
```typescript
resetToDefaults() {
  const confirmed = confirm('Reset all settings to defaults?');
  if (confirmed) {
    this.settingsService.resetToDefaults();
  }
}
```

## Implementation Checklist

### Phase 1: Settings Page UI ❌
- [ ] Create SettingsPage component
- [ ] Add tab navigation (POS, Tax, Business, Receipt, Hardware)
- [ ] Add routing to settings page
- [ ] Add settings icon in menu

### Phase 2: POS Settings ✅ (Partial)
- [x] SettingsService with color signals
- [x] POS Category page uses colors
- [ ] Color picker component
- [ ] Preview of tiles
- [ ] Save button
- [ ] Reset to defaults button

### Phase 3: Tax Settings ❌
- [ ] Tax enable toggle
- [ ] Tax rate input
- [ ] Tax inclusive/exclusive toggle
- [ ] Tax name input
- [ ] Tax calculation preview
- [ ] Save tax settings

### Phase 4: Business Settings ❌
- [ ] Business info form
- [ ] Logo upload
- [ ] Preview of receipt header with business info
- [ ] Save business settings

### Phase 5: Receipt Settings ❌
- [ ] Header/footer text editors
- [ ] Show/hide toggles
- [ ] Receipt preview component
- [ ] Save receipt settings

### Phase 6: Hardware Settings ❌
- [ ] Printer configuration
- [ ] Test print button
- [ ] Barcode scanner setup
- [ ] Test scanner input
- [ ] Save hardware settings

---

**Related Documentation:**
- [POS Settings](./pos-settings.md)
- [Tax Configuration](./tax-configuration.md)
- [POS Module](../pos/README.md)
