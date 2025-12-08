import { Component, OnInit, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, AlertController } from '@ionic/angular';
import { Product, ProductVariant, ProductPortion, ProductBundle, Category } from '@app/models';

@Component({
  selector: 'app-product-form-modal',
  templateUrl: './product-form-modal.component.html',
  styleUrls: ['./product-form-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ProductFormModalComponent implements OnInit {
  @Input() product?: Product;
  @Input() categories: Category[] = [];
  @Input() mode: 'create' | 'edit' = 'create';

  selectedTab = signal<string>('basic');
  
  // Basic product fields
  name = signal<string>('');
  barcode = signal<string>('');
  price = signal<number>(0);
  cost = signal<number>(0);
  category = signal<string>('');
  unit = signal<string>('each');
  quantity = signal<number>(0);
  active = signal<boolean>(true);
  taxable = signal<boolean>(true);
  description = signal<string>('');
  tags = signal<string>('');
  
  // Product options
  variants = signal<ProductVariant[]>([]);
  portions = signal<ProductPortion[]>([]);
  bundles = signal<ProductBundle[]>([]);
  
  constructor(
    private modalCtrl: ModalController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    if (this.product) {
      this.loadProduct(this.product);
    }
  }

  loadProduct(product: Product) {
    this.name.set(product.name);
    this.barcode.set(product.barcode);
    this.price.set(product.price);
    this.cost.set(product.cost || 0);
    this.category.set(product.category);
    this.unit.set(product.unit);
    this.quantity.set(product.quantity);
    this.active.set(product.active);
    this.taxable.set(product.taxable);
    this.description.set(product.description || '');
    this.tags.set(product.tags?.join(', ') || '');
    
    if (product.variants) {
      this.variants.set([...product.variants]);
    }
    if (product.portions) {
      this.portions.set([...product.portions]);
    }
    if (product.bundles) {
      this.bundles.set([...product.bundles]);
    }
  }

  async addVariant() {
    const alert = await this.alertCtrl.create({
      header: 'Add Variant',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Variant name (e.g., Large)'
        },
        {
          name: 'sku',
          type: 'text',
          placeholder: 'SKU (optional)'
        },
        {
          name: 'priceModifier',
          type: 'number',
          placeholder: 'Price modifier (+/-)',
          value: '0'
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: (data) => {
            if (!data.name) {
              return false;
            }
            const newVariant: ProductVariant = {
              id: `var-${Date.now()}`,
              name: data.name,
              sku: data.sku || undefined,
              priceModifier: parseFloat(data.priceModifier) || 0,
              active: true
            };
            this.variants.set([...this.variants(), newVariant]);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async editVariant(variant: ProductVariant, index: number) {
    const alert = await this.alertCtrl.create({
      header: 'Edit Variant',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Variant name',
          value: variant.name
        },
        {
          name: 'sku',
          type: 'text',
          placeholder: 'SKU (optional)',
          value: variant.sku || ''
        },
        {
          name: 'priceModifier',
          type: 'number',
          placeholder: 'Price modifier',
          value: variant.priceModifier.toString()
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (data) => {
            const updated = [...this.variants()];
            updated[index] = {
              ...variant,
              name: data.name,
              sku: data.sku || undefined,
              priceModifier: parseFloat(data.priceModifier) || 0
            };
            this.variants.set(updated);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  deleteVariant(index: number) {
    const updated = this.variants().filter((_, i) => i !== index);
    this.variants.set(updated);
  }

  toggleVariantActive(index: number) {
    const updated = [...this.variants()];
    updated[index] = { ...updated[index], active: !updated[index].active };
    this.variants.set(updated);
  }

  async addPortion() {
    const alert = await this.alertCtrl.create({
      header: 'Add Portion',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Portion name (e.g., Glass)'
        },
        {
          name: 'size',
          type: 'text',
          placeholder: 'Size (e.g., 250ml)'
        },
        {
          name: 'priceMultiplier',
          type: 'number',
          placeholder: 'Price multiplier',
          value: '1.0'
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: (data) => {
            if (!data.name || !data.size) {
              return false;
            }
            const newPortion: ProductPortion = {
              id: `por-${Date.now()}`,
              name: data.name,
              size: data.size,
              priceMultiplier: parseFloat(data.priceMultiplier) || 1.0,
              active: true
            };
            this.portions.set([...this.portions(), newPortion]);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async editPortion(portion: ProductPortion, index: number) {
    const alert = await this.alertCtrl.create({
      header: 'Edit Portion',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Portion name',
          value: portion.name
        },
        {
          name: 'size',
          type: 'text',
          placeholder: 'Size',
          value: portion.size
        },
        {
          name: 'priceMultiplier',
          type: 'number',
          placeholder: 'Price multiplier',
          value: portion.priceMultiplier.toString()
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (data) => {
            const updated = [...this.portions()];
            updated[index] = {
              ...portion,
              name: data.name,
              size: data.size,
              priceMultiplier: parseFloat(data.priceMultiplier) || 1.0
            };
            this.portions.set(updated);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  deletePortion(index: number) {
    const updated = this.portions().filter((_, i) => i !== index);
    this.portions.set(updated);
  }

  togglePortionActive(index: number) {
    const updated = [...this.portions()];
    updated[index] = { ...updated[index], active: !updated[index].active };
    this.portions.set(updated);
  }

  async addBundle() {
    const alert = await this.alertCtrl.create({
      header: 'Add Bundle',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Bundle name (e.g., 6-Pack)'
        },
        {
          name: 'quantity',
          type: 'number',
          placeholder: 'Quantity',
          value: '1'
        },
        {
          name: 'priceMultiplier',
          type: 'number',
          placeholder: 'Price multiplier',
          value: '1.0'
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: (data) => {
            if (!data.name) {
              return false;
            }
            const newBundle: ProductBundle = {
              id: `bun-${Date.now()}`,
              name: data.name,
              quantity: parseInt(data.quantity) || 1,
              priceMultiplier: parseFloat(data.priceMultiplier) || 1.0,
              active: true
            };
            this.bundles.set([...this.bundles(), newBundle]);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async editBundle(bundle: ProductBundle, index: number) {
    const alert = await this.alertCtrl.create({
      header: 'Edit Bundle',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Bundle name',
          value: bundle.name
        },
        {
          name: 'quantity',
          type: 'number',
          placeholder: 'Quantity',
          value: bundle.quantity.toString()
        },
        {
          name: 'priceMultiplier',
          type: 'number',
          placeholder: 'Price multiplier',
          value: bundle.priceMultiplier.toString()
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (data) => {
            const updated = [...this.bundles()];
            updated[index] = {
              ...bundle,
              name: data.name,
              quantity: parseInt(data.quantity) || 1,
              priceMultiplier: parseFloat(data.priceMultiplier) || 1.0
            };
            this.bundles.set(updated);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  deleteBundle(index: number) {
    const updated = this.bundles().filter((_, i) => i !== index);
    this.bundles.set(updated);
  }

  toggleBundleActive(index: number) {
    const updated = [...this.bundles()];
    updated[index] = { ...updated[index], active: !updated[index].active };
    this.bundles.set(updated);
  }

  canSave(): boolean {
    return this.name().trim().length > 0 && 
           this.barcode().trim().length > 0 && 
           this.category().length > 0 &&
           this.price() > 0;
  }

  save() {
    if (!this.canSave()) {
      return;
    }

    const productData: Partial<Product> = {
      name: this.name().trim(),
      barcode: this.barcode().trim(),
      price: this.price(),
      cost: this.cost(),
      category: this.category(),
      unit: this.unit(),
      quantity: this.quantity(),
      active: this.active(),
      taxable: this.taxable(),
      description: this.description().trim(),
      tags: this.tags().trim() ? this.tags().split(',').map(t => t.trim()) : [],
      variants: this.variants().length > 0 ? this.variants() : undefined,
      portions: this.portions().length > 0 ? this.portions() : undefined,
      bundles: this.bundles().length > 0 ? this.bundles() : undefined
    };

    this.modalCtrl.dismiss({
      confirmed: true,
      product: productData
    });
  }

  cancel() {
    this.modalCtrl.dismiss({
      confirmed: false
    });
  }
}
