# Product Bundles

Product bundles allow selling items in packs or multipacks with volume pricing.

## Use Cases

**Beverages:**
- Beer: Single, 6-Pack, 12-Pack, Case (24)
- Water: Single, 6-Pack, Crate (24)
- Soda: Single, 4-Pack, 12-Pack

**Groceries:**
- Eggs: Half Dozen (6), Dozen (12), Tray (30)
- Bread: Single Loaf, Pack of 3, Pack of 6
- Yogurt: Single, 4-Pack, 8-Pack

**Retail:**
- Batteries: Pack of 2, Pack of 4, Pack of 8
- Light Bulbs: Single, Twin Pack, 4-Pack

## Data Model

```typescript
interface ProductBundle {
  id: string;              // Unique identifier
  name: string;            // Display name (e.g., "6-Pack", "Dozen")
  quantity: number;        // Number of items in bundle
  priceMultiplier: number; // Price for entire bundle (often discounted)
  active: boolean;         // Whether this bundle is available
}
```

## How It Works

### Price Calculation

Bundles use a **quantity × price multiplier** system:

```typescript
// Base product price (single unit)
const product = {
  name: "Beer - Castle Lager",
  price: 3.00  // Price for 1 bottle
};

// Bundles
const bundles = [
  { name: "Single", quantity: 1, priceMultiplier: 1.0 },     // $3.00
  { name: "6-Pack", quantity: 6, priceMultiplier: 5.5 },     // $16.50 (8% discount)
  { name: "12-Pack", quantity: 12, priceMultiplier: 10.5 },  // $31.50 (13% discount)
  { name: "Case", quantity: 24, priceMultiplier: 20.0 }      // $60.00 (17% discount)
];

// Final price calculation
finalPrice = product.price × bundle.quantity × bundle.priceMultiplier;

// Or simpler: bundle.priceMultiplier already includes quantity discount
finalPrice = product.price × bundle.priceMultiplier;
```

### Example: Beer Packs

```typescript
const product = {
  name: "Castle Lager",
  price: 3.00,  // Single bottle
  bundles: [
    {
      id: "bun-001",
      name: "Single",
      quantity: 1,
      priceMultiplier: 1.0,   // $3.00 (no discount)
      active: true
    },
    {
      id: "bun-002",
      name: "6-Pack",
      quantity: 6,
      priceMultiplier: 5.5,   // $16.50 (8% off vs 6 singles = $18)
      active: true
    },
    {
      id: "bun-003",
      name: "12-Pack",
      quantity: 12,
      priceMultiplier: 10.5,  // $31.50 (13% off vs 12 singles = $36)
      active: true
    },
    {
      id: "bun-004",
      name: "Case",
      quantity: 24,
      priceMultiplier: 20.0,  // $60.00 (17% off vs 24 singles = $72)
      active: true
    }
  ]
};
```

### Calculating the Multiplier

**Formula:**
```typescript
priceMultiplier = (desired_bundle_price / single_unit_price)

// Example: 6-Pack for $16.50
priceMultiplier = 16.50 / 3.00 = 5.5

// With discount percentage:
discount = 8% = 0.92 (keep 92%)
priceMultiplier = quantity × discount = 6 × 0.92 = 5.52
```

## POS Interaction

### Selection Flow

1. **User clicks product** with bundles
2. **Product Options Modal** opens
3. **Bundles tab** shows segment selector
4. **User selects bundle** (e.g., "6-Pack")
5. **Price updates** to reflect bundle pricing
6. **User confirms** → Added to cart

### Cart Item Storage

```typescript
const cartItem = {
  product: { /* product object */ },
  quantity: 2,  // 2 six-packs = 12 bottles total
  selectedBundle: {
    id: "bun-002",
    name: "6-Pack",
    quantity: 6,
    priceMultiplier: 5.5,
    active: true
  }
};

// Display in cart
"Castle Lager - 6-Pack (6 bottles)"
"2 × $16.50 = $33.00"

// Inventory impact: 12 bottles deducted
```

## Configuration Interface

### Required UI Components

**Bundle List View:**
```
┌─────────────────────────────────────┐
│ Product Bundles                     │
├─────────────────────────────────────┤
│ [+ Add Bundle]                      │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Single (1)    | ×1.0    | [Edit]│ │
│ │ $3.00         | ✓ Active| [Del] │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 6-Pack (6)    | ×5.5    | [Edit]│ │
│ │ $16.50 (8%)   | ✓ Active| [Del] │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Case (24)     | ×20.0   | [Edit]│ │
│ │ $60.00 (17%)  | ✓ Active| [Del] │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Bundle Form:**
```
┌─────────────────────────────────────┐
│ Add/Edit Bundle                     │
├─────────────────────────────────────┤
│ Name: [________________]            │
│       (e.g., "6-Pack", "Dozen")     │
│                                     │
│ Quantity: [____]                    │
│          (number of units)          │
│                                     │
│ Pricing Method:                     │
│ ● Use Discount %                    │
│ ○ Set Fixed Price                   │
│                                     │
│ Discount: [___]%                    │
│ (8% → 6 × 0.92 = 5.52)             │
│                                     │
│ -OR-                                │
│                                     │
│ Bundle Price: [$____.__]            │
│ (e.g., $16.50)                      │
│                                     │
│ Preview:                            │
│ 6 × $3.00 = $18.00                 │
│ 8% discount = $16.56                │
│ Multiplier: 5.52                    │
│                                     │
│ ☑ Active                            │
│                                     │
│ [Cancel] [Save]                     │
└─────────────────────────────────────┘
```

### Form Validation

| Field | Required | Validation |
|-------|----------|------------|
| Name | ✅ Yes | Non-empty, max 50 chars |
| Quantity | ✅ Yes | Integer, must be ≥ 1 |
| Price Multiplier | ✅ Yes | Numeric, must be > 0 |
| Active | ✅ Yes | Boolean |

## Best Practices

### 1. Naming Conventions

**Good:**
- "6-Pack (6 bottles)"
- "Dozen"
- "Case of 24"

**Bad:**
- "6" (too short)
- "6-Pack $16.50" (price in name - it's calculated)
- "Bundle 1" (not descriptive)

### 2. Bundle Quantity

Start with **Single (1)** and add common pack sizes:

```typescript
// Good - Standard pack sizes
bundles = [
  { name: "Single", quantity: 1, priceMultiplier: 1.0 },
  { name: "6-Pack", quantity: 6, priceMultiplier: 5.5 },
  { name: "12-Pack", quantity: 12, priceMultiplier: 10.5 },
  { name: "Case", quantity: 24, priceMultiplier: 20.0 }
];

// Bad - Odd quantities
bundles = [
  { name: "3-Pack", quantity: 3, priceMultiplier: 2.8 },
  { name: "7-Pack", quantity: 7, priceMultiplier: 6.3 },
  { name: "15-Pack", quantity: 15, priceMultiplier: 13.5 }
];
```

### 3. Discount Strategy

**Volume Discount (Recommended):**
```typescript
// Larger bundles get bigger discounts
bundles = [
  { name: "Single", quantity: 1, priceMultiplier: 1.0 },    // 0% discount
  { name: "6-Pack", quantity: 6, priceMultiplier: 5.5 },    // 8% discount
  { name: "12-Pack", quantity: 12, priceMultiplier: 10.5 }, // 13% discount
  { name: "Case", quantity: 24, priceMultiplier: 20.0 }     // 17% discount
];
```

**Fixed Discount:**
```typescript
// Same discount % for all bundles
const discount = 0.10; // 10% off all packs
bundles = [
  { name: "Single", quantity: 1, priceMultiplier: 1.0 },
  { name: "6-Pack", quantity: 6, priceMultiplier: 6 * 0.9 },   // 5.4
  { name: "12-Pack", quantity: 12, priceMultiplier: 12 * 0.9 }, // 10.8
  { name: "Case", quantity: 24, priceMultiplier: 24 * 0.9 }     // 21.6
];
```

**Premium Pricing (No Discount):**
```typescript
// Convenience pricing - no discount for bundling
bundles = [
  { name: "Single", quantity: 1, priceMultiplier: 1.0 },
  { name: "6-Pack", quantity: 6, priceMultiplier: 6.0 },
  { name: "12-Pack", quantity: 12, priceMultiplier: 12.0 }
];
```

### 4. Inventory Tracking

When a bundled product is sold:
```typescript
cartItem = {
  product: { name: "Beer", _id: "prod-001" },
  quantity: 2,  // 2 six-packs
  selectedBundle: { quantity: 6 }
};

// Inventory deduction
totalUnits = cartItem.quantity × cartItem.selectedBundle.quantity;
// 2 × 6 = 12 bottles deducted from stock
```

### 5. Active Status

Use the `active` flag to:
- Temporarily disable bundles that are out of stock
- Seasonal bundles (e.g., "Party Pack of 50" only for holidays)
- Test new bundle sizes without deletion

## Combining with Other Options

Bundles can be combined with:

**Variants:**
```
Product: "Beer"
Variant: "Heineken" (+$1.00 per bottle)
Bundle: "6-Pack" (×6, 8% discount)
Final: ($3.00 + $1.00) × 6 × 0.92 = $22.08
```

**Portions:**
```
Product: "Water"
Portion: "Large Bottle (1L)" (×1.5)
Bundle: "Crate of 12" (×12, 10% discount)
Final: $1.00 × 1.5 × 12 × 0.9 = $16.20
```

**Modifiers (Not Common):**
```
Bundles typically don't combine with modifiers,
as modifiers apply per item, not per bundle.
```

## Database Storage

### CouchDB/PouchDB

```json
{
  "_id": "product-003",
  "type": "product",
  "name": "Castle Lager",
  "price": 3.00,
  "category": "beverages",
  "bundles": [
    {
      "id": "bun-001",
      "name": "Single",
      "quantity": 1,
      "priceMultiplier": 1.0,
      "active": true
    },
    {
      "id": "bun-002",
      "name": "6-Pack",
      "quantity": 6,
      "priceMultiplier": 5.5,
      "active": true
    },
    {
      "id": "bun-003",
      "name": "12-Pack",
      "quantity": 12,
      "priceMultiplier": 10.5,
      "active": true
    },
    {
      "id": "bun-004",
      "name": "Case",
      "quantity": 24,
      "priceMultiplier": 20.0,
      "active": true
    }
  ]
}
```

## Common Bundle Templates

### Beverages
```typescript
// Beer/Soda
{ name: "Single", quantity: 1, priceMultiplier: 1.0 }
{ name: "6-Pack", quantity: 6, priceMultiplier: 5.5 }
{ name: "12-Pack", quantity: 12, priceMultiplier: 10.5 }
{ name: "Case", quantity: 24, priceMultiplier: 20.0 }

// Water
{ name: "Single", quantity: 1, priceMultiplier: 1.0 }
{ name: "6-Pack", quantity: 6, priceMultiplier: 5.4 }
{ name: "Crate", quantity: 24, priceMultiplier: 21.0 }
```

### Groceries
```typescript
// Eggs
{ name: "Half Dozen", quantity: 6, priceMultiplier: 1.0 }
{ name: "Dozen", quantity: 12, priceMultiplier: 1.8 }
{ name: "Tray", quantity: 30, priceMultiplier: 4.2 }

// Yogurt
{ name: "Single", quantity: 1, priceMultiplier: 1.0 }
{ name: "4-Pack", quantity: 4, priceMultiplier: 3.6 }
{ name: "8-Pack", quantity: 8, priceMultiplier: 7.0 }
```

### Retail
```typescript
// Batteries
{ name: "Pack of 2", quantity: 2, priceMultiplier: 1.0 }
{ name: "Pack of 4", quantity: 4, priceMultiplier: 1.9 }
{ name: "Pack of 8", quantity: 8, priceMultiplier: 3.6 }

// Light Bulbs
{ name: "Single", quantity: 1, priceMultiplier: 1.0 }
{ name: "Twin Pack", quantity: 2, priceMultiplier: 1.8 }
{ name: "4-Pack", quantity: 4, priceMultiplier: 3.5 }
```

## Discount Calculator

### Helper Function
```typescript
function calculateBundleMultiplier(
  quantity: number,
  discountPercent: number
): number {
  const discount = 1 - (discountPercent / 100);
  return quantity * discount;
}

// Examples
calculateBundleMultiplier(6, 8);   // 5.52
calculateBundleMultiplier(12, 13); // 10.44
calculateBundleMultiplier(24, 17); // 19.92
```

## Implementation Checklist

### Phase 1: Configuration UI ❌
- [ ] Create BundlesManagementComponent
- [ ] Add bundle list view
- [ ] Add bundle form (create/edit)
- [ ] Implement add/edit/delete operations
- [ ] Add bundle templates (beverages, groceries, retail)
- [ ] Add discount calculator helper
- [ ] Save bundles to product document

### Phase 2: POS Integration ✅ (Partial)
- [x] Detect products with bundles
- [x] Extend CartItem model with selectedBundle
- [ ] Build bundle selection tab in ProductOptionsModal
- [ ] Implement price calculation with bundle multiplier
- [ ] Display selected bundle in cart
- [ ] Calculate inventory impact (quantity × bundle.quantity)

### Phase 3: Inventory Management ❌
- [ ] Track bundle sales vs single unit sales
- [ ] Auto-deduct correct units from stock
- [ ] Low stock warnings based on bundle sizes
- [ ] Bundle stock availability checking

### Phase 4: Reporting ❌
- [ ] Sales report by bundle type
- [ ] Bundle popularity analytics
- [ ] Discount impact analysis

---

**Related Documentation:**
- [Products Overview](./README.md)
- [Product Variants](./variants.md)
- [Product Portions](./portions.md)
- [POS Product Options](../pos/product-options.md)
- [Inventory Management](../inventory/bundles.md)
