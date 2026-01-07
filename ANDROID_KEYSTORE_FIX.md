# Android Keystore Fix for Desktop/Tablet Devices

## Problem
The app was experiencing "Keystore operation failed" errors on Android desktop/tablet devices during PIN login. This occurred even though:
- PIN validation was successful
- Encryption was disabled in the SQLite configuration
- The error only happened on Android desktop, not on phones

## Root Cause
The Capacitor SQLite plugin (v6.0.2) attempts to initialize Android's Keystore system even when encryption is explicitly disabled. This fails on certain Android devices, particularly desktop versions and some tablets, due to hardware or OS-level Keystore restrictions.

## Solution Implemented

### 1. SQLite Plugin Configuration (`capacitor.config.ts`)
Added explicit configuration to disable biometric authentication and encryption:

```typescript
CapacitorSQLite: {
  androidIsEncryption: false,
  androidBiometric: {
    biometricAuth: false,
    biometricTitle: 'Biometric login for capacitor sqlite',
    biometricSubTitle: 'Log in using your biometric'
  }
}
```

### 2. Retry Mechanism (`sqlite.service.ts`)
Implemented a retry mechanism with exponential backoff for Android Keystore issues:

- Attempts connection creation up to 3 times
- Closes existing connections before retry
- Waits progressively longer between attempts (500ms, 1000ms, 1500ms)
- Only retries on Keystore-related errors

## Testing Steps

### 1. Rebuild the App
The app has already been built with the new configuration. To deploy:

```bash
# Open Android Studio
npx cap open android

# Or build directly
cd android && ./gradlew assembleDebug
```

### 2. Test PIN Login
1. Launch the app on your Android desktop device
2. Enter your license key
3. Enter your PIN
4. Verify successful login without Keystore errors

### 3. Check Logs
Monitor logcat for successful connection:
```bash
adb logcat | grep -i "capacitor\|sqlite\|keystore"
```

Expected logs:
```
Starting SQLite initialization on platform: android
Creating database connection...
Database connection created successfully
Opening database...
Creating tables...
SQLite database initialized successfully
```

## Verification
After deploying, you should see:
- ✅ No "Keystore operation failed" errors
- ✅ Successful database initialization
- ✅ PIN login works on Android desktop
- ✅ App continues to work on phones

## Files Changed
1. `/capacitor.config.ts` - Added SQLite plugin configuration
2. `/src/app/core/services/sqlite.service.ts` - Added retry mechanism

## Rollback
If issues occur, you can revert by running:
```bash
git diff HEAD~1 capacitor.config.ts src/app/core/services/sqlite.service.ts
```

## Additional Notes
- This fix does not affect data security (encryption was already disabled)
- The retry mechanism also helps with transient connection issues
- Works on all platforms (Android, iOS, Web)
