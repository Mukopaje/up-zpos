# Printer Testing Guide

## Overview
This guide provides instructions for testing the ZPOS print service with actual Bluetooth thermal printers.

## Prerequisites

### Hardware
- **Bluetooth Thermal Printer** (58mm or 80mm)
  - Recommended models:
    - Datecs DPP-250/350/450
    - Epson TM-P20/P60/P80
    - Star SM-L200/L300
    - Bixolon SPP-R200/R300/R400
    - Any ESC/POS compatible Bluetooth printer

- **Mobile Device**
  - Android 5.0+ or iOS 13.0+
  - Bluetooth 4.0+ (BLE support)
  - Ionic app installed via Capacitor

### Software
- Printer charged and turned on
- Printer in pairing mode (if first connection)
- Bluetooth enabled on mobile device
- App permissions granted (Bluetooth, Location on Android)

## Testing Steps

### 1. Build and Deploy App

```bash
# Build for Android
ionic capacitor build android
# Then open Android Studio and run on device

# Or build for iOS
ionic capacitor build ios
# Then open Xcode and run on device
```

**Note:** Bluetooth functionality requires a real device - it won't work in browser or emulator.

### 2. Enable Bluetooth Permissions

**Android:**
1. Go to Settings > Apps > ZPOS
2. Permissions > Allow Bluetooth
3. Permissions > Allow Location (required for BLE scanning)

**iOS:**
1. Go to Settings > ZPOS
2. Enable Bluetooth permission

### 3. Prepare Printer

1. **Turn on printer** - Press and hold power button
2. **Check battery** - Ensure sufficient charge
3. **Enable pairing mode** - Usually:
   - Turn off printer
   - Hold power button for 5-10 seconds
   - LED should blink rapidly (blue/red)
4. **Load paper** - Insert thermal paper roll
5. **Position printer** - Within 10 meters of device

### 4. Scan for Printer

1. Open ZPOS app
2. Navigate to **Printer Settings**
3. Tap **"Scan for Printers"**
4. Grant Bluetooth permissions if prompted
5. Wait 5 seconds for scan to complete
6. Your printer should appear in the list

**Expected Results:**
- ✅ Printer name appears (e.g., "Datecs DPP-350")
- ✅ Model detected automatically
- ✅ Device ID shown

**Troubleshooting:**
- ❌ No printers found:
  - Check printer is on and in pairing mode
  - Check Bluetooth is enabled
  - Move device closer to printer
  - Try turning printer off/on
  - Check battery level

### 5. Connect to Printer

1. Tap **"Connect"** next to your printer
2. Wait for connection (may take 5-10 seconds)
3. Connection may retry up to 3 times automatically

**Expected Results:**
- ✅ "Connected to [Printer Name]" toast message
- ✅ Green "Connected" status badge
- ✅ "Test Print" button becomes enabled
- ✅ Printer saved as default

**Troubleshooting:**
- ❌ Connection timeout:
  - Printer may be paired to another device - unpair first
  - Try turning printer off/on
  - Try "Forget" printer in phone Bluetooth settings, then re-scan
- ❌ Connection failed:
  - Check printer battery
  - Ensure printer is not in sleep mode
  - Try retry button in error dialog

### 6. Configure Settings

1. **Business Information:**
   - Enter business name
   - Enter address
   - Enter phone number
   - Enter tax number (TPIN)
   - Add receipt footer message

2. **Receipt Settings:**
   - Select paper width (58mm or 80mm)
   - Choose font size (small/normal/large)
   - Enable/disable auto-cut
   - Enable/disable cash drawer
   - Enable/disable logo

3. Tap **checkmark icon** (top right) to save

**Expected Results:**
- ✅ "Settings saved successfully" toast
- ✅ Settings persist after app restart

### 7. Test Print

1. Ensure printer is connected
2. Tap **"Print Test Receipt"**
3. Wait for printing (5-30 seconds depending on printer)

**Expected Results:**
- ✅ Printer makes noise/starts printing
- ✅ Receipt prints with:
  - Business name (large, centered)
  - Business details (address, phone, tax#)
  - Date and time
  - "Invoice: #TEST-001"
  - Cashier name
  - Test items (2 items)
  - Subtotal, tax, total
  - Payment (Cash: 25.00)
  - Change (2.11)
  - Footer message
- ✅ Paper auto-cuts (if enabled)
- ✅ "Test print sent successfully" dialog

**Troubleshooting:**
- ❌ Print timeout:
  - Check printer has paper
  - Check printer is not jammed
  - Try smaller font size
  - Check printer battery
- ❌ Garbled output:
  - Wrong paper width setting - change to match printer
  - Try different font size
  - Printer may not support ESC/POS standard
- ❌ Partial print:
  - Low battery - charge printer
  - Bluetooth signal weak - move closer
  - Paper jam - clear and retry

### 8. Real Receipt Test

1. Navigate to POS/Checkout
2. Add items to cart
3. Complete a sale
4. Receipt should auto-print (if autoPrint enabled)

**Expected Results:**
- ✅ Receipt prints automatically after successful payment
- ✅ Correct items, prices, totals
- ✅ Payment method shown
- ✅ Change calculated correctly
- ✅ Multiple copies print if configured

## Common Issues and Solutions

### Bluetooth Connection Issues

**Problem:** "Bluetooth permission denied"
- **Solution:** Go to device settings and grant Bluetooth permissions

**Problem:** "Bluetooth is disabled"
- **Solution:** Enable Bluetooth in device settings

**Problem:** "Printer not found"
- **Solution:** 
  - Ensure printer is on and in pairing mode
  - Move within 10 meters
  - Check printer battery
  - Try restarting printer

**Problem:** "Connection timeout"
- **Solution:**
  - Unpair printer from device Bluetooth settings
  - Turn printer off, wait 10 seconds, turn on
  - Re-scan and connect

### Printing Issues

**Problem:** "Print timeout"
- **Solution:**
  - Check printer has paper
  - Check printer battery level
  - Check Bluetooth connection strength
  - Try test print with smaller data

**Problem:** "Garbled characters"
- **Solution:**
  - Verify paper width setting matches printer (58mm or 80mm)
  - Try different font size
  - Some printers may need custom character encoding

**Problem:** "Paper doesn't cut"
- **Solution:**
  - Check "Auto Cut Paper" is enabled
  - Check printer has auto-cutter (not all models do)
  - Manual cut may be required

**Problem:** "Partial receipt prints"
- **Solution:**
  - Charge printer battery
  - Check paper roll is properly loaded
  - Move device closer to printer
  - Reduce font size or content

### Performance Issues

**Problem:** "Slow printing"
- **Solution:**
  - Normal for Bluetooth (slower than USB/Network)
  - Typical speeds: 50-100mm/second
  - Large receipts (many items) take longer
  - Consider reducing font size

**Problem:** "Connection drops during print"
- **Solution:**
  - Keep device within 5 meters during printing
  - Ensure printer battery is sufficient
  - Avoid obstacles between device and printer
  - Retry logic will attempt automatic reconnection

## Performance Expectations

### Connection Times
- **Initial scan:** 5 seconds
- **First connection:** 5-15 seconds
- **Subsequent connections:** 3-8 seconds
- **Auto-reconnect:** 5-10 seconds

### Print Times (typical 58mm printer)
- **Short receipt** (1-5 items): 3-8 seconds
- **Medium receipt** (6-15 items): 8-15 seconds
- **Long receipt** (16+ items): 15-30 seconds
- **Test receipt:** 5-10 seconds

### Bluetooth Range
- **Optimal:** 0-5 meters (clear line of sight)
- **Good:** 5-10 meters (may have obstacles)
- **Poor:** 10+ meters (connection may drop)

## Validation Checklist

Use this checklist to validate printer functionality:

### Basic Functionality
- [ ] Scan discovers printer
- [ ] Connect succeeds
- [ ] Test print works
- [ ] Settings save correctly
- [ ] Disconnect works

### Receipt Content
- [ ] Business name prints correctly
- [ ] Business details print correctly
- [ ] Date/time accurate
- [ ] Items print with correct quantities
- [ ] Prices calculate correctly
- [ ] Tax calculated correctly
- [ ] Total matches expected
- [ ] Payment method shown
- [ ] Change calculated correctly
- [ ] Footer message prints

### Format & Alignment
- [ ] Text is centered where expected
- [ ] Text is aligned left where expected
- [ ] Lines are properly formatted
- [ ] Bold text appears bolder
- [ ] Font sizes differ visibly
- [ ] Horizontal lines print correctly
- [ ] No garbled characters

### Hardware Features
- [ ] Paper auto-cuts (if supported)
- [ ] Cash drawer opens (if connected & enabled)
- [ ] Multiple copies print (if configured)
- [ ] Paper feed is correct spacing

### Error Handling
- [ ] Permission errors show helpful message
- [ ] Connection failures show retry option
- [ ] Print failures show error dialog
- [ ] Disconnect works even with errors
- [ ] Auto-reconnect works after disconnect

### Edge Cases
- [ ] Works with low battery
- [ ] Works at maximum range
- [ ] Works with multiple items (20+)
- [ ] Works after app restart
- [ ] Works after phone restart
- [ ] Works with different paper widths

## Printer-Specific Notes

### Datecs Printers
- Usually named "Datecs DPP-XXX"
- Reliable ESC/POS support
- Good battery life
- Auto-cutter usually works well

### Epson Printers
- Named "TM-PXXX" or "Epson"
- Excellent ESC/POS compatibility
- Fast printing speed
- May need specific characteristic UUID

### Star Printers
- Named "Star" or "SM-LXXX"
- May use Star Line Mode instead of ESC/POS
- Check printer documentation
- May need custom commands

### Generic Printers
- Named "Bluetooth Printer" or "POS-XXXX"
- Variable ESC/POS support
- Test thoroughly
- May need characteristic UUID adjustments

## Next Steps After Testing

Once testing is complete:

1. **Document findings:**
   - Which printer models work
   - Any required adjustments
   - Optimal settings per model

2. **Update code if needed:**
   - Add printer-specific configurations
   - Adjust characteristic UUIDs
   - Fine-tune retry logic
   - Optimize chunk sizes

3. **User documentation:**
   - Create user manual
   - Include printer recommendations
   - Setup instructions
   - Troubleshooting guide

4. **Production deployment:**
   - Test on multiple devices
   - Test on different Android/iOS versions
   - Performance testing with high volume
   - Battery life testing

## Support

For issues during testing:
1. Check console logs for detailed errors
2. Enable debug mode for verbose logging
3. Test with multiple printer models if possible
4. Document all issues with screenshots/videos
5. Share findings with development team

## References

- [ESC/POS Command Reference](https://reference.epson-biz.com/modules/ref_escpos/index.php)
- [Capacitor Bluetooth LE Plugin](https://github.com/capacitor-community/bluetooth-le)
- [Ionic Capacitor Documentation](https://capacitorjs.com/docs)
