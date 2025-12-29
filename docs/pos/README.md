# POS Module Documentation

The POS (Point of Sale) module provides interfaces for selling products and processing transactions.

## Available POS Modes

ZPOS supports three different POS modes, each optimized for different business types:

### 1. POS Category (`/pos-category`)
**Best for:** Retail stores, cafes, bars with product categories

**Layout:** Three-column design
- **Left Column (400px):** Cart and checkout
- **Middle Column (120-240px):** Category tiles with pagination
- **Right Column (remaining):** Product tiles

**Features:**
- Category-based product browsing
- Paginated categories (10 per page, 1-2 columns)
- Keyboard input for quantity and search
- Cross-category global search
- Configurable tile colors for categories and products
- Mobile-responsive with view switching

**Configuration Required:**
- Category tile background color (Settings)
- Product tile background color (Settings)
- Category images (optional)
- Product images (optional)

### 2. POS Retail (`/pos-retail`)
**Best for:** Fast-moving retail with barcode scanning

**Features:**
- Barcode scanner integration
- Quick access favorites (top 12 products)
- Fast checkout workflow
- Hold/recall transactions

### 3. POS Hospitality (`/pos-hospitality`)
**Best for:** Restaurants, hotels, bars

**Features:**
- Table management
- Waiter assignment
- Course-based ordering
- Kitchen order printing
- Table transfer/merge

## Common Features

All POS modes support:
- Multiple payment methods (cash, card, mobile, credit)
- Customer selection
- Tax calculation (inclusive/exclusive)
- Discount application (with permissions)
- Receipt printing
- Order history

## Navigation

- [Keyboard Shortcuts](./keyboard-shortcuts.md)
- [POS Category Guide](./pos-category.md)
- [POS Retail Guide](./pos-retail.md)
- [POS Hospitality Guide](./pos-hospitality.md)
