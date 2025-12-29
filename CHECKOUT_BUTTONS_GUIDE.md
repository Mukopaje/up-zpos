# Checkout Page Button Guide

## Quick Amount Buttons (Left Side - 6 buttons)
**Purpose**: Quickly set the tendered amount to common bill denominations

- **10** - Set amount to 10
- **20** - Set amount to 20
- **50** - Set amount to 50
- **100** - Set amount to 100
- **200** - Set amount to 200
- **500** - Set amount to 500

**Usage**: Click any button to instantly set the "Charged" amount to that value. Useful for quick cash transactions.

---

## Split/Balance Buttons (Right Side - 4 buttons)

### 1. **All** Button
**Purpose**: Set the exact amount needed to pay the total bill

**How it works**:
- Clicking "All" sets the "Charged" amount to exactly match the Total
- Example: Total = 47.50 → Click "All" → Charged = 47.50

**Use case**: Customer pays exact amount, no change needed

---

### 2. **1/n** Button (Split Evenly)
**Purpose**: Split the bill evenly among multiple people

**How it works**:
1. Click "1/n" button
2. Dialog appears asking "How many people?"
3. Enter number (e.g., 3 for 3 people)
4. Click "Calculate"
5. "Charged" amount is set to: Total ÷ Number of people
6. Toast shows: "Each person pays: X.XX"

**Example**: 
- Total = 150.00
- 3 people splitting
- Click "1/n" → Enter "3" → Each pays 50.00

**Use case**: Friends splitting a bill equally

---

### 3. **Split** Button (Custom Split)
**Purpose**: Accept a partial payment when splitting bills manually

**How it works**:
1. Click "Split" button
2. Dialog appears: "Enter the amount this person is paying"
3. Enter amount (must be ≤ Total)
4. Click "Set Amount"
5. "Charged" is set to that amount

**Example**:
- Total = 100.00
- Person A pays 40.00
- Click "Split" → Enter "40" → Charged = 40.00
- Process payment
- Remaining balance: 60.00 (handle separately)

**Use case**: Multiple payments with different amounts, settling partial bills

---

### 4. **Balance** Button
**Purpose**: Show the remaining balance after a partial payment

**How it works**:
1. Click "Balance" button
2. Dialog shows:
   - **Total**: The full bill amount
   - **Paid**: Amount currently entered in "Charged"
   - **Balance Due**: Remaining amount (Total - Paid)
   - Shows in red if balance remaining
   - Shows in green if overpaid

**Example**:
- Total = 75.00
- Charged = 50.00
- Click "Balance" → Shows "Balance Due: 25.00"

**Use case**: Check how much is left to pay during partial payments

---

## Action Buttons (Below Keypad - 3 buttons)

### 1. **Discount** Button
**Purpose**: Apply a discount to the entire order

**How it works**:
1. Click "Discount" button
2. Choose discount type:
   - **Percentage** (e.g., 10% off)
   - **Fixed Amount** (e.g., $5.00 off)
3. Click "Next"
4. Enter the value:
   - For percentage: 0-100 (e.g., enter "10" for 10%)
   - For fixed: amount in currency (e.g., "5.00")
5. Click "Apply"
6. Total is recalculated with discount applied

**Examples**:
- **10% discount on $100**: Enter 10% → Total becomes $90.00
- **$5 off $50**: Enter $5.00 → Total becomes $45.00

**Use case**: Special promotions, customer rewards, manager discounts

---

### 2. **Round** Button
**Purpose**: Round the total to the nearest whole number

**How it works**:
1. Click "Round" button
2. System calculates nearest whole number
3. Applies adjustment as discount/addition
4. Toast shows: "Total rounded to X.00"

**Examples**:
- **$47.80** → Rounds to **$48.00** (adds $0.20)
- **$52.30** → Rounds to **$52.00** (subtracts $0.30)
- **$100.00** → Already whole, no change

**Use case**: Simplify cash transactions, avoid small change

---

### 3. **Print Bill** Button
**Purpose**: Print the bill WITHOUT completing the payment

**How it works**:
1. Click "Print Bill" button
2. Receipt prints with:
   - All items and amounts
   - Subtotal, tax, discount, total
   - **Payment Status**: "PENDING"
   - **Note**: "BILL ONLY - NOT PAID"
3. Cart remains active, checkout stays open

**Use case**: 
- Customer wants to see itemized bill before paying
- Table service: print bill, customer reviews, then returns to pay
- Split payments: print for record keeping

---

## Payment Flow Examples

### Scenario 1: Simple Cash Payment
1. Total = $45.00
2. Click **"All"** → Charged = $45.00
3. Click **"Cash"** → Payment processed
4. Done!

---

### Scenario 2: Cash with Change
1. Total = $37.50
2. Customer gives $50
3. Click **"50"** quick button → Charged = $50.00
4. Click **"Cash"** → Payment processed
5. Receipt shows Change: $12.50

---

### Scenario 3: Split Bill (3 People, Equal)
1. Total = $90.00
2. Click **"1/n"** → Enter "3" → Each pays $30.00
3. Person 1: Charged = $30.00 → Click "Card" → Process
4. Repeat for Person 2 and Person 3
5. All paid!

---

### Scenario 4: Partial Payment
1. Total = $100.00
2. Click **"Split"** → Enter "$60"
3. Click **"Cash"** → Process $60
4. Click **"Balance"** → See remaining $40.00
5. New transaction for remaining amount

---

### Scenario 5: Discount + Round
1. Total = $123.45
2. Click **"Discount"** → "Percentage" → Enter "10"
3. New Total = $111.11
4. Click **"Round"** → Total becomes $111.00
5. Click **"All"** → Charged = $111.00
6. Click payment method → Done!

---

### Scenario 6: Print Bill First
1. Total = $85.00
2. Customer: "Let me see the bill first"
3. Click **"Print Bill"** → Bill prints
4. Customer reviews
5. Customer ready: Click **"All"** → Charged = $85.00
6. Click payment method → Complete

---

## Tips for Cashiers

1. **Use Quick Buttons**: Faster than typing for common amounts
2. **"All" is your friend**: Most transactions, just click "All" then payment method
3. **Balance Button**: Use to verify partial payments
4. **Round for cash**: Makes change easier (e.g., $47.80 → $48.00)
5. **Print Bill**: Use when customer wants to review before paying
6. **Discount requires manager**: Some systems may require authorization

