# Products Module

The Products module manages the product catalog with support for advanced pricing options.

## Overview

Products in zPOS can have:
- Basic information (name, price, barcode, category)
- Multiple **variants** (sizes, colors, styles)
- Multiple **portions** (shot, glass, bottle for beverages)
- Multiple **bundles** (single, 6-pack, crate)
- Assigned **modifier groups** (toppings, add-ons)

## Product Structure

```typescript
interface Product {
  _id: string;
  type: 'product';
  name: string;
  price: number;
  barcode: string;
  category: string;
  imageUrl?: string;
  tags?: string[];
  stock?: number;
  active: boolean;
  
  // Advanced Options
  variants?: ProductVariant[];
  portions?: ProductPortion[];
  bundles?: ProductBundle[];
  modifierGroups?: string[];
}
```

## Feature Status

| Feature | Status | Documentation |
|---------|--------|---------------|
| Basic Products | ✅ Complete | - |
| Product Variants | 🚧 Data Model Only | [variants.md](./variants.md) |
| Product Portions | 🚧 Data Model Only | [portions.md](./portions.md) |
| Product Bundles | 🚧 Data Model Only | [bundles.md](./bundles.md) |
| Modifier Groups | 🚧 Data Model Only | [../modifiers/README.md](../modifiers/README.md) |
| Product Search | ✅ Complete | - |

## Configuration Required

### 1. Product Creation Interface ❌

**Status:** Not Implemented  
**Required For:** Creating/editing products

**Needs:**
- Form for basic product info
- Category selection dropdown
- Image upload
- Barcode scanner integration
- Stock management
- Active/inactive toggle

### 2. Variants Management ❌

**Status:** Not Implemented  
**Required For:** Products with size/color/style variations

**Needs:**
- Variant list (add/edit/delete)
- Name input (Small, Medium, Large)
- SKU input
- Price modifier (+/- amount)
- Active toggle per variant
- Reorder variants

### 3. Portions Management ❌

**Status:** Not Implemented  
**Required For:** Beverages sold in different serving sizes

**Needs:**
- Portion list (add/edit/delete)
- Name input (Shot, Glass, Bottle)
- Size input (30ml, 250ml, 750ml)
- Price multiplier (0.5, 1.0, 3.0)
- Active toggle per portion
- Default portion selection

### 4. Bundles Management ❌

**Status:** Not Implemented  
**Required For:** Products sold in packs

**Needs:**
- Bundle list (add/edit/delete)
- Name input (Single, 6-Pack, Crate)
- Quantity input
- Price multiplier (discount)
- Active toggle per bundle
- Default bundle selection

### 5. Modifier Group Assignment ❌

**Status:** Not Implemented  
**Required For:** Assigning toppings/add-ons to products

**Needs:**
- Available modifier groups list
- Multi-select assignment
- Order/priority
- Preview of assigned groups

## Usage in POS

### Adding Products to Cart

**Basic Product:**
```
Click product → Added to cart (quantity 1)
```

**With Keyboard Buffer:**
```
Type: 5
Click product → Added to cart (quantity 5)
```

**Product with Options:**
```
Click product → Options modal opens
Select variant/portion/bundle/modifiers
Confirm → Added to cart with selections
```

### Product Options Modal

When a product has any options, the system shows a modal with:

**Tabs:**
1. **Variants** (if product.variants.length > 0)
2. **Portions** (if product.portions.length > 0)
3. **Bundles** (if product.bundles.length > 0)
4. **Modifiers** (if product.modifierGroups.length > 0)

**Price Calculation:**
```typescript
Base Price: $10.00
+ Variant (Large): +$2.00
× Portion (Bottle): ×3.0
× Bundle (6-Pack): ×0.9 (10% discount)
+ Modifiers: +$1.50

Final Price: (($10 + $2) × 3.0 × 0.9) + $1.50 = $33.90
```

## Data Models

See individual feature documentation:
- [Product Variants](./variants.md)
- [Product Portions](./portions.md)
- [Product Bundles](./bundles.md)

## Cart Item Structure

When added to cart, products become:

```typescript
interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: ProductVariant;
  selectedPortion?: ProductPortion;
  selectedBundle?: ProductBundle;
  modifiers?: OrderModifier[];
}
```

## Next Steps

1. **Build Product Management UI**
   - Create ProductsPage component
   - Add product form (create/edit)
   - Implement product list with search/filter

2. **Build Options Management**
   - Create VariantsModal for managing product variants
   - Create PortionsModal for managing product portions
   - Create BundlesModal for managing product bundles
   - Create ModifierAssignmentModal for assigning modifier groups

3. **Build Product Options Modal**
   - Create ProductOptionsModal for POS
   - Add variant selection (radio buttons)
   - Add portion selection (segment)
   - Add bundle selection (segment)
   - Add modifier selection (checkboxes)
   - Implement price calculation

4. **Test Complete Flow**
   - Create products with all option types
   - Test adding to cart from POS
   - Verify price calculations
   - Test with keyboard shortcuts

---

**Related Documentation:**
- [POS Category Guide](../pos/README.md)
- [Modifiers](../modifiers/README.md)
- [Settings](../settings/README.md)
