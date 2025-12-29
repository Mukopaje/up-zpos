# Complete Management System Testing Guide

## Overview
This guide provides step-by-step testing procedures for all management pages and the dynamic POS routing system.

## Prerequisites
- Application running (`npm start`)
- Database initialized with default data
- Admin user logged in (has access to all modules)

---

## Test Suite 1: Settings Management

### Test 1.1: Business Type Configuration
**Objective:** Verify business type selection and default POS mode assignment

**Steps:**
1. Navigate to Settings page
2. Click "Business Type" button (should show current type)
3. Select "Restaurant" from action sheet
4. **Expected:** "Select Default POS Mode" should auto-update to "Hospitality"
5. Click "Select Default POS Mode" to verify it's set
6. Change Business Type to "Retail Store"
7. **Expected:** Default POS Mode should auto-update to "Retail"

**Success Criteria:**
- ✅ Business type changes reflect immediately
- ✅ Default POS mode updates automatically based on business type
- ✅ Action sheet displays all 10 business types
- ✅ Labels display correctly in the UI

### Test 1.2: Manual POS Mode Override
**Objective:** Verify user can override automatic POS mode selection

**Steps:**
1. Set Business Type to "Restaurant" (defaults to "Hospitality")
2. Click "Select Default POS Mode"
3. Choose "Category" from action sheet
4. Click "Save Settings"
5. **Expected:** Toast shows "Settings updated successfully"
6. Refresh page
7. **Expected:** Settings persist (Business Type: Restaurant, POS Mode: Category)

**Success Criteria:**
- ✅ Manual override works
- ✅ Settings save correctly
- ✅ Settings persist after refresh
- ✅ Toast notification appears

### Test 1.3: Printer Settings
**Objective:** Verify printer settings are separate from app settings

**Steps:**
1. Scroll to "Business Information" section
2. Update Business Name, Address, Phone
3. Scroll to "Receipt Settings"
4. Toggle "Print Receipt Automatically"
5. Change "Receipt Footer Text"
6. Click "Save Settings"
7. **Expected:** Only printer settings update (POS mode unchanged)

**Success Criteria:**
- ✅ Printer settings save independently
- ✅ No interference with app settings
- ✅ All toggles work correctly

---

## Test Suite 2: Users Management

### Test 2.1: User Creation
**Objective:** Create a new user with role, PIN, and terminal access

**Steps:**
1. Navigate to Users page
2. Click "Add User" button
3. Fill in:
   - Username: `testuser1`
   - First Name: `Test`
   - Last Name: `User`
   - Email: `test@example.com`
   - PIN: `1234`
4. Click "Select Role" → Choose "Cashier"
5. Click "Manage Terminals" → Select "All Terminals"
6. Click "Create"
7. **Expected:** New user appears in the list with:
   - Green "Active" badge
   - "Cashier (Level 2)" badge
   - "PIN: Set" indicator
   - "All terminals" access

**Success Criteria:**
- ✅ User created successfully
- ✅ All fields saved correctly
- ✅ User appears in active users list
- ✅ Avatar shows initials "TU"

### Test 2.2: Role Assignment
**Objective:** Change user role and verify permissions update

**Steps:**
1. Find the user created in Test 2.1
2. Click user card → Click "Change Role"
3. Select "Manager" from action sheet
4. **Expected:** 
   - Badge updates to "Manager (Level 3)"
   - User card refreshes immediately

**Success Criteria:**
- ✅ Role changes immediately
- ✅ Badge updates correctly
- ✅ Level number is accurate

### Test 2.3: PIN Management
**Objective:** Update user PIN

**Steps:**
1. Click user card → Click "Change PIN"
2. Enter new PIN: `5678`
3. Confirm PIN: `5678`
4. Click "OK"
5. **Expected:** Toast shows "PIN updated successfully"
6. "PIN: Set" indicator remains (not changed to actual PIN)

**Success Criteria:**
- ✅ PIN updates successfully
- ✅ PIN validation works (must match)
- ✅ PIN not displayed in UI (security)
- ✅ Toast notification appears

### Test 2.4: Terminal Access Control
**Objective:** Restrict user to specific terminals

**Steps:**
1. Click user card → Click "Manage Terminals"
2. Deselect "All Terminals"
3. Select specific terminals (e.g., "Main Counter", "Drive-Thru")
4. Click "OK"
5. **Expected:** 
   - Terminal count updates (e.g., "2 terminals")
   - User can only login from selected terminals

**Success Criteria:**
- ✅ Terminal selection works
- ✅ Count displays correctly
- ✅ Multi-select works properly

### Test 2.5: User Status Toggle
**Objective:** Deactivate and reactivate user

**Steps:**
1. Click user card → Click "Deactivate"
2. Confirm in alert dialog
3. **Expected:** 
   - Badge changes to red "Inactive"
   - User moves to inactive section
4. Click "Activate" button
5. **Expected:** User returns to active section

**Success Criteria:**
- ✅ Status toggles correctly
- ✅ Badge color changes (green/red)
- ✅ Filtering works (active/inactive sections)

### Test 2.6: User Search
**Objective:** Search and filter users

**Steps:**
1. Type "test" in search bar
2. **Expected:** Only users with "test" in name/username appear
3. Clear search
4. **Expected:** All users appear again

**Success Criteria:**
- ✅ Search filters correctly
- ✅ Search is case-insensitive
- ✅ Clear search works

---

## Test Suite 3: Tables Management

### Test 3.1: Table Creation
**Objective:** Create tables for different sections

**Steps:**
1. Navigate to Tables page
2. Click "Add Table"
3. Fill in:
   - Table Number: `1`
   - Section: `Main Hall`
   - Capacity: `4`
4. Click "Select Shape" → Choose "Round"
5. Click "Create"
6. **Expected:** New table appears with:
   - "Free" status (green badge)
   - Round table icon
   - "4 seats" capacity
   - "Seat Guests" button

**Success Criteria:**
- ✅ Table created successfully
- ✅ Shape icon displays correctly
- ✅ Status badge is green
- ✅ Section filter works

### Test 3.2: Section Filtering
**Objective:** Filter tables by section

**Steps:**
1. Create tables in different sections (Main Hall, Patio, VIP)
2. Click "Main Hall" segment
3. **Expected:** Only Main Hall tables appear
4. Click "All" segment
5. **Expected:** All tables appear

**Success Criteria:**
- ✅ Section filter works immediately
- ✅ Stats update per section
- ✅ Computed signal reacts properly

### Test 3.3: Seat Guests Workflow
**Objective:** Assign guests and waiter to table

**Steps:**
1. Find a "Free" table
2. Click "Seat Guests" button
3. Enter:
   - Guest Name: `Smith Party`
   - Number of Guests: `4`
4. Click "Select Waiter" → Choose a waiter
5. Click "OK"
6. **Expected:**
   - Table status changes to "Occupied" (orange badge)
   - Guest info displays: "Smith Party (4 guests)"
   - Waiter name appears
   - Button changes to "View Order"

**Success Criteria:**
- ✅ Status changes to Occupied
- ✅ Guest info saves and displays
- ✅ Waiter assignment works
- ✅ Actions update appropriately

### Test 3.4: Clear Table
**Objective:** Clear table and reset status

**Steps:**
1. Find an "Occupied" table
2. Click "Clear Table" button
3. Confirm in alert
4. **Expected:**
   - Status changes back to "Free"
   - Guest info removed
   - Waiter unassigned
   - Amount cleared
   - Button changes to "Seat Guests"

**Success Criteria:**
- ✅ Table clears completely
- ✅ Waiter's currentTables updated
- ✅ Status resets to Free
- ✅ UI updates immediately

### Test 3.5: Table Stats
**Objective:** Verify stats calculation

**Steps:**
1. Note initial stats (Total, Available, Occupied, Reserved)
2. Seat guests at 2 tables (Occupied)
3. Edit 1 table → Change status to "Reserved"
4. **Expected Stats:**
   - Total: Total number of tables
   - Available: Free + Cleaning tables
   - Occupied: Number of occupied tables
   - Reserved: Number of reserved tables

**Success Criteria:**
- ✅ Stats calculate correctly
- ✅ Stats update in real-time
- ✅ Computed signal works properly

---

## Test Suite 4: Waiters Management

### Test 4.1: Waiter Creation
**Objective:** Create waiter from existing user

**Steps:**
1. Navigate to Waiters page
2. Click "Add Waiter"
3. Click "Select User"
4. Choose a user (e.g., one with Waiter role)
5. Click "Assign Section" → Choose "Main Hall"
6. Click "Create"
7. **Expected:** New waiter appears with:
   - User's name and avatar
   - Section badge
   - "0 tables" count
   - Today's stats (all zeros initially)

**Success Criteria:**
- ✅ Waiter created successfully
- ✅ Links to existing user account
- ✅ Section assigned correctly
- ✅ Stats initialized properly

### Test 4.2: Section Assignment
**Objective:** Change waiter's assigned section

**Steps:**
1. Click waiter card → Click "Assign Section"
2. Select different section (e.g., "Patio")
3. **Expected:**
   - Section badge updates immediately
   - Waiter can now serve tables in new section

**Success Criteria:**
- ✅ Section updates correctly
- ✅ Badge changes immediately
- ✅ Action sheet shows all available sections

### Test 4.3: View Assigned Tables
**Objective:** See which tables waiter is serving

**Steps:**
1. Assign waiter to an occupied table (see Test 3.3)
2. Go to Waiters page
3. Click waiter card → Click "View Tables"
4. **Expected:**
   - Alert shows list of assigned tables
   - Table numbers displayed correctly
   - If no tables: "No tables assigned" message

**Success Criteria:**
- ✅ Assigned tables list correctly
- ✅ Empty state works
- ✅ Real-time updates when tables assigned

### Test 4.4: Performance Stats
**Objective:** Verify stats tracking

**Steps:**
1. Check "Today's Performance" section for a waiter
2. Verify stats show:
   - Orders Today
   - Total Sales
   - Avg Order Value
3. **Note:** Currently shows zeros (no order integration yet)

**Success Criteria:**
- ✅ Stats section displays
- ✅ Currency formatted correctly (KES)
- ✅ All three metrics visible

### Test 4.5: Global Stats
**Objective:** Verify page-level statistics

**Steps:**
1. Look at stats grid at top of Waiters page
2. Verify:
   - Total Waiters: Count of all waiters
   - Active: Count of active waiters
   - Serving Tables: Sum of all currentTables lengths
   - Today's Sales: Sum of all sales (currently 0)

**Success Criteria:**
- ✅ Total count matches list
- ✅ Active count excludes inactive waiters
- ✅ Table count updates when tables assigned
- ✅ Sales aggregation works

---

## Test Suite 5: Dynamic POS Routing

### Test 5.1: Default Routing - Category Mode
**Objective:** Verify /pos redirects to /pos-category by default

**Steps:**
1. Ensure no settings configured (or defaultPosMode = 'category')
2. Navigate to `/pos` in browser or click "POS" in menu
3. **Expected:**
   - URL changes to `/pos-category`
   - Category POS page loads
   - No errors in console

**Success Criteria:**
- ✅ Redirect happens immediately
- ✅ Correct page loads
- ✅ No inject() errors

### Test 5.2: Retail Mode Routing
**Objective:** Verify routing to retail mode

**Steps:**
1. Go to Settings
2. Set Business Type to "Retail Store" (auto-selects Retail mode)
3. Save settings
4. Navigate to `/pos`
5. **Expected:**
   - URL changes to `/pos-retail`
   - Retail POS page with barcode scanner loads
   - Menu collapses (auto-hide in POS routes)

**Success Criteria:**
- ✅ Routes to /pos-retail
- ✅ Barcode scanner visible
- ✅ Product list loads
- ✅ Menu hides automatically

### Test 5.3: Hospitality Mode Routing
**Objective:** Verify routing to hospitality mode

**Steps:**
1. Go to Settings
2. Set Business Type to "Restaurant" (auto-selects Hospitality mode)
3. Save settings
4. Navigate to `/pos`
5. **Expected:**
   - URL changes to `/pos-hospitality`
   - Hospitality POS page loads
   - Table selection interface visible

**Success Criteria:**
- ✅ Routes to /pos-hospitality
- ✅ Table interface loads
- ✅ Menu hides automatically

### Test 5.4: Manual Override Routing
**Objective:** Verify manual POS mode selection works

**Steps:**
1. Go to Settings
2. Set Business Type to "Restaurant"
3. Manually change Default POS Mode to "Category"
4. Save settings
5. Navigate to `/pos`
6. **Expected:**
   - URL changes to `/pos-category` (respects override)
   - Not /pos-hospitality (ignores business type default)

**Success Criteria:**
- ✅ Manual override takes precedence
- ✅ Routes to configured mode
- ✅ Settings persist

### Test 5.5: Menu Navigation
**Objective:** Verify clicking POS menu item uses dynamic routing

**Steps:**
1. Configure settings (any POS mode)
2. Click "POS" in sidebar menu
3. **Expected:**
   - Guard executes
   - Routes to configured POS mode
   - Menu collapses

**Success Criteria:**
- ✅ Menu click triggers guard
- ✅ Routes correctly
- ✅ Menu auto-hides

---

## Test Suite 6: Integration Tests

### Test 6.1: Users → Waiters Integration
**Objective:** Verify waiter creation pulls from users

**Steps:**
1. Create a new user (see Test 2.1)
2. Go to Waiters page
3. Click "Add Waiter" → "Select User"
4. **Expected:**
   - Action sheet shows all available users
   - Newly created user appears in list
5. Select the user
6. **Expected:**
   - Waiter created with user's name
   - Avatar matches user's initials

**Success Criteria:**
- ✅ User list loads correctly
- ✅ Only available users shown (not already waiters)
- ✅ Data links properly

### Test 6.2: Tables ↔ Waiters Integration
**Objective:** Verify table assignment updates waiter stats

**Steps:**
1. Create a waiter (assign to "Main Hall")
2. Create a table (in "Main Hall")
3. Seat guests at the table → Select the waiter
4. Go to Waiters page
5. **Expected:**
   - Waiter's "Serving Tables" shows "1 table"
   - Badge displays table number
6. Clear the table
7. **Expected:**
   - Waiter's count returns to "0 tables"

**Success Criteria:**
- ✅ Table assignment updates waiter immediately
- ✅ Clearing table updates waiter
- ✅ Count is accurate
- ✅ Bi-directional sync works

### Test 6.3: Settings → POS Integration
**Objective:** Verify settings control POS routing

**Steps:**
1. Start with Business Type: "Retail Store" (POS Mode: Retail)
2. Navigate to `/pos` → Should go to /pos-retail
3. Change Settings to Business Type: "Restaurant" (POS Mode: Hospitality)
4. Navigate to `/pos` again
5. **Expected:**
   - Now routes to /pos-hospitality
   - Guard reads updated settings

**Success Criteria:**
- ✅ Settings change affects routing
- ✅ No cache issues
- ✅ Immediate effect (no restart needed)

### Test 6.4: Terminals → Users Integration
**Objective:** Verify terminal access control

**Steps:**
1. Create 2 terminals: "Terminal 1", "Terminal 2"
2. Create a user and assign only "Terminal 1" access
3. **Expected (Future):**
   - User can only login from Terminal 1
   - Login from Terminal 2 denied
4. Change user to "All Terminals"
5. **Expected (Future):**
   - User can login from any terminal

**Success Criteria:**
- ✅ Terminal assignment saves
- ✅ Access control enforced (when implemented)
- ✅ "All terminals" override works

---

## Test Suite 7: Error Handling

### Test 7.1: Validation Errors
**Objective:** Verify form validation works

**Steps:**
1. Try to create user without username
2. **Expected:** "Please fill in all required fields" alert
3. Try to create user with PIN < 4 digits
4. **Expected:** "PIN must be 4-6 digits" alert
5. Try to confirm PIN with mismatch
6. **Expected:** "PINs do not match" alert

**Success Criteria:**
- ✅ Required field validation works
- ✅ PIN length validation works
- ✅ PIN match validation works

### Test 7.2: Duplicate Prevention
**Objective:** Prevent duplicate entries

**Steps:**
1. Create a user with username "testuser"
2. Try to create another user with same username
3. **Expected (Future):** "Username already exists" error

**Success Criteria:**
- ✅ Duplicate detection works (when implemented)
- ✅ Clear error message

### Test 7.3: Delete Confirmation
**Objective:** Prevent accidental deletions

**Steps:**
1. Click delete button on any entity
2. **Expected:** Alert appears with "Cancel" and "Delete" buttons
3. Click "Cancel"
4. **Expected:** Entity not deleted
5. Click delete again → Click "Delete"
6. **Expected:** Entity deleted, toast shows confirmation

**Success Criteria:**
- ✅ Confirmation dialog appears
- ✅ Cancel works
- ✅ Delete works
- ✅ Toast notification appears

---

## Test Suite 8: UI/UX Tests

### Test 8.1: Responsive Design
**Objective:** Verify UI works on different screen sizes

**Steps:**
1. Resize browser window to mobile size (< 768px)
2. **Expected:** Cards stack vertically, single column
3. Resize to tablet (768px - 1024px)
4. **Expected:** 2 columns
5. Resize to desktop (> 1024px)
6. **Expected:** 3+ columns

**Success Criteria:**
- ✅ Grid layout responsive
- ✅ No horizontal scroll
- ✅ Touch targets adequate on mobile

### Test 8.2: Empty States
**Objective:** Verify empty state messages

**Steps:**
1. Navigate to Users page with no users
2. **Expected:** "No users found" message with helpful text
3. Navigate to Tables page with no tables
4. **Expected:** "No tables found. Click 'Add Table' to get started."
5. Search for non-existent item
6. **Expected:** "No results found" message

**Success Criteria:**
- ✅ Empty states display correctly
- ✅ Helpful messages shown
- ✅ Action hints provided

### Test 8.3: Loading States
**Objective:** Verify loading indicators work

**Steps:**
1. Navigate to any management page
2. **Expected (if slow DB):** Loading spinner or skeleton
3. After data loads
4. **Expected:** Content appears, loading hidden

**Success Criteria:**
- ✅ Loading state shows during async operations
- ✅ Smooth transition to loaded state
- ✅ No flash of empty state

### Test 8.4: Icon Display
**Objective:** Verify all icons load correctly

**Steps:**
1. Check browser console for icon warnings
2. **Expected:** No "Ion icon not found" warnings
3. Verify icons appear for:
   - Menu items (cart, receipt, cube, etc.)
   - Action buttons (add, edit, delete)
   - Status badges (checkmark, close)
   - Table shapes (square, circle, rectangle)

**Success Criteria:**
- ✅ No icon warnings
- ✅ All icons render correctly
- ✅ Chevron icons work (menu collapse)

---

## Performance Tests

### Test 9.1: Large Dataset Handling
**Objective:** Verify performance with many records

**Steps:**
1. Create 100+ tables
2. **Expected:**
   - Page loads without lag
   - Search/filter remains fast
   - Grid renders smoothly
3. Filter by section with many tables
4. **Expected:**
   - Filter applies instantly (computed signal)

**Success Criteria:**
- ✅ No noticeable lag
- ✅ Smooth scrolling
- ✅ Fast filtering

### Test 9.2: Signal Reactivity
**Objective:** Verify signals update efficiently

**Steps:**
1. Open Waiters page
2. Assign table to waiter (from Tables page)
3. **Expected:**
   - Waiters page updates immediately (if in view)
   - Stats recalculate instantly
4. Change setting in Settings page
5. Navigate to /pos
6. **Expected:**
   - Guard reads latest setting
   - No stale data

**Success Criteria:**
- ✅ Signals react immediately
- ✅ No unnecessary re-renders
- ✅ Computed values update correctly

---

## Regression Tests

### Test 10.1: Previous Features Still Work
**Objective:** Ensure new features didn't break existing ones

**Steps:**
1. Login flow still works
2. Data loader initializes database
3. POS pages load correctly
4. Cart functionality works
5. Menu collapse/expand works
6. Logout works

**Success Criteria:**
- ✅ All previous features functional
- ✅ No new errors introduced

---

## Test Results Template

Use this template to record test results:

```markdown
## Test Session: [Date]
**Tester:** [Name]
**Environment:** [Dev/Staging/Production]
**Device:** [Desktop/Mobile/Tablet]

### Test Suite 1: Settings Management
- [ ] Test 1.1: Business Type Configuration - PASS/FAIL
  - Notes: 
- [ ] Test 1.2: Manual POS Mode Override - PASS/FAIL
  - Notes:
- [ ] Test 1.3: Printer Settings - PASS/FAIL
  - Notes:

### Test Suite 2: Users Management
- [ ] Test 2.1: User Creation - PASS/FAIL
- [ ] Test 2.2: Role Assignment - PASS/FAIL
- [ ] Test 2.3: PIN Management - PASS/FAIL
- [ ] Test 2.4: Terminal Access Control - PASS/FAIL
- [ ] Test 2.5: User Status Toggle - PASS/FAIL
- [ ] Test 2.6: User Search - PASS/FAIL

[... continue for all test suites ...]

### Overall Results
**Total Tests:** X
**Passed:** Y
**Failed:** Z
**Blocked:** N/A

### Critical Issues Found
1. [Issue description]
2. [Issue description]

### Notes
[Any additional observations]
```

---

## Automation Recommendations

### Priority Tests for Automation
1. **User CRUD operations** - High volume, repetitive
2. **Settings changes and routing** - Critical path
3. **Table/Waiter integration** - Complex workflow
4. **Validation tests** - Many edge cases

### Tools to Consider
- **Cypress** - E2E testing for Angular
- **Playwright** - Cross-browser testing
- **Jest** - Unit testing for services
- **Angular Testing Library** - Component testing

---

## Test Data Cleanup

After testing, clean up test data:

```typescript
// Run in browser console or create cleanup script
const db = new PouchDB('zpos');

// Delete test users
db.find({ selector: { type: 'user', username: { $regex: 'test' } } })
  .then(result => {
    result.docs.forEach(doc => db.remove(doc));
  });

// Delete test tables
db.find({ selector: { type: 'table', number: { $gte: 100 } } })
  .then(result => {
    result.docs.forEach(doc => db.remove(doc));
  });

// Delete test waiters
db.find({ selector: { type: 'waiter', userId: { $regex: 'test' } } })
  .then(result => {
    result.docs.forEach(doc => db.remove(doc));
  });
```

---

## Support and Issues

### Reporting Bugs
When reporting issues, include:
1. Test case number (e.g., Test 2.3)
2. Steps to reproduce
3. Expected vs actual result
4. Screenshots/console errors
5. Browser/device info

### Contact
- GitHub Issues: [Repository URL]
- Email: [Support email]
- Slack: [Channel]

---

**Last Updated:** January 2025  
**Version:** 1.0  
**Status:** Ready for Testing
