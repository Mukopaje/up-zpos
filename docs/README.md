# ZPOS Documentation

Welcome to the ZPOS (Zambia Point of Sale) system documentation.

## Documentation Structure

This documentation is organized by module for easy navigation:

### Core Modules

- **[POS](./pos/README.md)** - Point of Sale interfaces and functionality
  - [Keyboard Shortcuts](./pos/keyboard-shortcuts.md)
  - [POS Category](./pos/pos-category.md)
  - [POS Retail](./pos/pos-retail.md)
  - [POS Hospitality](./pos/pos-hospitality.md)

- **[Products](./products/README.md)** - Product management and configuration
  - [Product Variants](./products/variants.md)
  - [Product Portions](./products/portions.md)
  - [Product Bundles](./products/bundles.md)

- **[Modifiers](./modifiers/README.md)** - Order modifiers and add-ons
  - [Modifier Groups](./modifiers/modifier-groups.md)
  - [Configuration Guide](./modifiers/configuration.md)

- **[Settings](./settings/README.md)** - System configuration
  - [POS Settings](./settings/pos-settings.md)
  - [Tile Colors](./settings/tile-colors.md)
  - [Tax Configuration](./settings/tax-configuration.md)

## Quick Links

### Getting Started
- [Installation Guide](./installation.md)
- [First Time Setup](./setup.md)
- [User Roles & Permissions](./settings/permissions.md)

### Configuration Checklist
- [ ] Configure modifier groups
- [ ] Set up product variants and portions
- [ ] Define product bundles
- [ ] Configure POS tile colors
- [ ] Set tax rates
- [ ] Create user roles

### Feature Status

#### ✅ Implemented
- Keyboard input system (quantity and search buffers)
- Cross-category product search
- Category pagination
- Three-column POS layout
- Basic cart management
- Multiple payment methods
- Tax calculation (inclusive/exclusive)

#### 🚧 In Progress
- Product options modal (variants, portions, bundles)
- Modifier selection interface
- Long-press cart item actions
- Quantity input with numpad

#### 📋 Planned
- Hold/recall transactions
- Split payments
- Custom discount permissions
- Receipt customization
- Kitchen display integration

## Data Models

All data models are defined in `src/app/models/index.ts`:

- **Product** - Products with variants, portions, and bundles
- **ModifierGroup** - Reusable modifier templates
- **CartItem** - Cart items with selected options
- **Order** - Completed orders with payment info
- **Customer** - Customer accounts with credit limits

## Support & Contributing

For issues, feature requests, or contributions, please refer to:
- [Issue Tracker](../../../issues)
- [Contributing Guidelines](./CONTRIBUTING.md)
- [Code Style Guide](./CODE_STYLE.md)

---

**Version:** 1.0.0  
**Last Updated:** December 7, 2025
