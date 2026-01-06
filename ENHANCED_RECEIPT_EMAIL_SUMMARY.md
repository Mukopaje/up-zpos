# Enhanced Receipt Email Implementation

## Overview
Receipt emails sent from the POS success modal now include richer content (itemized list, payment method, currency symbol, and store contact details) and are processed by the backend via the existing offline-safe outbox/sync pipeline.

## What Was Implemented

### 1. Customer Visibility on Category POS Screen
**Location**: `src/app/pages/pos-category/pos-category.page.html` / `.scss`

**Changes**:
- Added an always-visible customer banner just below the Cart header in the cart view
- **When a customer is selected**:
  - Shows customer name, phone, balance, and available credit in a compact pill
  - Provides a clear (X) button to remove the customer
- **When no customer is selected**:
  - Shows "No customer selected" with helper text
  - Provides a "Select" button that opens the customer selector

**Benefit**: Operators can now see which customer is attached to the ticket at a glance on the category POS screen, not just at checkout.

---

### 2. Enriched Email Receipt Payload (Frontend)
**Location**: `src/app/core/services/orders.service.ts` / `sqlite.service.ts`

**Changes**:
- `queueReceiptEmail` now:
  - Reads app settings to retrieve `currency`, `phone`, `email`, and `address`
  - Derives a lightweight `items` array from the order (name, quantity, price, total)
  - Includes `paymentMethod` from the order
  - Sends these as additional optional fields in the outbox job
- Updated `queueEmailReceiptJob` type signature to accept:
  - `currency?: string`
  - `storePhone?: string`
  - `storeEmail?: string`
  - `storeAddress?: string`
  - `paymentMethod?: string`
  - `items?: Array<{...}>`

**Backward Compatibility**: All new fields are optional; older clients that don't send them will still work without breaking the backend.

---

### 3. Backend Sync Enrichment
**Location**: `zpos-backend/src/sync/sync.service.ts`

**Changes**:
- `syncEmailReceipt` now:
  - Reads `currency`, `storePhone`, `storeEmail`, `storeAddress`, `paymentMethod`, and `items` from the incoming outbox data
  - If `items` or `paymentMethod` aren't provided by the client, it enriches them from the stored `Sale` record (by parsing the JSON items field and reading the `payment_method` column)
  - Passes all enriched fields through to the `MailService`

**Benefit**: Even if an older POS client doesn't send the new fields, the backend can often infer them from the Sale record.

---

### 4. Enhanced Receipt Email Template
**Location**: `zpos-backend/src/common/mail.service.ts`

**Changes**:
- `sendReceiptEmail` signature extended with:
  - `currency?: string` (default: `'ZMW'`)
  - `storePhone?: string`
  - `storeEmail?: string`
  - `storeAddress?: string`
  - `paymentMethod?: string`
  - `items?: Array<{...}>`
- Email body now includes:
  - **Items table**: When `items` are present, a formatted table shows item name, quantity, unit price (with currency), and line total
  - **Currency symbol**: All monetary values (prices, totals) now display with the configured currency (e.g., `ZMW 125.00`)
  - **Payment method**: If provided, shows "Payment Method: cash/card/mobile/credit" below the total
  - **Store contact section**: If any store contact detail (phone, email, address) is present, renders a "Store Contact" section at the bottom with the business's address, phone, and email

**Styling**: The email maintains a clean, professional look with proper alignment and spacing, using the existing ZPOS color palette.

---

## Data Flow

1. **POS → Outbox**:
   - When the user clicks "Email" in the success modal, `handleEmailFromModal` in the checkout page calls `ordersService.queueReceiptEmail(order, email, businessName)`
   - `queueReceiptEmail`:
     - Reads app settings from local storage to get currency and store contact details
     - Derives item lines from the order
     - Queues an outbox job with all enriched fields via `sqlite.queueEmailReceiptJob`

2. **Outbox → Backend Sync**:
   - The sync service's `/sync/outbox` endpoint receives the outbox job with `table_name = 'email_receipts'`
   - `syncEmailReceipt` in `SyncService`:
     - Extracts provided fields (currency, items, paymentMethod, store contact)
     - Attempts to load the matching `Sale` by tenant + order number
     - If the sale exists and fields are missing, enriches them from the sale's data
     - Calls `mailService.sendReceiptEmail(...)` with the complete payload

3. **Backend → SMTP**:
   - `MailService.sendReceiptEmail`:
     - Builds an HTML email body using the provided fields
     - Only renders the items table if items are present
     - Only renders the store contact section if at least one contact field is present
     - Sends the email via the configured SMTP transporter

---

## Testing Notes

- **Frontend build**: Successful (only existing SCSS budget warning for category POS remains)
- **Backend build**: Successful (TypeScript compilation clean)
- **Backward compatibility**: All new fields are optional; older clients will continue to work and receive simpler emails; the backend will try to enrich from the Sale record when possible

---

## Example Email Output

**Subject**: `Receipt - Order #INV-20260105-0042`

**Body**:
- Greeting with customer name
- Thank you message with business name
- Order number and date
- **Items table** (if present):
  ```
  Item              Qty  Price      Total
  Coffee            2    ZMW 15.00  ZMW 30.00
  Sandwich          1    ZMW 25.00  ZMW 25.00
  ```
- **Total Paid**: `ZMW 55.00`
- **Payment Method**: `card` (if present)
- **Store Contact** (if present):
  ```
  Store Contact
  123 Main St, Lusaka
  Tel: +260 123 456 789
  Email: info@mystore.com
  ```
- Footer with contact instructions

---

## Future Enhancements (Optional)

- Add subtotal/tax/discount breakdown if needed
- Include a QR code linking to the receipt or a feedback form
- Support per-tenant email branding (logo, colors) from backend settings
