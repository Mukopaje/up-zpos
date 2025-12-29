# Modifiers Module

The Modifiers module allows products to have customizable add-ons, toppings, or options that adjust the final price.

## Overview

Modifiers are organized into **Modifier Groups** that can be assigned to:
- Specific products (e.g., "Burger Toppings" → All burgers)
- Entire categories (e.g., "Coffee Add-ons" → All coffee drinks)

## Use Cases

**Restaurant:**
- Pizza: Toppings (Extra Cheese, Pepperoni, Mushrooms)
- Burger: Add-ons (Bacon, Avocado, Extra Patty)
- Coffee: Customizations (Extra Shot, Soy Milk, Caramel Syrup)

**Bar:**
- Cocktails: Mixers (Premium Tonic, Fresh Juice)
- Shots: Chasers (Lime, Lemon, Orange)

**Fast Food:**
- Sandwiches: Extras (Cheese, Bacon, Mayo)
- Salads: Dressings (Ranch, Caesar, Balsamic)

## Data Models

### Modifier Group

```typescript
interface ModifierGroup {
  _id: string;              // Unique identifier
  type: 'modifier-group';   // Document type
  name: string;             // Display name (e.g., "Pizza Toppings")
  options: ModifierOption[]; // Available modifier options
  multiSelect: boolean;     // Allow multiple selections
  required: boolean;        // Must select at least one
  categories?: string[];    // Category IDs this group applies to
  products?: string[];      // Product IDs this group applies to
}
```

### Modifier Option

```typescript
interface ModifierOption {
  id: string;         // Unique identifier
  name: string;       // Display name (e.g., "Extra Cheese")
  price: number;      // Additional cost
  active: boolean;    // Whether this option is available
}
```

### Order Modifier (Cart Item)

```typescript
interface OrderModifier {
  id: string;         // References ModifierOption.id
  name: string;       // ModifierOption.name
  price: number;      // ModifierOption.price
  groupId: string;    // References ModifierGroup._id
  groupName: string;  // ModifierGroup.name
}
```

## How It Works

### Assignment

Modifier groups can be assigned at two levels:

**1. Category Level:**
```typescript
// All products in "Pizza" category get these modifiers
modifierGroup = {
  _id: "mg-001",
  name: "Pizza Toppings",
  categories: ["cat-pizza"],
  options: [...]
};
```

**2. Product Level:**
```typescript
// Only specific products get these modifiers
modifierGroup = {
  _id: "mg-002",
  name: "Burger Add-ons",
  products: ["prod-burger-001", "prod-burger-002"],
  options: [...]
};

// OR, assign in product document
product = {
  _id: "prod-burger-001",
  name: "Cheeseburger",
  modifierGroups: ["mg-002", "mg-003"]
};
```

### Price Calculation

```typescript
// Base product
product.price = $10.00

// Selected modifiers
modifiers = [
  { name: "Extra Cheese", price: $1.00 },
  { name: "Bacon", price: $2.00 },
  { name: "Avocado", price: $1.50 }
];

// Total modifiers cost
modifiersTotal = $1.00 + $2.00 + $1.50 = $4.50

// Final price
finalPrice = $10.00 + $4.50 = $14.50
```

### Example: Pizza Toppings

```typescript
const modifierGroup = {
  _id: "mg-001",
  type: "modifier-group",
  name: "Pizza Toppings",
  multiSelect: true,     // Can select multiple
  required: false,       // Not required
  categories: ["cat-pizza"],
  options: [
    {
      id: "opt-001",
      name: "Extra Cheese",
      price: 2.00,
      active: true
    },
    {
      id: "opt-002",
      name: "Pepperoni",
      price: 2.50,
      active: true
    },
    {
      id: "opt-003",
      name: "Mushrooms",
      price: 1.50,
      active: true
    },
    {
      id: "opt-004",
      name: "Olives",
      price: 1.00,
      active: true
    }
  ]
};

// In cart
cartItem = {
  product: { name: "Margherita Pizza", price: 12.00 },
  quantity: 1,
  modifiers: [
    { id: "opt-001", name: "Extra Cheese", price: 2.00, groupId: "mg-001", groupName: "Pizza Toppings" },
    { id: "opt-002", name: "Pepperoni", price: 2.50, groupId: "mg-001", groupName: "Pizza Toppings" }
  ]
};

// Display
"Margherita Pizza"
"  + Extra Cheese ($2.00)"
"  + Pepperoni ($2.50)"
"Total: $16.50"
```

## POS Interaction

### Selection Flow

1. **User clicks product** with modifiers
2. **Product Options Modal** opens
3. **Modifiers tab** shows modifier groups
4. **User selects options** (checkboxes if multiSelect, radio if single)
5. **Price updates** to include modifier costs
6. **User confirms** → Added to cart

### Multi-Select vs Single-Select

**Multi-Select (Checkboxes):**
```typescript
modifierGroup = {
  name: "Pizza Toppings",
  multiSelect: true,
  options: [...]
};
// User can select 0, 1, or many options
```

**Single-Select (Radio Buttons):**
```typescript
modifierGroup = {
  name: "Dressing Choice",
  multiSelect: false,
  required: true,
  options: [...]
};
// User must select exactly 1 option
```

## Configuration Interface

### Required UI Components

**Modifier Groups List:**
```
┌─────────────────────────────────────┐
│ Modifier Groups                     │
├─────────────────────────────────────┤
│ [+ New Modifier Group]              │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Pizza Toppings                  │ │
│ │ Multi-select, Optional          │ │
│ │ 5 options | 2 categories        │ │
│ │ [Edit] [Delete]                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Coffee Add-ons                  │ │
│ │ Multi-select, Optional          │ │
│ │ 8 options | 1 category          │ │
│ │ [Edit] [Delete]                 │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Modifier Group Form:**
```
┌─────────────────────────────────────┐
│ Create Modifier Group               │
├─────────────────────────────────────┤
│ Name: [____________________]        │
│       (e.g., "Pizza Toppings")      │
│                                     │
│ Selection Type:                     │
│ ● Multi-select (Checkboxes)        │
│ ○ Single-select (Radio buttons)    │
│                                     │
│ ☐ Required (Must select at least 1)│
│                                     │
│ ─── Modifier Options ───            │
│                                     │
│ [+ Add Option]                      │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Extra Cheese    | $2.00 | [Del] │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Pepperoni       | $2.50 | [Del] │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ─── Assignment ───                  │
│                                     │
│ Assign to:                          │
│ ● Categories                        │
│   ☑ Pizza                           │
│   ☐ Burgers                         │
│                                     │
│ ○ Specific Products                 │
│   [Select Products...]              │
│                                     │
│ [Cancel] [Save]                     │
└─────────────────────────────────────┘
```

**Modifier Option Form (Sub-modal):**
```
┌─────────────────────────────────────┐
│ Add Modifier Option                 │
├─────────────────────────────────────┤
│ Name: [____________________]        │
│       (e.g., "Extra Cheese")        │
│                                     │
│ Price: [$____.__]                   │
│        (additional cost)            │
│                                     │
│ ☑ Active                            │
│                                     │
│ [Cancel] [Add]                      │
└─────────────────────────────────────┘
```

## Feature Status

| Feature | Status | Documentation |
|---------|--------|---------------|
| Modifier Group Model | ✅ Complete | [modifier-groups.md](./modifier-groups.md) |
| Modifier Options Model | ✅ Complete | [modifier-groups.md](./modifier-groups.md) |
| Category Assignment | 🚧 Data Model Only | [configuration.md](./configuration.md) |
| Product Assignment | 🚧 Data Model Only | [configuration.md](./configuration.md) |
| Multi-Select Support | 🚧 Data Model Only | [modifier-groups.md](./modifier-groups.md) |
| Required Modifiers | 🚧 Data Model Only | [modifier-groups.md](./modifier-groups.md) |
| POS Integration | 🚧 Partial | [../pos/product-options.md](../pos/product-options.md) |

## Configuration Required

### 1. Modifier Groups Management ❌

**Status:** Not Implemented  
**Required For:** Creating/editing modifier groups

**Needs:**
- List view of all modifier groups
- Create/edit form
- Multi-select vs single-select toggle
- Required toggle
- Add/edit/delete modifier options
- Price input per option
- Active toggle per option

### 2. Assignment Interface ❌

**Status:** Not Implemented  
**Required For:** Assigning modifiers to categories/products

**Needs:**
- Category multi-select
- Product multi-select with search
- Visual indicator of what's assigned where
- Bulk assignment tools
- Preview of affected products

### 3. POS Modal Integration ❌

**Status:** Not Implemented  
**Required For:** Selecting modifiers when adding products

**Needs:**
- Modifiers tab in ProductOptionsModal
- Checkbox group for multi-select
- Radio group for single-select
- Required validation
- Price preview with modifiers
- Clear visual separation between groups

## Best Practices

### 1. Naming

**Good:**
- "Pizza Toppings"
- "Coffee Customizations"
- "Burger Add-ons"

**Bad:**
- "Group 1"
- "Extras"
- "Options"

### 2. Option Pricing

**Free Options:**
```typescript
{ name: "No Onions", price: 0.00 }
{ name: "Light Ice", price: 0.00 }
```

**Paid Options:**
```typescript
{ name: "Extra Cheese", price: 1.50 }
{ name: "Bacon", price: 2.00 }
```

### 3. Required Modifiers

Use `required: true` for:
- Dressing selection (salads)
- Cooking temperature (steaks)
- Size selection (if not using variants)

### 4. Multi-Select Limits

Consider adding max selections:
```typescript
modifierGroup = {
  name: "Choose 3 Toppings",
  multiSelect: true,
  required: true,
  maxSelections: 3,  // Future feature
  options: [...]
};
```

## Combining with Other Options

Modifiers combine **additively** with other options:

**With Variants:**
```
Product: Burger ($10.00)
Variant: Double Patty (+$3.00)
Modifiers: Bacon (+$2.00), Avocado (+$1.50)
Final: $10.00 + $3.00 + $2.00 + $1.50 = $16.50
```

**With Portions:**
```
Product: Coffee ($3.00)
Portion: Large (×1.5)
Modifiers: Extra Shot (+$1.00), Soy Milk (+$0.50)
Final: ($3.00 × 1.5) + $1.00 + $0.50 = $6.00
```

**With Bundles:**
```
Modifiers typically don't apply to bundles,
as bundles are pre-packaged items.
```

## Database Storage

### Modifier Group Document

```json
{
  "_id": "mg-001",
  "type": "modifier-group",
  "name": "Pizza Toppings",
  "multiSelect": true,
  "required": false,
  "categories": ["cat-pizza"],
  "products": [],
  "options": [
    {
      "id": "opt-001",
      "name": "Extra Cheese",
      "price": 2.00,
      "active": true
    },
    {
      "id": "opt-002",
      "name": "Pepperoni",
      "price": 2.50,
      "active": true
    }
  ]
}
```

### Product with Modifiers

```json
{
  "_id": "product-001",
  "type": "product",
  "name": "Margherita Pizza",
  "price": 12.00,
  "category": "cat-pizza",
  "modifierGroups": ["mg-001"]
}
```

## Common Modifier Templates

### Restaurant
```typescript
// Pizza Toppings
{ name: "Extra Cheese", price: 2.00 }
{ name: "Pepperoni", price: 2.50 }
{ name: "Mushrooms", price: 1.50 }
{ name: "Olives", price: 1.00 }
{ name: "Bacon", price: 2.50 }

// Burger Add-ons
{ name: "Extra Patty", price: 3.00 }
{ name: "Bacon", price: 2.00 }
{ name: "Avocado", price: 1.50 }
{ name: "Cheese", price: 1.00 }
{ name: "Fried Egg", price: 1.50 }
```

### Coffee Shop
```typescript
// Coffee Customizations
{ name: "Extra Shot", price: 1.00 }
{ name: "Soy Milk", price: 0.50 }
{ name: "Almond Milk", price: 0.50 }
{ name: "Caramel Syrup", price: 0.50 }
{ name: "Vanilla Syrup", price: 0.50 }
{ name: "Whipped Cream", price: 0.50 }
```

### Salad Bar
```typescript
// Dressings (Single-select, Required)
{ name: "Ranch", price: 0.00 }
{ name: "Caesar", price: 0.00 }
{ name: "Balsamic", price: 0.00 }
{ name: "Italian", price: 0.00 }

// Add-ons (Multi-select, Optional)
{ name: "Grilled Chicken", price: 3.00 }
{ name: "Avocado", price: 2.00 }
{ name: "Bacon Bits", price: 1.50 }
{ name: "Croutons", price: 0.50 }
```

## Implementation Checklist

### Phase 1: Configuration UI ❌
- [ ] Create ModifierGroupsPage component
- [ ] Add modifier groups list view
- [ ] Add modifier group form (create/edit)
- [ ] Add modifier option sub-form
- [ ] Implement add/edit/delete for groups and options
- [ ] Add category assignment interface
- [ ] Add product assignment interface
- [ ] Save modifier groups to database

### Phase 2: POS Integration ✅ (Partial)
- [x] Detect products with modifiers
- [x] Extend CartItem model with modifiers array
- [ ] Build modifiers tab in ProductOptionsModal
- [ ] Implement checkbox group for multi-select
- [ ] Implement radio group for single-select
- [ ] Add required validation
- [ ] Calculate price with modifiers
- [ ] Display modifiers in cart

### Phase 3: Reporting ❌
- [ ] Sales report by modifier
- [ ] Modifier popularity analytics
- [ ] Revenue per modifier option

---

**Related Documentation:**
- [Modifier Groups](./modifier-groups.md)
- [Configuration Guide](./configuration.md)
- [Products Overview](../products/README.md)
- [POS Product Options](../pos/product-options.md)
