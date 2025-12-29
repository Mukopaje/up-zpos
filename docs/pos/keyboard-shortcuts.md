# POS Keyboard Shortcuts

The POS system supports always-active keyboard input for faster operations.

## How It Works

The keyboard system listens for input globally across the POS screen. It automatically distinguishes between:
- **Numeric input** → Quantity buffer
- **Alphabetic input** → Search buffer

### Buffer System

**Keyboard Buffer (Quantity)**
- Type: Numbers only (0-9)
- Purpose: Set quantity before adding product
- Display: Shows "Qty: X" badge in header
- Timeout: Clears after 2 seconds of inactivity

**Search Buffer (Text)**
- Type: Letters and spaces (a-z, A-Z, space)
- Purpose: Cross-category product search
- Display: Shows "Search: ..." badge in header
- Activation: Requires 3+ characters
- Timeout: Clears after 2 seconds of inactivity

## Keyboard Shortcuts

### Function Keys

| Key | Action | Description |
|-----|--------|-------------|
| **F1** | Focus Search | Focuses the search bar in header |
| **F2** | Checkout | Opens checkout (if cart has items) |
| **F3** | Hold Transaction | Saves current cart for later (coming soon) |
| **F4** | Recall Transaction | Loads held transaction (coming soon) |
| **Escape** | Clear/Cancel | Clears buffers and closes search overlay |

### Numeric Input (Quantity)

**Workflow:**
1. Type a number (e.g., `5`)
2. Click a product or scan barcode
3. Product is added with quantity 5
4. Buffer automatically clears

**Example:**
```
Type: 1 2
Display: "Qty: 12"
Click: Product "Coca Cola"
Result: 12 x Coca Cola added to cart
```

### Text Input (Search)

**Workflow:**
1. Type at least 3 letters (e.g., `chi`)
2. Search overlay appears with matching products from all categories
3. Click a product or press Enter to add first result
4. Buffer automatically clears

**Example:**
```
Type: c h i
Display: "Search: chi"
Overlay: Shows "Chicken Wings", "Chips", "Chili Sauce"
Click: Any result or press Enter
Result: Selected product added to cart
```

**Search Criteria:**
- Product name (case-insensitive)
- Barcode
- Product tags

### Editing Buffers

| Key | Action |
|-----|--------|
| **Backspace** | Removes last character from active buffer |
| **Escape** | Clears all buffers |

## Usage Examples

### Example 1: Add 5 Beers
```
1. Type: 5
2. Search/Click: "Castle Lager"
3. Result: 5 x Castle Lager added
```

### Example 2: Search and Add
```
1. Type: bread
2. Search shows: "White Bread", "Brown Bread", "Baguette"
3. Click: "White Bread"
4. Result: 1 x White Bread added
```

### Example 3: Combined (Quantity + Search)
```
1. Type: 3
2. Display: "Qty: 3"
3. Type: coke
4. Display: "Qty: 3" + "Search: coke"
5. Click: "Coca Cola 330ml"
6. Result: 3 x Coca Cola added
```

## Visual Feedback

### Buffer Badge
Located in the header toolbar (center):
- **Color:** Warning (yellow/orange)
- **Animation:** Fade in from top
- **Auto-hide:** Disappears when buffer clears

### Search Overlay
When search is active (3+ characters):
- **Position:** Covers product grid
- **Content:** List of matching products with category badges
- **Header:** Shows result count
- **Close:** Click X button or press Escape

## Important Notes

### When Keyboard Input is Ignored

Keyboard shortcuts are automatically disabled when typing in:
- `<input>` fields
- `<textarea>` fields
- `<ion-input>` components
- `<ion-searchbar>` components

This prevents interference with normal form input.

### Buffer Timeout

Both buffers auto-clear after **2 seconds** of inactivity. This means:
- If you type "5" and wait 3 seconds, the buffer clears
- You must complete your input within 2 seconds
- Each keystroke resets the 2-second timer

### Products with Options

If a product has variants, portions, bundles, or modifiers:
1. Quantity buffer is preserved
2. Product options modal opens
3. After selection, product is added with buffered quantity

## Configuration

No configuration required - keyboard shortcuts are always active in POS screens.

## Troubleshooting

**Q: Keyboard input not working**
- Check if you're typing in an input field
- Ensure POS screen is active (not on another page)
- Try clicking on the product grid to focus the page

**Q: Buffer not clearing**
- Press Escape to manually clear
- Wait for 2-second timeout
- Refresh the page if stuck

**Q: Search not showing results**
- Type at least 3 characters
- Check product names in database
- Verify products are active

---

**Related Documentation:**
- [POS Category Guide](./pos-category.md)
- [Product Search](../products/search.md)
