import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, AlertController, ToastController } from '@ionic/angular';
import { ModifierGroup, Category, Product } from '@app/models';
import { SqliteService } from '@app/core/services/sqlite.service';
import { ProductsService } from '@app/core/services/products.service';

@Component({
  selector: 'app-modifier-groups',
  templateUrl: './modifier-groups.page.html',
  styleUrls: ['./modifier-groups.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ModifierGroupsPage implements OnInit {
  modifierGroups = signal<ModifierGroup[]>([]);
  categories = signal<Category[]>([]);
  products = signal<Product[]>([]);
  loading = signal<boolean>(false);
  searchQuery = signal<string>('');

  filteredGroups = signal<ModifierGroup[]>([]);

  constructor(
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private sqlite: SqliteService,
    private productsService: ProductsService
  ) {}

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.loading.set(true);
    try {
      // Load modifier groups from SQLite
      await this.sqlite.ensureInitialized();
      const groups = await this.sqlite.getModifierGroups();
      this.modifierGroups.set(groups as ModifierGroup[]);
      this.filteredGroups.set(groups as ModifierGroup[]);

      // Load categories and products via ProductsService (SQLite-backed)
      const [cats, prods] = await Promise.all([
        this.productsService.loadCategories(),
        this.productsService.loadProducts()
      ]);
      this.categories.set(cats);
      this.products.set(prods);
    } catch (error) {
      console.error('Error loading data:', error);
      await this.showToast('Error loading modifier groups');
    } finally {
      this.loading.set(false);
    }
  }

  filterGroups(event: any) {
    const query = event.target.value.toLowerCase();
    this.searchQuery.set(query);

    if (!query.trim()) {
      this.filteredGroups.set(this.modifierGroups());
      return;
    }

    const filtered = this.modifierGroups().filter(group =>
      group.name.toLowerCase().includes(query) ||
      group.options.some(opt => opt.name.toLowerCase().includes(query))
    );
    this.filteredGroups.set(filtered);
  }

  async createModifierGroup() {
    const alert = await this.alertCtrl.create({
      header: 'New Modifier Group',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Group name (e.g., Pizza Toppings)'
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Create',
          handler: async (data) => {
            if (!data.name || !data.name.trim()) {
              await this.showToast('Please enter a group name');
              return false;
            }

            const newGroup: ModifierGroup = {
              _id: `modifier-group-${Date.now()}`,
              type: 'modifier-group',
              name: data.name.trim(),
              options: [],
              multiSelect: true,
              required: false,
              categories: [],
              products: [],
              active: true,
              createdAt: Date.now(),
              updatedAt: Date.now()
            };

            try {
              await this.sqlite.addModifierGroup(newGroup);
              await this.loadData();
              await this.showToast('Modifier group created');
              await this.editModifierGroup(newGroup);
            } catch (error) {
              console.error('Error creating modifier group:', error);
              await this.showToast('Error creating modifier group');
            }
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async editModifierGroup(group: ModifierGroup) {
    const modal = await this.modalCtrl.create({
      component: ModifierGroupFormModal,
      componentProps: {
        modifierGroup: group,
        categories: this.categories(),
        products: this.products()
      }
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();

    if (data && data.saved) {
      await this.loadData();
    }
  }

  async deleteModifierGroup(group: ModifierGroup) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Modifier Group',
      message: `Are you sure you want to delete "${group.name}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              await this.sqlite.deleteModifierGroup(group._id);
              await this.loadData();
              await this.showToast('Modifier group deleted');
            } catch (error) {
              console.error('Error deleting modifier group:', error);
              await this.showToast('Error deleting modifier group');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async duplicateModifierGroup(group: ModifierGroup) {
    const newGroup: ModifierGroup = {
      ...group,
      _id: `modifier-group-${Date.now()}`,
      name: `${group.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    try {
      await this.sqlite.addModifierGroup(newGroup);
      await this.loadData();
      await this.showToast('Modifier group duplicated');
    } catch (error) {
      console.error('Error duplicating modifier group:', error);
      await this.showToast('Error duplicating modifier group');
    }
  }

  getCategoryNames(categoryIds?: string[]): string {
    if (!categoryIds || categoryIds.length === 0) {
      return 'None';
    }
    const cats = this.categories();
    const names = categoryIds
      .map(id => cats.find(c => c._id === id)?.name)
      .filter(Boolean);
    return names.join(', ') || 'None';
  }

  getProductCount(productIds?: string[]): number {
    return productIds?.length || 0;
  }

  async handleRefresh(event: any) {
    await this.loadData();
    event.target.complete();
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }
}

// Modal Component for editing modifier group
import { Component as ModalComponent, Input, inject } from '@angular/core';
import { ModifierOption } from '@app/models';

@ModalComponent({
  selector: 'app-modifier-group-form-modal',
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>{{ modifierGroup.name }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="cancel()">
            <ion-icon name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      
      <ion-toolbar>
        <ion-segment [(ngModel)]="selectedTab" [value]="selectedTab()">
          <ion-segment-button value="options">
            <ion-label>Options</ion-label>
          </ion-segment-button>
          <ion-segment-button value="settings">
            <ion-label>Settings</ion-label>
          </ion-segment-button>
          <ion-segment-button value="assignment">
            <ion-label>Assignment</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Options Tab -->
      @if (selectedTab() === 'options') {
        <div class="tab-content">
          <div class="section-header">
            <ion-button expand="block" (click)="addOption()">
              <ion-icon name="add" slot="start"></ion-icon>
              Add Option
            </ion-button>
          </div>

          @if (options().length === 0) {
            <div class="empty-state">
              <ion-icon name="list-outline"></ion-icon>
              <p>No options added yet</p>
            </div>
          } @else {
            <ion-list>
              @for (option of options(); track option.id; let i = $index) {
                <ion-item>
                  <ion-checkbox slot="start" [checked]="option.active" (ionChange)="toggleOptionActive(i)"></ion-checkbox>
                  <ion-label>
                    <h2>{{ option.name }}</h2>
                    <p>\${{ option.price.toFixed(2) }}</p>
                  </ion-label>
                  <ion-button slot="end" fill="clear" (click)="editOption(option, i)">
                    <ion-icon name="create-outline"></ion-icon>
                  </ion-button>
                  <ion-button slot="end" fill="clear" color="danger" (click)="deleteOption(i)">
                    <ion-icon name="trash-outline"></ion-icon>
                  </ion-button>
                </ion-item>
              }
            </ion-list>
          }
        </div>
      }

      <!-- Settings Tab -->
      @if (selectedTab() === 'settings') {
        <div class="tab-content">
          <ion-list>
            <ion-item>
              <ion-input
                label="Group Name"
                labelPlacement="stacked"
                [(ngModel)]="groupName"
                [value]="groupName()"
                placeholder="Enter group name">
              </ion-input>
            </ion-item>

            <ion-item>
              <ion-checkbox [(ngModel)]="multiSelect" [checked]="multiSelect()">
                Allow Multiple Selections
              </ion-checkbox>
            </ion-item>

            <ion-item>
              <ion-checkbox [(ngModel)]="required" [checked]="required()">
                Required (Must select at least one)
              </ion-checkbox>
            </ion-item>
          </ion-list>
        </div>
      }

      <!-- Assignment Tab -->
      @if (selectedTab() === 'assignment') {
        <div class="tab-content">
          <ion-list>
            <ion-list-header>
              <ion-label>Assign to Categories</ion-label>
            </ion-list-header>
            @for (category of categories; track category._id) {
              <ion-item>
                <ion-checkbox
                  [checked]="isCategorySelected(category._id)"
                  (ionChange)="toggleCategory(category._id)">
                  {{ category.name }}
                </ion-checkbox>
              </ion-item>
            }
          </ion-list>

          <ion-list>
            <ion-list-header>
              <ion-label>Assign to Specific Products</ion-label>
            </ion-list-header>
            <ion-searchbar
              placeholder="Search products..."
              (ionInput)="filterProducts($event)">
            </ion-searchbar>
            @for (product of filteredProducts(); track product._id) {
              <ion-item>
                <ion-checkbox
                  [checked]="isProductSelected(product._id)"
                  (ionChange)="toggleProduct(product._id)">
                  {{ product.name }}
                </ion-checkbox>
              </ion-item>
            }
          </ion-list>
        </div>
      }
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ion-button slot="start" fill="clear" (click)="cancel()">Cancel</ion-button>
        <ion-button slot="end" (click)="save()">Save Changes</ion-button>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [`
    .tab-content {
      padding: 16px;
    }

    .section-header {
      margin-bottom: 16px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
      color: var(--ion-color-medium);

      ion-icon {
        font-size: 64px;
        margin-bottom: 16px;
        opacity: 0.5;
      }

      p {
        margin: 0;
        font-size: 16px;
      }
    }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ModifierGroupFormModal implements OnInit {
  @Input() modifierGroup!: ModifierGroup;
  @Input() categories: Category[] = [];
  @Input() products: Product[] = [];

  selectedTab = signal<string>('options');
  groupName = signal<string>('');
  multiSelect = signal<boolean>(true);
  required = signal<boolean>(false);
  options = signal<ModifierOption[]>([]);
  selectedCategories = signal<string[]>([]);
  selectedProducts = signal<string[]>([]);
  filteredProducts = signal<Product[]>([]);

  private sqlite = inject(SqliteService);

  constructor(
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.groupName.set(this.modifierGroup.name);
    this.multiSelect.set(this.modifierGroup.multiSelect);
    this.required.set(this.modifierGroup.required);
    this.options.set([...this.modifierGroup.options]);
    this.selectedCategories.set([...(this.modifierGroup.categories || [])]);
    this.selectedProducts.set([...(this.modifierGroup.products || [])]);
    this.filteredProducts.set(this.products);
  }

  async addOption() {
    const alert = await this.alertCtrl.create({
      header: 'Add Option',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Option name' },
        { name: 'price', type: 'number', placeholder: 'Price', value: '0' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: (data) => {
            if (!data.name) return false;
            const newOption: ModifierOption = {
              id: `opt-${Date.now()}`,
              name: data.name,
              price: parseFloat(data.price) || 0,
              active: true
            };
            this.options.set([...this.options(), newOption]);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async editOption(option: ModifierOption, index: number) {
    const alert = await this.alertCtrl.create({
      header: 'Edit Option',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Option name', value: option.name },
        { name: 'price', type: 'number', placeholder: 'Price', value: option.price.toString() }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (data) => {
            const updated = [...this.options()];
            updated[index] = { ...option, name: data.name, price: parseFloat(data.price) || 0 };
            this.options.set(updated);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  deleteOption(index: number) {
    const updated = this.options().filter((_, i) => i !== index);
    this.options.set(updated);
  }

  toggleOptionActive(index: number) {
    const updated = [...this.options()];
    updated[index] = { ...updated[index], active: !updated[index].active };
    this.options.set(updated);
  }

  toggleCategory(categoryId: string) {
    const current = this.selectedCategories();
    if (current.includes(categoryId)) {
      this.selectedCategories.set(current.filter(id => id !== categoryId));
    } else {
      this.selectedCategories.set([...current, categoryId]);
    }
  }

  isCategorySelected(categoryId: string): boolean {
    return this.selectedCategories().includes(categoryId);
  }

  toggleProduct(productId: string) {
    const current = this.selectedProducts();
    if (current.includes(productId)) {
      this.selectedProducts.set(current.filter(id => id !== productId));
    } else {
      this.selectedProducts.set([...current, productId]);
    }
  }

  isProductSelected(productId: string): boolean {
    return this.selectedProducts().includes(productId);
  }

  filterProducts(event: any) {
    const query = event.target.value.toLowerCase();
    if (!query.trim()) {
      this.filteredProducts.set(this.products);
      return;
    }
    const filtered = this.products.filter(p => p.name.toLowerCase().includes(query));
    this.filteredProducts.set(filtered);
  }

  async save() {
    if (!this.groupName().trim()) {
      await this.showToast('Please enter a group name');
      return;
    }

    if (this.options().length === 0) {
      await this.showToast('Please add at least one option');
      return;
    }

    const updated: ModifierGroup = {
      ...this.modifierGroup,
      name: this.groupName(),
      multiSelect: this.multiSelect(),
      required: this.required(),
      options: this.options(),
      categories: this.selectedCategories(),
      products: this.selectedProducts(),
      updatedAt: Date.now()
    };

    try {
      await this.sqlite.updateModifierGroup(updated);
      await this.showToast('Modifier group saved');
      this.modalCtrl.dismiss({ saved: true });
    } catch (error) {
      console.error('Error saving modifier group:', error);
      await this.showToast('Error saving modifier group');
    }
  }

  cancel() {
    this.modalCtrl.dismiss({ saved: false });
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }
}
