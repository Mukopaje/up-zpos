# Product Variants

Product variants allow a single product to have multiple options like size, color, or style, each with different pricing.

## Use Cases

**Apparel:**
- T-Shirts: Small, Medium, Large, XL
- Shoes: Size 7, Size 8, Size 9, etc.
- Colors: Red, Blue, Green

**Food:**
- Pizza: Small (10"), Medium (12"), Large (14")
- Burgers: Regular, Double, Triple
- Fries: Small, Medium, Large

**Beverages:**
- Coffee: Regular, Large, Extra Large
- Smoothies: 12oz, 16oz, 24oz

## Data Model

```typescript
interface ProductVariant {
  id: string;              // Unique identifier
  name: string;            // Display name (e.g., "Large", "Red")
  sku?: string;            // Optional SKU for this variant
  priceModifier: number;   // Amount to add/subtract from base price
  active: boolean;         // Whether this variant is available
}
```

## How It Works

### Price Calculation

Variants use a **price modifier** system:

```typescript
// Base product price
const product = {
  name: "T-Shirt",
  price: 15.00
};

// Variants
const variants = [
  { name: "Small", priceModifier: -2.00 },   // $13.00
  { name: "Medium", priceModifier: 0.00 },   // $15.00 (base)
  { name: "Large", priceModifier: 2.00 },    // $17.00
  { name: "XL", priceModifier: 4.00 }        // $19.00
];

// Final price calculation
finalPrice = product.price + selectedVariant.priceModifier;
```

### Example: Pizza Sizes

```typescript
const product = {
  name: "Pepperoni Pizza",
  price: 12.00,  // Medium price
  variants: [
    {
      id: "var-001",
      name: "Small (10\")",
      sku: "PIZZA-PEP-SM",
      priceModifier: -3.00,  // $9.00
      active: true
    },
    {
      id: "var-002",
      name: "Medium (12\")",
      sku: "PIZZA-PEP-MD",
      priceModifier: 0.00,   // $12.00 (base)
      active: true
    },
    {
      id: "var-003",
      name: "Large (14\")",
      sku: "PIZZA-PEP-LG",
      priceModifier: 4.00,   // $16.00
      active: true
    },
    {
      id: "var-004",
      name: "Family (18\")",
      sku: "PIZZA-PEP-FAM",
      priceModifier: 8.00,   // $20.00
      active: true
    }
  ]
};
```

## POS Interaction

### Selection Flow

1. **User clicks product** with variants
2. **Product Options Modal** opens
3. **Variants tab** shows radio button list
4. **User selects variant** (e.g., "Large")
5. **Price updates** to reflect modifier
6. **User confirms** → Added to cart

### Cart Item Storage

```typescript
const cartItem = {
  product: { /* product object */ },
  quantity: 2,
  selectedVariant: {
    id: "var-003",
    name: "Large (14\")",
    sku: "PIZZA-PEP-LG",
    priceModifier: 4.00,
    active: true
  }
};

// Display in cart
"Pepperoni Pizza - Large (14\")"
"2 × $16.00 = $32.00"
```

## Configuration Interface

### Required UI Components

**Variant List View:**
```
┌─────────────────────────────────────┐
│ Product Variants                    │
├─────────────────────────────────────┤
│ [+ Add Variant]                     │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Small         | -$2.00  | [Edit]│ │
│ │ SKU: TSH-SM   | ✓ Active| [Del] │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Medium        | $0.00   | [Edit]│ │
│ │ SKU: TSH-MD   | ✓ Active| [Del] │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Large         | +$2.00  | [Edit]│ │
│ │ SKU: TSH-LG   | ✓ Active| [Del] │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Variant Form:**
```
┌─────────────────────────────────────┐
│ Add/Edit Variant                    │
├─────────────────────────────────────┤
│ Name: [________________]            │
│       (e.g., "Large", "Red")        │
│                                     │
│ SKU: [________________]             │
│      (optional)                     │
│                                     │
│ Price Modifier:                     │
│ ○ Increase  ● Decrease  ○ No Change│
│                                     │
│ Amount: [$____.__]                  │
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
| SKU | ❌ No | Alphanumeric, unique if provided |
| Price Modifier | ✅ Yes | Numeric, can be negative/zero/positive |
| Active | ✅ Yes | Boolean |

## Best Practices

### 1. Naming Conventions

**Good:**
- "Small (10 oz)"
- "Large - $17"
- "Blue"

**Bad:**
- "S" (too short)
- "Small $13.00" (price in name - it's calculated)

### 2. Base Price Strategy

Set the **base product price** to the **most common variant**:

```typescript
// Good
product.price = 15.00;  // Medium price (most sold)
variants = [
  { name: "Small", priceModifier: -2.00 },
  { name: "Medium", priceModifier: 0.00 },  // Base
  { name: "Large", priceModifier: 3.00 }
];

// Bad
product.price = 0.00;  // Confusing
variants = [
  { name: "Small", priceModifier: 13.00 },
  { name: "Medium", priceModifier: 15.00 },
  { name: "Large", priceModifier: 18.00 }
];
```

### 3. SKU Management

If using SKUs:
- Make them unique across all variants
- Include variant identifier in SKU
- Keep format consistent

```typescript
// Good
"TSHIRT-SM-001"
"TSHIRT-MD-001"
"TSHIRT-LG-001"

// Bad
"TSHIRT-001"  // No variant identifier
"TSH-S-1"     // Inconsistent format
```

### 4. Active Status

Use the `active` flag to:
- Temporarily disable out-of-stock variants
- Seasonal availability (e.g., "Pumpkin Spice" only in fall)
- Phase out old variants without deletion

## Combining with Other Options

Variants can be combined with:

**Portions:**
```
Product: "Whiskey"
Variant: "Jack Daniels" (+$5.00)
Portion: "Double Shot" (×2.0)
Final: ($20.00 + $5.00) × 2.0 = $50.00
```

**Bundles:**
```
Product: "Beer"
Variant: "Heineken" (+$1.00)
Bundle: "6-Pack" (×6, 10% discount)
Final: ($3.00 + $1.00) × 6 × 0.9 = $21.60
```

**Modifiers:**
```
Product: "Burger"
Variant: "Double Patty" (+$3.00)
Modifiers: "Extra Cheese" (+$1.00), "Bacon" (+$2.00)
Final: ($8.00 + $3.00) + $1.00 + $2.00 = $14.00
```

## Database Storage

### CouchDB/PouchDB

```json
{
  "_id": "product-001",
  "type": "product",
  "name": "T-Shirt",
  "price": 15.00,
  "category": "apparel",
  "variants": [
    {
      "id": "var-001",
      "name": "Small",
      "sku": "TSH-SM-001",
      "priceModifier": -2.00,
      "active": true
    },
    {
      "id": "var-002",
      "name": "Medium",
      "sku": "TSH-MD-001",
      "priceModifier": 0.00,
      "active": true
    },
    {
      "id": "var-003",
      "name": "Large",
      "sku": "TSH-LG-001",
      "priceModifier": 2.00,
      "active": true
    }
  ]
}
```

## Implementation Checklist

### Phase 1: Configuration UI ❌
- [ ] Create VariantsManagementComponent
- [ ] Add variant list view
- [ ] Add variant form (create/edit)
- [ ] Implement add/edit/delete operations
- [ ] Add drag-to-reorder functionality
- [ ] Save variants to product document

### Phase 2: POS Integration ✅ (Partial)
- [x] Detect products with variants
- [x] Extend CartItem model with selectedVariant
- [ ] Build variant selection tab in ProductOptionsModal
- [ ] Implement price calculation with variant modifier
- [ ] Display selected variant in cart

### Phase 3: Reporting ❌
- [ ] Sales report by variant
- [ ] Stock management per variant
- [ ] Variant performance analytics

---

**Related Documentation:**
- [Products Overview](./README.md)
- [Product Portions](./portions.md)
- [Product Bundles](./bundles.md)
- [POS Product Options](../pos/product-options.md)
