# ZPOS Registration Flow

## Overview
New businesses can now self-register and get started with ZPOS immediately. The system automatically creates the first admin user with a PIN for quick login.

---

## Registration Process

### Step 1: Navigate to Registration
- From the login page, click **"Register Your Business"**
- Or go directly to `/register`

### Step 2: Fill Registration Form

**Business Information:**
- Business Name (required)
- Email Address (required)
- Phone Number (optional)

**Admin User:**
- First Name (required)
- Last Name (required)
- Admin PIN - 4-6 digits (required)
- Confirm PIN (required)

### Step 3: Account Creation
- System validates all inputs
- Creates tenant account in backend
- Generates unique license key (format: XXXX-XXXX-XXXX-XXXX)
- Creates admin user with specified PIN
- Automatically logs in the admin user

### Step 4: Success
After successful registration, user sees:
- ✅ License Key (save this!)
- ✅ Admin PIN (for future logins)
- ✅ Automatic login to data loader

---

## Login After Registration

### First Login (Same Device)
1. System remembers the license key
2. Go directly to PIN entry
3. Enter admin PIN
4. Access POS system

### Login From Another Device
1. Enter license key
2. Click "Validate License"
3. Enter admin PIN
4. Access POS system

---

## Admin Capabilities

After registration, the admin can:

1. **Create Additional Users**
   - Go to Settings → Users
   - Add cashiers, managers, waiters, etc.
   - Assign PINs for each user

2. **Change Admin PIN**
   - Go to Settings → Users
   - Select admin user
   - Update PIN

3. **Configure Business Settings**
   - Business type (restaurant, retail, etc.)
   - Tax settings
   - Receipt customization
   - Printer setup

4. **Set Up Products**
   - Add product catalog
   - Set prices
   - Configure categories

5. **Manage Roles & Permissions**
   - Define user roles
   - Set access permissions
   - Control terminal access

---

## Backend API Flow

```
POST /auth/register
{
  "businessName": "Joe's Coffee Shop",
  "ownerEmail": "joe@coffee.com",
  "ownerPhone": "+1234567890",
  "adminPin": "1234",
  "adminFirstName": "Joe",
  "adminLastName": "Smith"
}

Response:
{
  "licenseKey": "ABCD-1234-EFGH-5678",
  "tenant": {
    "id": "tenant-uuid",
    "businessName": "Joe's Coffee Shop"
  },
  "access_token": "jwt-token...",
  "user": {
    "id": "user-uuid",
    "firstName": "Joe",
    "lastName": "Smith",
    "email": "joe@coffee.com",
    "role": "admin"
  }
}
```

---

## Security Features

### PIN Requirements
- Must be 4-6 digits
- Numeric only
- Hashed with bcrypt before storage
- Can be changed after login

### License Key
- Unique per tenant
- Never expires (1 year default)
- Required for all logins
- Tied to business email

### Multi-Tenant Isolation
- Complete data separation
- Tenant-specific users
- Cross-tenant access prevented
- JWT tokens include tenantId

---

## Validation Rules

### Email
- Valid email format required
- Used as business owner identifier
- Linked to tenant account

### PIN
- Length: 4-6 digits
- Format: Numbers only
- Must match confirmation
- Stored as bcrypt hash

### Business Name
- Required field
- Used for tenant identification
- Displayed in UI after login

---

## User Experience

### Success Indicators
✅ Clear success message with license key  
✅ PIN displayed for reference  
✅ Warning to save license key  
✅ Automatic login after registration  
✅ Immediate access to POS system  

### Error Handling
❌ Email format validation  
❌ PIN mismatch detection  
❌ PIN length enforcement  
❌ Backend error messages  
❌ Network failure handling  

---

## Next Steps After Registration

1. **Complete Profile**
   - Add business logo
   - Set business hours
   - Configure tax rates

2. **Set Up Products**
   - Import product catalog
   - Create categories
   - Set pricing

3. **Add Team Members**
   - Create user accounts
   - Assign roles
   - Distribute PINs

4. **Configure Hardware**
   - Pair Bluetooth printer
   - Set up barcode scanner
   - Connect cash drawer

5. **Test System**
   - Process test transactions
   - Print test receipts
   - Train staff

---

## Troubleshooting

### "Registration failed"
- Check internet connection
- Verify email format
- Ensure backend is running
- Check backend logs

### "PINs do not match"
- Re-enter both fields carefully
- Check for typos
- Use only numbers

### "Invalid email address"
- Use proper format: user@domain.com
- No spaces allowed
- Check for typos

### Lost License Key
- Contact support with business email
- Admin can retrieve from backend
- Check success alert screenshot

---

## Files Modified

### New Files Created
1. `src/app/pages/auth/register/register.page.ts` - Registration component
2. `src/app/pages/auth/register/register.page.html` - Registration template
3. `src/app/pages/auth/register/register.page.scss` - Registration styles

### Files Updated
1. `src/app/app.routes.ts` - Added /register route
2. `src/app/pages/auth/login/login.page.html` - Added "Register" link
3. `src/app/pages/auth/login/login.page.scss` - Added register link styles

---

## Testing

### Test Registration Flow
```bash
# Start backend
cd zpos-backend
npm run start:dev

# Start frontend
cd up-zpos
npm start

# Navigate to http://localhost:8100/register
# Fill form with test data
# Verify license key is shown
# Verify auto-login works
```

### Test Data
```
Business Name: Test Coffee Shop
Email: test@example.com
Phone: +1234567890
Admin First Name: Admin
Admin Last Name: User
PIN: 1234
Confirm PIN: 1234
```

---

*Last Updated: December 13, 2025*
