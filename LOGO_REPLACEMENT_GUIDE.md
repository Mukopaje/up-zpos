# How to Replace the ZPOS Logo

## Current Status
The app currently uses a **placeholder SVG logo** at:
```
src/assets/images/zpos-logo.svg
```

## Steps to Add Your Actual Logo

### Option 1: Using SVG (Recommended)

1. **Export your logo as SVG**
   - From your design software (Illustrator, Figma, etc.)
   - Optimize the SVG using [SVGOMG](https://jakearchibald.github.io/svgomg/)

2. **Replace the placeholder**
   ```bash
   # Navigate to assets folder
   cd src/assets/images/
   
   # Backup placeholder (optional)
   mv zpos-logo.svg zpos-logo-placeholder.svg
   
   # Copy your logo
   cp /path/to/your/logo.svg zpos-logo.svg
   ```

3. **Verify the logo**
   - Open the app in browser
   - Check all pages: License Login, PIN Login, Data Loader, Sidebar
   - Ensure logo scales properly on mobile/tablet/desktop

### Option 2: Using PNG

1. **Export your logo as PNG**
   - Recommended sizes:
     - Standard: 400x160px (2.5:1 ratio)
     - Retina: 800x320px (@2x)
     - High-res: 1200x480px (@3x)

2. **Add PNG to assets**
   ```bash
   # Add your PNG
   cp /path/to/your/logo.png src/assets/images/zpos-logo.png
   cp /path/to/your/logo@2x.png src/assets/images/zpos-logo@2x.png
   ```

3. **Update all HTML files**
   
   Find and replace in these files:
   - `src/app/pages/auth/license-login/license-login.page.html`
   - `src/app/pages/auth/pin-login/pin-login.page.html`
   - `src/app/pages/data-loader/data-loader.page.html`
   - `src/app/app.component.html`
   
   Change from:
   ```html
   <img src="assets/images/zpos-logo.svg" alt="ZPOS Logo" class="logo" />
   ```
   
   To:
   ```html
   <img 
     src="assets/images/zpos-logo.png" 
     srcset="assets/images/zpos-logo@2x.png 2x"
     alt="ZPOS Logo" 
     class="logo" 
   />
   ```

### Option 3: Copy from Old ZPOS System

If you have the old ZPOS codebase:

1. **Locate the old logo**
   ```bash
   # Search for logo in old codebase
   find /path/to/old-zpos -name "*logo*" -o -name "*ZPOS*"
   ```

2. **Common locations in old system:**
   - `www/img/logo.png`
   - `resources/icon.png`
   - `assets/logo.svg`
   - `www/assets/images/`

3. **Copy to new system**
   ```bash
   cp /path/to/old-zpos/www/img/logo.png src/assets/images/zpos-logo.png
   ```

4. **Update references** (if using PNG instead of SVG - see Option 2)

## Logo Specifications

### Recommended Dimensions
- **Width:** 200-400px
- **Height:** 60-120px  
- **Aspect Ratio:** 2.5:1 to 4:1 (wide horizontal)
- **Format:** SVG (preferred) or PNG with transparency

### Design Considerations
- **Background:** Transparent or white
- **Colors:** Should work on both light and dark backgrounds
- **Text:** Ensure readability at small sizes
- **Padding:** Include some internal padding in the logo file

### Where Logo Appears

1. **License Login Page**
   - Size: ~200px wide
   - Position: Center top
   - Background: White page

2. **PIN Login Page**
   - Size: ~200px wide
   - Position: Center top
   - Background: White page

3. **Data Loader Page**
   - Size: ~250px wide
   - Position: Center
   - Animation: Pulsing effect

4. **App Sidebar (Menu)**
   - Size: ~160px wide
   - Position: Top left
   - Background: Menu background color

5. **Mobile Screens**
   - Size: ~150px wide
   - All screens adapt responsively

## Testing Your Logo

After replacing the logo, test on:

### Desktop
1. Open app: `ionic serve`
2. Navigate to `/license-login` - Check logo displays
3. Navigate to `/pin-login` - Check logo displays
4. Navigate to `/data-loader` - Check logo + animation
5. Access POS → Check sidebar logo
6. Try different zoom levels (50%, 100%, 150%)

### Mobile
1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test different devices:
   - iPhone SE (small)
   - iPhone 14 Pro (medium)
   - iPad (tablet)
4. Check both portrait and landscape

### Responsive Breakpoints
- Mobile: < 576px
- Tablet: 576px - 992px
- Desktop: > 992px

## Troubleshooting

### Logo doesn't display
1. Check file path is correct
2. Verify file exists: `ls -la src/assets/images/`
3. Check browser console for 404 errors
4. Clear browser cache (Ctrl+Shift+R)

### Logo too large/small
Adjust CSS in respective page SCSS files:

**License/PIN Login:**
```scss
// src/app/pages/auth/*/login.page.scss
.logo-section .logo {
  max-width: 200px;  // Adjust this
  height: auto;
}
```

**Data Loader:**
```scss
// src/app/pages/data-loader/data-loader.page.scss
.logo-section .logo {
  max-width: 250px;  // Adjust this
  height: auto;
}
```

**Sidebar:**
```scss
// src/app/app.component.scss
.menu-logo {
  height: 40px;      // Adjust this
  max-width: 160px;  // Adjust this
}
```

### Logo looks blurry
- Use SVG instead of PNG (scales infinitely)
- Or provide @2x and @3x PNG versions
- Ensure source logo is high resolution

### Logo has wrong colors
- Check if logo has transparency
- Try adding background color to container
- Verify SVG colors are not hardcoded

## Advanced: Dynamic Logo

To use different logos for light/dark mode:

```html
<!-- In HTML -->
<picture>
  <source 
    srcset="assets/images/zpos-logo-dark.svg" 
    media="(prefers-color-scheme: dark)"
  />
  <img 
    src="assets/images/zpos-logo-light.svg" 
    alt="ZPOS Logo" 
    class="logo" 
  />
</picture>
```

## Examples of Good Logo Files

### SVG Example
```xml
<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg">
  <!-- Simple, clean paths -->
  <!-- No external dependencies -->
  <!-- Proper viewBox for scaling -->
</svg>
```

### File Naming
```
✅ Good:
- zpos-logo.svg
- zpos-logo.png
- logo-zpos.svg

❌ Avoid:
- Logo_Final_v3_FINAL.png
- image123.jpg
- pic.svg
```

## Quick Reference

| Aspect | SVG | PNG |
|--------|-----|-----|
| Quality | Perfect at any size | Fixed resolution |
| File Size | Usually smaller | Larger |
| Editing | Easy to edit | Requires design software |
| Browser Support | All modern browsers | All browsers |
| Transparency | Native | Via alpha channel |
| **Recommended** | ✅ Yes | If no SVG available |

## Need Help?

If you encounter issues:

1. Check the browser console for errors
2. Verify file permissions: `chmod 644 src/assets/images/zpos-logo.*`
3. Ensure file is UTF-8 encoded (for SVG)
4. Try a different format (SVG vs PNG)
5. Contact: support&#64;zpos.co.zm

---

**Last Updated:** December 2025  
**Version:** 2.0.0
