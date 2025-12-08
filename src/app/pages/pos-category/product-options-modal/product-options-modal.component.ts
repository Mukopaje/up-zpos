import { Component, OnInit, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { Product, ProductVariant, ProductPortion, ProductBundle, ModifierGroup, ModifierOption, OrderModifier } from '@app/models';

@Component({
  selector: 'app-product-options-modal',
  templateUrl: './product-options-modal.component.html',
  styleUrls: ['./product-options-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ProductOptionsModalComponent implements OnInit {
  @Input() product!: Product;
  @Input() initialQuantity: number = 1;
  @Input() modifierGroups: ModifierGroup[] = [];

  // Expose Math for template
  Math = Math;

  selectedTab = signal<string>('variants');
  quantity = signal<number>(1);
  
  // Selected options
  selectedVariant = signal<ProductVariant | undefined>(undefined);
  selectedPortion = signal<ProductPortion | undefined>(undefined);
  selectedBundle = signal<ProductBundle | undefined>(undefined);
  selectedModifiers = signal<OrderModifier[]>([]);

  // Available tabs
  availableTabs = computed(() => {
    const tabs: string[] = [];
    if (this.product.variants && this.product.variants.length > 0) tabs.push('variants');
    if (this.product.portions && this.product.portions.length > 0) tabs.push('portions');
    if (this.product.bundles && this.product.bundles.length > 0) tabs.push('bundles');
    if (this.modifierGroups.length > 0) tabs.push('modifiers');
    return tabs;
  });

  // Calculated price
  calculatedPrice = computed(() => {
    let price = this.product.price;
    
    // Apply variant modifier
    const variant = this.selectedVariant();
    if (variant) {
      price += variant.priceModifier;
    }
    
    // Apply portion multiplier
    const portion = this.selectedPortion();
    if (portion) {
      price *= portion.priceMultiplier;
    }
    
    // Apply bundle multiplier
    const bundle = this.selectedBundle();
    if (bundle) {
      price *= bundle.priceMultiplier;
    }
    
    // Add modifiers
    const modifiers = this.selectedModifiers();
    const modifiersTotal = modifiers.reduce((sum, mod) => sum + mod.price, 0);
    price += modifiersTotal;
    
    return price;
  });

  // Total price (price × quantity)
  totalPrice = computed(() => {
    return this.calculatedPrice() * this.quantity();
  });

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    this.quantity.set(this.initialQuantity);
    
    // Auto-select first tab if available
    const tabs = this.availableTabs();
    if (tabs.length > 0) {
      this.selectedTab.set(tabs[0]);
    }
    
    // Auto-select default options
    this.selectDefaults();
  }

  selectDefaults() {
    // Select first active variant
    if (this.product.variants && this.product.variants.length > 0) {
      const firstActive = this.product.variants.find(v => v.active);
      if (firstActive) {
        this.selectedVariant.set(firstActive);
      }
    }
    
    // Select first active portion
    if (this.product.portions && this.product.portions.length > 0) {
      const firstActive = this.product.portions.find(p => p.active);
      if (firstActive) {
        this.selectedPortion.set(firstActive);
      }
    }
    
    // Select first active bundle
    if (this.product.bundles && this.product.bundles.length > 0) {
      const firstActive = this.product.bundles.find(b => b.active);
      if (firstActive) {
        this.selectedBundle.set(firstActive);
      }
    }
  }

  selectVariant(variant: ProductVariant) {
    this.selectedVariant.set(variant);
  }

  selectPortion(portion: ProductPortion) {
    this.selectedPortion.set(portion);
  }

  selectBundle(bundle: ProductBundle) {
    this.selectedBundle.set(bundle);
  }

  toggleModifier(group: ModifierGroup, option: ModifierOption) {
    const current = this.selectedModifiers();
    const existingIndex = current.findIndex(m => m.optionId === option.id);
    
    if (existingIndex >= 0) {
      // Remove modifier
      const updated = current.filter(m => m.optionId !== option.id);
      this.selectedModifiers.set(updated);
    } else {
      // Add modifier
      if (group.multiSelect) {
        // Multi-select: just add
        const newModifier: OrderModifier = {
          optionId: option.id,
          optionName: option.name,
          price: option.price,
          groupId: group._id,
          groupName: group.name
        };
        this.selectedModifiers.set([...current, newModifier]);
      } else {
        // Single-select: remove others from same group first
        const filtered = current.filter(m => m.groupId !== group._id);
        const newModifier: OrderModifier = {
          optionId: option.id,
          optionName: option.name,
          price: option.price,
          groupId: group._id,
          groupName: group.name
        };
        this.selectedModifiers.set([...filtered, newModifier]);
      }
    }
  }

  isModifierSelected(option: ModifierOption): boolean {
    return this.selectedModifiers().some(m => m.optionId === option.id);
  }

  incrementQuantity() {
    this.quantity.update(q => q + 1);
  }

  decrementQuantity() {
    if (this.quantity() > 1) {
      this.quantity.update(q => q - 1);
    }
  }

  canConfirm(): boolean {
    // Check if all required modifier groups have selections
    for (const group of this.modifierGroups) {
      if (group.required) {
        const hasSelection = this.selectedModifiers().some(m => m.groupId === group._id);
        if (!hasSelection) {
          return false;
        }
      }
    }
    return true;
  }

  confirm() {
    if (!this.canConfirm()) {
      alert('Please select all required options');
      return;
    }

    this.modalCtrl.dismiss({
      confirmed: true,
      quantity: this.quantity(),
      selectedVariant: this.selectedVariant(),
      selectedPortion: this.selectedPortion(),
      selectedBundle: this.selectedBundle(),
      modifiers: this.selectedModifiers(),
      calculatedPrice: this.calculatedPrice(),
      totalPrice: this.totalPrice()
    });
  }

  cancel() {
    this.modalCtrl.dismiss({
      confirmed: false
    });
  }
}
