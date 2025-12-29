# Product Portions

Product portions allow beverages and consumables to be sold in different serving sizes with proportional pricing.

## Use Cases

**Beverages (Bar/Restaurant):**
- Whiskey: Shot (30ml), Double (60ml), Glass (90ml), Bottle (750ml)
- Beer: Glass (250ml), Pint (500ml), Pitcher (1500ml)
- Wine: Glass (150ml), Half Bottle (375ml), Bottle (750ml)

**Bulk Items:**
- Cooking Oil: Small (250ml), Medium (500ml), Large (1L), Jumbo (5L)
- Rice: Cup (250g), Bag (1kg), Sack (25kg)

**Dairy:**
- Milk: Cup (200ml), Small (500ml), Large (1L), Gallon (4L)

## Data Model

```typescript
interface ProductPortion {
  id: string;              // Unique identifier
  name: string;            // Display name (e.g., "Shot", "Glass")
  size: string;            // Volume/weight (e.g., "30ml", "250ml")
  priceMultiplier: number; // Multiplier for base price
  active: boolean;         // Whether this portion is available
}
```

## How It Works

### Price Calculation

Portions use a **price multiplier** system based on the base product price:

```typescript
// Base product price (per standard serving)
const product = {
  name: "Whiskey",
  price: 50.00  // Price for 1 shot (30ml)
};

// Portions
const portions = [
  { name: "Shot", size: "30ml", priceMultiplier: 1.0 },    // $50.00 (base)
  { name: "Double", size: "60ml", priceMultiplier: 2.0 },  // $100.00
  { name: "Glass", size: "90ml", priceMultiplier: 3.0 },   // $150.00
  { name: "Bottle", size: "750ml", priceMultiplier: 20.0 } // $1,000.00
];

// Final price calculation
finalPrice = product.price × selectedPortion.priceMultiplier;
```

### Example: Beer Servings

```typescript
const product = {
  name: "Castle Lager",
  price: 5.00,  // Price for 1 glass (250ml)
  portions: [
    {
      id: "por-001",
      name: "Glass",
      size: "250ml",
      priceMultiplier: 1.0,  // $5.00 (base)
      active: true
    },
    {
      id: "por-002",
      name: "Pint",
      size: "500ml",
      priceMultiplier: 1.8,  // $9.00 (10% discount vs 2 glasses)
      active: true
    },
    {
      id: "por-003",
      name: "Pitcher",
      size: "1500ml",
      priceMultiplier: 5.0,  // $25.00 (16% discount vs 6 glasses)
      active: true
    },
    {
      id: "por-004",
      name: "Bottle",
      size: "330ml",
      priceMultiplier: 1.3,  // $6.50
      active: true
    }
  ]
};
```

## POS Interaction

### Selection Flow

1. **User clicks product** with portions
2. **Product Options Modal** opens
3. **Portions tab** shows segment selector
4. **User selects portion** (e.g., "Pint")
5. **Price updates** to reflect multiplier
6. **User confirms** → Added to cart

### Cart Item Storage

```typescript
const cartItem = {
  product: { /* product object */ },
  quantity: 3,  // 3 pints
  selectedPortion: {
    id: "por-002",
    name: "Pint",
    size: "500ml",
    priceMultiplier: 1.8,
    active: true
  }
};

// Display in cart
"Castle Lager - Pint (500ml)"
"3 × $9.00 = $27.00"
```

## Configuration Interface

### Required UI Components

**Portion List View:**
```
┌─────────────────────────────────────┐
│ Product Portions                    │
├─────────────────────────────────────┤
│ [+ Add Portion]                     │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Shot (30ml)   | ×1.0    | [Edit]│ │
│ │ Base serving  | ✓ Active| [Del] │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Double (60ml) | ×2.0    | [Edit]│ │
│ │               | ✓ Active| [Del] │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Bottle (750ml)| ×20.0   | [Edit]│ │
│ │               | ✓ Active| [Del] │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Portion Form:**
```
┌─────────────────────────────────────┐
│ Add/Edit Portion                    │
├─────────────────────────────────────┤
│ Name: [________________]            │
│       (e.g., "Shot", "Pint")        │
│                                     │
│ Size: [________________]            │
│       (e.g., "30ml", "500ml")       │
│                                     │
│ Price Multiplier: [____.__]         │
│ (Base price × multiplier)           │
│                                     │
│ Preview:                            │
│ $50.00 × 2.0 = $100.00             │
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
| Size | ✅ Yes | Non-empty (e.g., "30ml", "1L") |
| Price Multiplier | ✅ Yes | Numeric, must be > 0 |
| Active | ✅ Yes | Boolean |

## Best Practices

### 1. Naming Conventions

**Good:**
- "Shot (30ml)"
- "Pint"
- "Bottle - 750ml"

**Bad:**
- "S" (too short)
- "Shot $50" (price in name - it's calculated)
- "30ml" (use descriptive name + size)

### 2. Base Price Strategy

Set the **base product price** to the **smallest or most common serving**:

```typescript
// Good - Base price is 1 shot
product.price = 50.00;  // 1 shot (30ml)
portions = [
  { name: "Shot", size: "30ml", priceMultiplier: 1.0 },
  { name: "Double", size: "60ml", priceMultiplier: 2.0 },
  { name: "Bottle", size: "750ml", priceMultiplier: 20.0 }
];

// Bad - Base price is bottle
product.price = 1000.00;  // Bottle price
portions = [
  { name: "Shot", size: "30ml", priceMultiplier: 0.05 },  // Confusing
  { name: "Bottle", size: "750ml", priceMultiplier: 1.0 }
];
```

### 3. Pricing Strategies

**Linear Pricing (No Discount):**
```typescript
// Exact proportional pricing
portions = [
  { name: "Glass", size: "250ml", priceMultiplier: 1.0 },   // $5.00
  { name: "Pint", size: "500ml", priceMultiplier: 2.0 },    // $10.00
  { name: "Pitcher", size: "1500ml", priceMultiplier: 6.0 } // $30.00
];
```

**Volume Discount:**
```typescript
// Larger sizes get discount
portions = [
  { name: "Glass", size: "250ml", priceMultiplier: 1.0 },   // $5.00
  { name: "Pint", size: "500ml", priceMultiplier: 1.8 },    // $9.00 (10% off)
  { name: "Pitcher", size: "1500ml", priceMultiplier: 5.0 } // $25.00 (17% off)
];
```

**Premium Pricing:**
```typescript
// Smaller servings have higher per-unit cost
portions = [
  { name: "Shot", size: "30ml", priceMultiplier: 1.0 },     // $50.00
  { name: "Double", size: "60ml", priceMultiplier: 1.8 },   // $90.00 (10% discount)
  { name: "Bottle", size: "750ml", priceMultiplier: 18.0 }  // $900.00 (28% discount)
];
```

### 4. Size Format

Be consistent with size formatting:

```typescript
// Good
"30ml", "500ml", "1L", "2.5L"
"250g", "1kg", "5kg"

// Bad
"30 ml", "0.5 L", "500ML"  // Inconsistent spacing/case
```

### 5. Active Status

Use the `active` flag to:
- Temporarily disable out-of-stock sizes
- Seasonal availability (e.g., "Pitcher" only during happy hour)
- Test new portion sizes without deletion

## Combining with Other Options

Portions can be combined with:

**Variants:**
```
Product: "Whiskey"
Variant: "Jack Daniels" (+$10.00)
Portion: "Double Shot" (×2.0)
Final: ($50.00 + $10.00) × 2.0 = $120.00
```

**Bundles:**
```
Product: "Beer"
Portion: "Bottle (330ml)" (×1.3)
Bundle: "6-Pack" (×6, 10% discount)
Final: $5.00 × 1.3 × 6 × 0.9 = $35.10
```

**Modifiers:**
```
Product: "Coffee"
Portion: "Large (16oz)" (×1.5)
Modifiers: "Extra Shot" (+$1.00), "Caramel Syrup" (+$0.50)
Final: ($3.00 × 1.5) + $1.00 + $0.50 = $6.00
```

## Database Storage

### CouchDB/PouchDB

```json
{
  "_id": "product-002",
  "type": "product",
  "name": "Whiskey",
  "price": 50.00,
  "category": "beverages",
  "portions": [
    {
      "id": "por-001",
      "name": "Shot",
      "size": "30ml",
      "priceMultiplier": 1.0,
      "active": true
    },
    {
      "id": "por-002",
      "name": "Double",
      "size": "60ml",
      "priceMultiplier": 2.0,
      "active": true
    },
    {
      "id": "por-003",
      "name": "Bottle",
      "size": "750ml",
      "priceMultiplier": 20.0,
      "active": true
    }
  ]
}
```

## Common Portion Templates

### Beverages (Bar)
```typescript
// Spirits
{ name: "Shot", size: "30ml", priceMultiplier: 1.0 }
{ name: "Double", size: "60ml", priceMultiplier: 2.0 }
{ name: "Bottle", size: "750ml", priceMultiplier: 20.0 }

// Beer
{ name: "Glass", size: "250ml", priceMultiplier: 1.0 }
{ name: "Pint", size: "500ml", priceMultiplier: 1.8 }
{ name: "Pitcher", size: "1500ml", priceMultiplier: 5.0 }

// Wine
{ name: "Glass", size: "150ml", priceMultiplier: 1.0 }
{ name: "Half Bottle", size: "375ml", priceMultiplier: 2.3 }
{ name: "Bottle", size: "750ml", priceMultiplier: 4.5 }
```

### Coffee Shop
```typescript
{ name: "Regular", size: "12oz", priceMultiplier: 1.0 }
{ name: "Large", size: "16oz", priceMultiplier: 1.3 }
{ name: "Extra Large", size: "20oz", priceMultiplier: 1.6 }
```

### Fast Food
```typescript
{ name: "Small", size: "12oz", priceMultiplier: 1.0 }
{ name: "Medium", size: "16oz", priceMultiplier: 1.2 }
{ name: "Large", size: "20oz", priceMultiplier: 1.4 }
{ name: "Extra Large", size: "32oz", priceMultiplier: 1.8 }
```

## Implementation Checklist

### Phase 1: Configuration UI ❌
- [ ] Create PortionsManagementComponent
- [ ] Add portion list view
- [ ] Add portion form (create/edit)
- [ ] Implement add/edit/delete operations
- [ ] Add portion templates (bar, coffee, fast food)
- [ ] Save portions to product document

### Phase 2: POS Integration ✅ (Partial)
- [x] Detect products with portions
- [x] Extend CartItem model with selectedPortion
- [ ] Build portion selection tab in ProductOptionsModal
- [ ] Implement price calculation with portion multiplier
- [ ] Display selected portion in cart

### Phase 3: Reporting ❌
- [ ] Sales report by portion
- [ ] Portion popularity analytics
- [ ] Revenue per portion size

---

**Related Documentation:**
- [Products Overview](./README.md)
- [Product Variants](./variants.md)
- [Product Bundles](./bundles.md)
- [POS Product Options](../pos/product-options.md)
