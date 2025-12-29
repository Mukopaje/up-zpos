# Phase 0 – Real Device Test Checklist

Use this checklist on real devices (tablets/phones) with actual printers and scanners to validate hardware behavior **before** proceeding with later phases.

---

## 1. Setup & Environment

- [ ] App built with current main branch.
- [ ] App installed on at least one Android tablet.
- [ ] App installed on at least one Android phone (optional but recommended).
- [ ] At least one supported Bluetooth receipt printer is available and charged.
- [ ] Test rolls of receipt paper are installed.
- [ ] Stable Wi‑Fi is available (for initial online tests), but can be disabled for offline tests.
- [ ] Device has working rear camera for barcode scanning.

**Notes:**
- Record device model(s), OS version, and printer model(s) used.

---

## 2. Bluetooth Printer Pairing

- [ ] Turn on the printer and make it discoverable.
- [ ] From the device OS Bluetooth settings, ensure the printer is visible.
- [ ] Within the app’s Printer Settings:
  - [ ] Open printer discovery / scan.
  - [ ] See the printer in the list.
  - [ ] Select and pair/connect to the printer.
- [ ] Confirm the app shows printer as **Connected** or similar.

**Record:**
- Printer model:
- MAC address:
- Any pairing/connection issues:

---

## 3. Test Receipt Printing (From Settings)

- [ ] Navigate to Printer Settings / Test Print.
- [ ] Trigger a test receipt.
- [ ] Printer responds within a few seconds.
- [ ] Output review:
  - [ ] Header text visible and centered.
  - [ ] Logo prints (if configured) and fits the paper.
  - [ ] Item lines are aligned with proper columns.
  - [ ] Totals and tax values are correct and clearly visible.
  - [ ] Currency symbol and formatting are correct.
- [ ] Paper cutting / feed behavior is acceptable.

**Issues found / screenshots / photos:**

---

## 4. Test Receipt Printing (From Real Sale)

- [ ] Ensure at least one product exists in the system.
- [ ] Navigate to POS screen (Retail/Category/Hospitality as appropriate).
- [ ] Add one or more items to cart.
- [ ] Apply discount/tax as typical for the business.
- [ ] Proceed to checkout.
- [ ] Select payment method (e.g., cash) and complete sale.
- [ ] Verify app either auto-prints or offers a print button.
- [ ] Print real receipt.
- [ ] Check that:
  - [ ] All items and quantities are correct.
  - [ ] Prices, discounts, taxes, and totals are accurate.
  - [ ] Date/time and order number are printed.
  - [ ] Customer details are included if selected.

**Notes / discrepancies:**

---

## 5. Printer Error Behavior

Simulate common error conditions and observe app behavior.

- [ ] Turn off the printer while app is connected, then try to print:
  - [ ] App shows a clear error (not stuck loading forever).
  - [ ] User understands they need to turn on printer and retry.
- [ ] Move printer out of Bluetooth range and try to print:
  - [ ] App reports failure reasonably quickly.
- [ ] Open printer cover / remove paper (if printer reports this):
  - [ ] Attempt to print.
  - [ ] Check if error is handled gracefully.
- [ ] After resolving each issue (turn on, move closer, reload paper):
  - [ ] Retry print and confirm it now works.

**Notes on UX clarity and required improvements:**

---

## 6. Barcode Scanning – Camera (ML Kit)

- [ ] Open a POS product search / add-by-barcode screen.
- [ ] Activate camera scanner.
- [ ] Test scanning these barcodes (prepare physical labels):
  - [ ] EAN-13 (e.g., retail product barcode).
  - [ ] Code-128 (if used for internal labels).
  - [ ] Any other formats the business cares about.
- [ ] For each test barcode:
  - [ ] Time from camera open to successful scan is acceptable.
  - [ ] Correct product is selected in the app.
- [ ] Low/medium/high light tests:
  - [ ] Works in well-lit conditions.
  - [ ] Acceptable in typical shop lighting.
  - [ ] Note behavior in very low light.
- [ ] Reflective packaging test:
  - [ ] Scan barcodes on shiny packaging and record any issues.

**Notes on speed/accuracy and user friendliness:**

---

## 7. Barcode Scanning – Hardware Scanner (If Used)

If you plan to use a USB/Bluetooth hardware scanner that emulates keyboard input:

- [ ] Plug in or pair the scanner.
- [ ] Ensure scanner is configured in keyboard-wedge mode.
- [ ] Focus barcode input field in the POS.
- [ ] Scan different barcodes repeatedly.
- [ ] Confirm:
  - [ ] Scans appear as text input followed by Enter/Return.
  - [ ] App searches/selects product automatically.
  - [ ] No extra unwanted characters are added.

**Hardware scanner model(s) and observations:**

---

## 8. Offline Behavior & Persistence

- [ ] With app installed and data loaded, turn **off** Wi‑Fi and mobile data.
- [ ] Perform this sequence while offline:
  - [ ] Open POS and browse products.
  - [ ] Add items to cart and hold an order (if supported).
  - [ ] Resume held order and complete checkout.
  - [ ] Create or edit a customer.
- [ ] Force close the app (swipe away) and relaunch.
- [ ] Confirm:
  - [ ] Products and categories are still available.
  - [ ] Recently created/edited customers are still present.
  - [ ] Recent sales and held orders are still visible.

**Any lost data or inconsistencies:**

---

## 9. Performance & UX Impressions

- [ ] Overall navigation speed is acceptable on the test device.
- [ ] POS screens open without noticeable lag.
- [ ] Scrolling product lists is smooth enough.
- [ ] Checkout and receipt printing are responsive.

**Testers’ general feedback (pain points, confusion, wishes):**

---

## 10. Phase 0 Exit Decision

To proceed to backend/sync/admin work, confirm all of the following:

- [ ] Printing is reliable and acceptable for day-to-day operations.
- [ ] Scanning is reliable in realistic operating conditions.
- [ ] Offline persistence works across app restarts.
- [ ] No critical UX or performance blockers were discovered.

If any box is unchecked, list blocking issues and required fixes **before** continuing to later phases.
