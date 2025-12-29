# Remaining Work – Implementation Plan

_Last updated: December 29, 2025_

This plan focuses on completing remaining work (including optional features) with **real-device testing (printing, scanning, offline)** as the first gate before further build work.

---

## Phase 0 – Real Device Validation (Blocker Gate)

**Goal:** Prove that the current app works end-to-end on actual hardware (tablet/phone + printer + scanner) before investing further.

### 0.1 Prepare Test Environment
- Build and install current app on:
  - At least one Android tablet (primary POS device).
  - At least one Android phone (secondary form factor check).
- Ensure availability of:
  - At least one supported Bluetooth receipt printer (e.g., Datecs model).
  - Barcode scanning setup (device camera + optional hardware scanner).

### 0.2 Printing Tests
- Pair/Connect Bluetooth receipt printer from the app (Printer Settings).
- Test flows:
  - Print a test receipt from Printer Settings / Print Test.
  - Complete a real checkout (cash sale) and auto-print a receipt.
- Verify:
  - Print speed and stability.
  - Layout and alignment (logo position, columns, totals).
  - Currency format and symbols.
  - Paper width and wrapping.
  - Multi-copy behavior (if configured).
- Error behavior:
  - Printer off / out of range.
  - Out of paper / paper door open.
  - Reconnect after error.
- Decision:
  - Confirm whether this printer model is acceptable for production use.

### 0.3 Barcode Scanning Tests
- **Camera-based scanning (MLKit):**
  - From POS screens, scan typical barcodes:
    - EAN-13, Code-128 (and any formats we support).
  - Test conditions:
    - Good light, poor light, reflective packaging.
    - Distances and angles typical at POS.
  - Verify:
    - Speed to first successful scan.
    - Accuracy (correct product matched).
    - Behavior when multiple barcodes are visible.
- **Hardware scanner (if used):**
  - Connect USB/Bluetooth scanner (keyboard wedge mode).
  - Focus barcode input in POS and scan repeatedly.
  - Confirm scanned codes behave like keyboard input and trigger product selection.

### 0.4 Offline Behavior Sanity Check
- On the test device:
  - Turn off Wi-Fi and mobile data.
  - Perform a realistic POS session:
    - Add products to cart.
    - Hold order (if used) and resume.
    - Complete checkout.
  - Kill the app completely, relaunch it.
  - Confirm:
    - Products, customers, and settings are still present.
    - Recent orders and held orders persist (SQLite + jeep-sqlite OK).

### 0.5 Exit Criteria for Phase 0
We proceed beyond Phase 0 **only if all are true**:
- Receipts print correctly and reliably on at least one target printer model.
- Barcodes scan reliably in realistic shop conditions.
- Core POS flow (add to cart → checkout → print) is stable offline across app restarts.

If any fail, capture:
- Exact failure scenario.
- Logs/screenshots.
- Proposed fixes or hardware changes.

---

## Phase 1 – Backend Deployment & Wiring

**Goal:** Get the NestJS backend running in a stable environment and connect the app to it.

### 1.1 Environment Setup
- Choose hosting (e.g., DigitalOcean/AWS/Azure).
- Provision database (PostgreSQL or MongoDB as designed in backend).
- Configure environment variables:
  - DB connection URL.
  - JWT secret.
  - OpenAI API key (if AI features are enabled).
  - Any multi-tenant configuration.

### 1.2 Backend Deployment
- Build and deploy NestJS API.
- Configure HTTPS and valid SSL certificate.
- Enable CORS for:
  - Web origin (domain where PWA is served).
  - Native app origins (Capacitor, if required).

### 1.3 Frontend Wiring
- Update environment.prod.ts with real `apiUrl`.
- Optionally create `environment.staging.ts` for pre-production testing.
- Verify via the app:
  - Registration/login.
  - Simple API calls to `/auth` and `/sync` endpoints.

### 1.4 Backend Smoke Tests
- Use Postman/Insomnia to verify:
  - `/auth/register` and `/auth/login` work end-to-end.
  - `/sync/outbox` accepts outbox payloads.
  - `/sync/pull` returns updates in expected format.
  - AI endpoints respond when expected.

**Exit Criteria:**
- Backend is reachable over HTTPS from test devices.
- Auth and sync endpoints respond correctly for happy paths.

---

## Phase 2 – Sync & Multi-Terminal Validation

**Goal:** Make cloud sync reliable and safe for multi-device usage.

### 2.1 Single-Device Sync Bring-Up
- From a single device, trigger `fullSync()` manually (via a debug button or settings screen).
- Observe:
  - Outbox items are pushed and marked `synced`.
  - Pull updates apply correctly into local SQLite.

### 2.2 Multi-Device Scenarios
- Test with 2–3 devices under the same tenant:
  - Create/update products, customers, and orders on Device A, sync, then sync Device B.
  - Verify Device B sees changes from Device A and vice versa.
  - Introduce conflicts intentionally:
    - Edit the same product on both devices before syncing.
  - Confirm version-based conflict resolution rules behave as designed.

### 2.3 Error & Edge-Case Testing
- Network interruption:
  - Start sync, then disable network; later restore and retry.
- Large data volume:
  - Seed database with thousands of products and hundreds of orders.
  - Measure sync duration and responsiveness.
- API failures:
  - Simulate 500 errors, timeouts, and invalid responses from backend.

### 2.4 UX Decisions for Sync
- Decide sync triggers:
  - Manual button in Settings.
  - On app open.
  - Periodic background sync.
  - On network reconnection.
- Ensure:
  - Clear status indication (last sync time, status badges).
  - User-friendly error messages when sync fails.

**Exit Criteria:**
- No data loss or corruption in test scenarios.
- Sync performance acceptable for realistic data sizes.
- Clear operator story: how/when sync is run and what users see.

---

## Phase 3 – Complete Remaining Core/Admin Features

**Goal:** Close functionality gaps so administrators can operate comfortably.

### 3.1 High-Value Admin Pages
- Implement and wire:
  - **AccountsPage** – customer credit account management.
  - **CustomerDetailsPage** – full customer profile + transaction history.
  - **LocationsPage** – basic multi-location management.
  - **OnboardingPage** – new tenant/terminal setup wizard.

### 3.2 Permissions & Access Control
- Integrate new pages with existing RBAC:
  - Role-based access control for each new feature.
  - Tenant isolation enforced in all queries.

### 3.3 Data & Sync Integration
- Ensure new data fields/tables:
  - Are added to SQLite schema.
  - Participate in outbox and sync flows.
  - Have appropriate indexes.

**Exit Criteria:**
- Admins can manage credit, locations, and detailed customer info.
- All new entities persist locally and sync correctly.

---

## Phase 4 – Optional / Enhancing Features

**Goal:** Add higher-value features that are not blockers but improve competitiveness.

### 4.1 Promotions & Loyalty
- **PromotionsPage:**
  - Support percentage/flat discounts.
  - Time-based or campaign-based promotions.
  - Optional integration into POS cart logic.
- **LoyaltyPage:**
  - Basic points system per customer.
  - Points earn/redeem rules.

### 4.2 Operational Enhancements
- **StaffSchedulingPage:**
  - Basic shift schedule per staff member.
- **SupplierManagementPage:**
  - Supplier CRUD and linkage to products.
- **AuditLogPage:**
  - View key activities (logins, voids, refunds, critical changes).

### 4.3 Backup & Recovery
- **BackupRestorePage:**
  - Trigger local export/import.
  - Or trigger cloud backup endpoints (if backend supports this).

**Note:** These are to be prioritized based on business value after Phases 0–3 are stable.

---

## Phase 5 – Testing & Quality

**Goal:** Introduce a minimal but meaningful layer of automated and manual testing.

### 5.1 Automated Tests (Targeted)
- Unit tests for:
  - `SqliteService` (core CRUD + outbox behavior).
  - `SyncService` (push/pull logic + conflicts).
  - `AuthService` (tenant & PIN auth flows).
- High-value E2E tests (Cypress/Playwright or similar):
  - Login → POS → sale → print (mock printer or stub).
  - Sync between two simulated devices (can partly be manual at first).

### 5.2 Manual Regression Checklist
- Create a concise checklist covering:
  - Login/auth.
  - Creating/editing products and customers.
  - Full sale flow (with printing).
  - Syncing across devices.
  - Refunds and voids.
- Run the checklist before each release.

**Exit Criteria:**
- Core flows have at least basic automated coverage.
- Manual regression checklist exists and is followed.

---

## Phase 6 – Release Hardening & Rollout

**Goal:** Make the system deployable, maintainable, and safe for production.

### 6.1 Production Configuration
- Finalize environment.prod settings.
- Configure app signing and store builds (if distributing via app stores).
- Set up monitoring/logging on backend (e.g., logs, alerts, metrics).

### 6.2 Data Migration
- Design mapping from old ZPOS schema to new schema.
- Build one-shot import tool or scripts.
- Run migration on staging and validate against reports.

### 6.3 Pilot → Wider Rollout
- Start with one or two pilot locations.
- Gather real-world feedback and crash reports.
- Fix critical issues.
- Gradually increase number of terminals/locations.

---

This plan keeps **Phase 0 real-device validation** as a hard gate before investing in further backend/sync/admin/optional work, ensuring we only scale once the physical reality (printers, scanners, offline behavior) is confirmed on hardware.
