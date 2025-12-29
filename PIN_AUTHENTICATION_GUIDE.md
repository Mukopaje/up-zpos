# PIN Authentication System

## Overview

ZPOS now uses a **two-tier authentication system**:

1. **License Authentication** (Business Owner/Admin) - Email & Password
2. **User Authentication** (POS Users) - PIN

This ensures secure cloud access for administrators while providing quick, efficient PIN-based login for daily POS operations.

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────┐
│  1. License Login (One-Time Setup)                  │
│  Business Owner authenticates with:                 │
│  - Email                                            │
│  - Password                                         │
│  → Activates POS license on device                 │
│  → Enables cloud sync                               │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  2. PIN Login (Daily Use)                           │
│  POS Users authenticate with:                       │
│  - 4-6 digit PIN                                    │
│  → Quick access to POS                              │
│  → No need for email/password                       │
└─────────────────────────────────────────────────────┘
```

---

## Components

### 1. License Login Page
**Path:** `/license-login`

**Purpose:** 
- One-time activation of POS license on device
- Authenticates business owner with cloud provider
- Syncs business data and settings

**Fields:**
- Business Email
- Password

**Process:**
1. User enters business credentials
2. System validates with cloud API (or mock for development)
3. Creates `BusinessLicense` document in local database
4. Redirects to PIN Login

**When to use:**
- First-time device setup
- After license deactivation
- Device reset/reinstall

---

### 2. PIN Login Page
**Path:** `/pin-login`

**Purpose:**
- Daily user authentication for POS access
- Fast, secure login with numeric PIN
- User identification for permissions and tracking

**Features:**
- Numeric keypad (0-9)
- 4-6 digit PIN support
- Clear and backspace buttons
- Shows business name
- Option to logout license

**Process:**
1. User enters PIN using numeric keypad
2. System hashes PIN and searches for matching user
3. Validates user is active
4. Loads user role and permissions
5. Redirects to POS interface

**Security:**
- PINs are hashed before storage
- Users see dots (••••) while typing
- Failed attempts logged
- Session expires after 12 hours

---

## User Model Updates

### User Interface Changes

```typescript
export interface User {
  // ... other fields
  pin: string;  // Required - HASHED PIN (4-6 digits)
  // OLD: pin?: string; (was optional, stored plain)
}
```

### New: BusinessLicense Interface

```typescript
export interface BusinessLicense {
  _id: string;
  type: 'license';
  businessEmail: string;      // Owner/admin email
  passwordHash: string;        // Hashed password
  businessName: string;
  licenseKey: string;
  activatedAt: number;
  expiresAt: number;
  deviceId: string;
  status: 'active' | 'expired' | 'suspended';
  maxUsers: number;
  features: string[];
  lastSync?: number;
}
```

---

## AuthService New Methods

### License Management

```typescript
// Check if device has active license
async hasActiveLicense(): Promise<boolean>

// Activate license with business credentials
async activateLicense(email: string, password: string): Promise<boolean>

// Deactivate license (requires confirmation)
async logoutLicense(): Promise<void>

// Get business settings
async getBusinessSettings(): Promise<{ businessName: string } | null>
```

### PIN Authentication

```typescript
// Login with PIN (main method for POS users)
async loginWithPin(pin: string): Promise<boolean>

// Internal: Hash PIN for storage (use bcrypt in production)
private async hashPin(pin: string): Promise<string>

// Internal: Verify PIN against hash
private async verifyPin(pin: string, hash: string): Promise<boolean>
```

---

## Security Features

### PIN Security
- **Hashing:** All PINs are hashed before storage using `hashPin()` method
- **Production Note:** Replace simple hash with bcrypt or similar
- **Length:** Enforced 4-6 digits
- **Display:** Show dots (••••) instead of actual PIN
- **Validation:** Check active status before allowing login

### License Security
- **Password Hashing:** Business passwords hashed before storage
- **Expiration:** Licenses have expiration dates
- **Device Binding:** License tied to specific device ID
- **Cloud Validation:** (Future) Real-time validation with cloud API

### Session Management
- **License Login:** No expiration (persistent until deactivated)
- **PIN Login:** 12-hour session
- **Token Refresh:** Automatic token generation per login

---

## User Management

### Creating Users with PINs

When creating a user in the Users Management page:

1. Admin enters user details
2. Admin sets 4-6 digit PIN
3. System validates PIN format
4. PIN is hashed before saving
5. User document saved with hashed PIN

```typescript
// In users.page.ts
private async saveUser(userData: any, roleId: string, allowedTerminals: string[]) {
  const hashedPin = await this.hashPin(userData.pin);
  await this.usersService.createUser({
    // ... other fields
    pin: hashedPin,  // Stored as hash
  });
}
```

### Updating PINs

To change a user's PIN:

1. Navigate to Users Management
2. Edit user
3. Click "Change PIN"
4. Enter new 4-6 digit PIN
5. Confirm change
6. New PIN is hashed and saved

---

## Navigation Guards

### Updated AuthGuard

```typescript
export const AuthGuard = async () => {
  // 1. Check license first
  if (!hasLicense) {
    router.navigate(['/license-login']);
    return false;
  }

  // 2. Check user authentication
  if (!isAuthenticated) {
    router.navigate(['/pin-login']);
    return false;
  }

  return true;
};
```

---

## Route Configuration

```typescript
routes: [
  { path: '', redirectTo: 'license-login' },
  
  // Public routes
  { path: 'license-login', component: LicenseLoginPage },
  { path: 'pin-login', component: PinLoginPage },
  
  // Protected routes (require AuthGuard)
  { path: 'data-loader', canActivate: [AuthGuard] },
  { path: 'pos-*', canActivate: [AuthGuard] },
  // ... other protected routes
]
```

---

## Logo Integration

### Logo Location
`src/assets/images/zpos-logo.svg`

### Usage in Templates

```html
<!-- Login pages -->
<img src="assets/images/zpos-logo.svg" alt="ZPOS Logo" class="logo" />

<!-- App sidebar -->
<img src="assets/images/zpos-logo.svg" alt="ZPOS" class="menu-logo" />

<!-- Data loader -->
<img src="assets/images/zpos-logo.svg" alt="ZPOS Logo" class="logo" />
```

### Logo Placeholder
Current logo is SVG placeholder. Replace with actual ZPOS logo:
1. Export logo as SVG or PNG
2. Save to `src/assets/images/zpos-logo.svg` (or .png)
3. Update image paths if using PNG

---

## Development vs Production

### Development Mode
- Simple hash function: `hashed_${pin}`
- Mock license activation (no API call)
- No real password validation
- Auto-accept demo credentials

### Production Requirements
1. **Install bcrypt:** `npm install bcryptjs`
2. **Update hashPin:**
   ```typescript
   import * as bcrypt from 'bcryptjs';
   
   private async hashPin(pin: string): Promise<string> {
     return await bcrypt.hash(pin, 10);
   }
   
   private async verifyPin(pin: string, hash: string): Promise<boolean> {
     return await bcrypt.compare(pin, hash);
   }
   ```
3. **Implement cloud API calls** in `activateLicense()`
4. **Add real password validation** for business accounts
5. **Enable HTTPS** for all communications
6. **Implement rate limiting** for failed PIN attempts
7. **Add audit logging** for all authentication events

---

## User Experience

### First Time Setup (Business Owner)
1. Open app → Redirected to `/license-login`
2. Enter business email and password
3. System activates license
4. Redirected to `/pin-login`
5. Select user (or have admin create users first)
6. Enter PIN to access POS

### Daily Use (POS Users)
1. Open app → Redirected to `/pin-login`
2. See business name
3. Enter 4-6 digit PIN using numeric keypad
4. Access granted → POS interface loads
5. Session valid for 12 hours

### Admin Tasks
- **Deactivate License:** Click logout icon in PIN login header
- **Create Users:** Settings → Users → Add User → Set PIN
- **Change PINs:** Settings → Users → Edit User → Change PIN

---

## Permissions & Roles

PIN authentication integrates with the existing RBAC system:

- **PIN identifies user** → User has role → Role has permissions
- **Cashier PIN** → Limited access (POS only)
- **Manager PIN** → Extended access (reports, discounts)
- **Admin PIN** → Full access (all modules)

Example:
```
PIN: 1234
  ↓
User: John Doe
  ↓
Role: Cashier
  ↓
Permissions: [pos.view, pos.create, customers.view]
```

---

## Troubleshooting

### "Invalid PIN"
- Check PIN is 4-6 digits
- Verify user is active
- Check user exists in database
- Ensure PIN was hashed when user created

### "License not activated"
- Navigate to `/license-login`
- Enter valid business credentials
- Check internet connection (for cloud validation)
- Verify license not expired

### Can't logout license
- Confirmation required (prevents accidental logout)
- Only accessible from PIN login page
- Requires admin privileges in production

---

## Migration from Old System

If migrating from old ZPOS:

1. **Export users** from old system
2. **Map to new User interface** with hashed PINs
3. **Create BusinessLicense** document from old business settings
4. **Import into new database**
5. **Test PIN login** for each user
6. **Verify permissions** match old system

---

## Future Enhancements

- [ ] Biometric authentication (fingerprint/face)
- [ ] PIN complexity requirements
- [ ] PIN expiration/rotation
- [ ] Multi-factor authentication for admin
- [ ] Cloud-based user sync
- [ ] Offline mode with cached credentials
- [ ] PIN recovery via admin approval
- [ ] Audit trail for all logins
- [ ] Failed attempt lockout
- [ ] Remote license deactivation

---

## Support

For issues with:
- **License activation:** Contact support@zpos.co.zm
- **PIN reset:** Contact your business administrator
- **Technical problems:** Check logs in browser console

---

**Version:** 2.0.0  
**Last Updated:** December 2025  
**Author:** ZPOS Development Team
