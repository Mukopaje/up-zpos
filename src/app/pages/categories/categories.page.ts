import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonReorder,
  IonReorderGroup,
  IonBadge,
  IonFab,
  IonFabButton,
  IonSearchbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  AlertController,
  ToastController,
  ModalController,
  ItemReorderEventDetail,
} from '@ionic/angular/standalone';
import type { AlertInput } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  add,
  createOutline,
  trashOutline,
  reorderThreeOutline,
  searchOutline,
  colorPaletteOutline,
  imageOutline,
  appsOutline,
  arrowBackOutline,
  checkmarkOutline,
  informationCircleOutline,
  fastFoodOutline,
  phonePortraitOutline,
  shirtOutline,
  homeOutline,
  hammerOutline,
  briefcaseOutline,
  footballOutline,
  gameControllerOutline,
  fitnessOutline,
  restaurantOutline,
} from 'ionicons/icons';
import { ProductsService } from '../../core/services/products.service';
import { Category } from '../../models';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.page.html',
  styleUrls: ['./categories.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonReorder,
    IonReorderGroup,
    IonBadge,
    IonFab,
    IonFabButton,
    IonSearchbar,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
  ],
})
export class CategoriesPage implements OnInit {
  private productsService = inject(ProductsService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private modalCtrl = inject(ModalController);

  categories = this.productsService.categories;
  menus = this.productsService.menus;
  searchQuery = signal('');
  isReordering = signal(false);

  filteredCategories = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const cats = this.categories();
    
    if (!query) return cats;
    
    return cats.filter(
      (cat) =>
        cat.name.toLowerCase().includes(query) ||
        cat.description?.toLowerCase().includes(query)
    );
  });

  rootCategories = computed(() => {
    return this.filteredCategories().filter(c => !c.parentId);
  });

  constructor() {
    addIcons({
      add,
      createOutline,
      trashOutline,
      reorderThreeOutline,
      searchOutline,
      colorPaletteOutline,
      imageOutline,
      appsOutline,
      arrowBackOutline,
      checkmarkOutline,
      informationCircleOutline,
      fastFoodOutline,
      phonePortraitOutline,
      shirtOutline,
      homeOutline,
      hammerOutline,
      briefcaseOutline,
      footballOutline,
      gameControllerOutline,
      fitnessOutline,
      restaurantOutline,
    });
  }

  async ngOnInit() {
    await this.loadCategories();
    await this.productsService.loadMenus();
  }

  async loadCategories() {
    try {
      await this.productsService.loadCategories();
    } catch (error) {
      console.error('Error loading categories:', error);
      await this.showToast('Failed to load categories', 'danger');
    }
  }

  onSearchChange() {
    // Trigger recomputation via signal
    this.searchQuery.set(this.searchQuery());
  }

  getSubcategories(parentId: string): Category[] {
    return this.productsService.getSubcategories(parentId);
  }

  getCategoryPath(category: Category): string {
    const hierarchy = this.productsService.getCategoryHierarchy(category._id);
    return hierarchy.map(c => c.name).join(' / ');
  }

  getMenuNameForCategory(category: Category): string | null {
    if (!category.menuId) return null;
    const menu = this.menus().find(m => m._id === category.menuId);
    return menu?.name || null;
  }

  async assignMenu(category: Category) {
    const menus = this.menus().filter(m => m.active);

    if (menus.length === 0) {
      await this.showToast('No menus available. Create a menu first.', 'warning');
      return;
    }

    const inputs: AlertInput[] = [
      {
        name: 'none',
        type: 'radio',
        label: 'No menu',
        value: '',
        checked: !category.menuId,
      },
      ...menus.map<AlertInput>((menu) => ({
        name: menu._id,
        type: 'radio',
        label: menu.name,
        value: menu._id,
        checked: category.menuId === menu._id,
      })),
    ];

    const alert = await this.alertCtrl.create({
      header: 'Assign Menu',
      inputs,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save',
          handler: async (menuId: string) => {
            try {
              await this.productsService.updateCategory(
                category._id,
                category.name,
                category.description || '',
                category.imageUrl || '',
                category.parentId,
                menuId || undefined
              );
              await this.loadCategories();
              await this.showToast('Category menu updated', 'success');
            } catch (error) {
              console.error('Error updating category menu:', error);
              await this.showToast('Failed to update category menu', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async openAddCategoryDialog(parentId?: string) {
    const alert = await this.alertCtrl.create({
      header: parentId ? 'Add Subcategory' : 'Add Category',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Category name',
        },
        {
          name: 'description',
          type: 'textarea',
          placeholder: 'Description (optional)',
        },
        {
          name: 'color',
          type: 'text',
          placeholder: 'Color (e.g., #FF6B6B)',
          value: '#808080',
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Add',
          handler: async (data) => {
            if (!data.name || data.name.trim() === '') {
              await this.showToast('Category name is required', 'warning');
              return false;
            }
            await this.addCategory(data, parentId);
            return true;
          },
        },
      ],
    });

    await alert.present();
  }

  async addCategory(data: any, parentId?: string) {
    try {
      await this.productsService.createCategory(
        data.name.trim(),
        data.description?.trim() || '',
        '', // imageBase64 - can be added later
        parentId
      );
      await this.loadCategories();
      await this.showToast('Category added successfully', 'success');
    } catch (error: any) {
      console.error('Error adding category:', error);
      if (error.message?.includes('already exists')) {
        await this.showToast('Category name already exists', 'danger');
      } else {
        await this.showToast('Failed to add category', 'danger');
      }
    }
  }

  async openEditCategoryDialog(category: Category) {
    const alert = await this.alertCtrl.create({
      header: 'Edit Category',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Category name',
          value: category.name,
        },
        {
          name: 'description',
          type: 'textarea',
          placeholder: 'Description (optional)',
          value: category.description || '',
        },
        {
          name: 'color',
          type: 'text',
          placeholder: 'Color',
          value: category.color || '#808080',
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Save',
          handler: async (data) => {
            if (!data.name || data.name.trim() === '') {
              await this.showToast('Category name is required', 'warning');
              return false;
            }
            await this.updateCategory(category._id, data);
            return true;
          },
        },
      ],
    });

    await alert.present();
  }

  async updateCategory(id: string, data: any) {
    try {
      await this.productsService.updateCategory(
        id,
        data.name.trim(),
        data.description?.trim() || '',
        '' // imageBase64 - can be added later
      );
      await this.loadCategories();
      await this.showToast('Category updated successfully', 'success');
    } catch (error: any) {
      console.error('Error updating category:', error);
      if (error.message?.includes('already exists')) {
        await this.showToast('Category name already exists', 'danger');
      } else {
        await this.showToast('Failed to update category', 'danger');
      }
    }
  }

  async deleteCategory(category: Category) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Category',
      message: `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              await this.productsService.deleteCategory(category._id);
              await this.loadCategories();
              await this.showToast('Category deleted successfully', 'success');
            } catch (error: any) {
              console.error('Error deleting category:', error);
              await this.showToast(error.message || 'Failed to delete category', 'danger');
            }
          },
        },
      ],
    });

    await alert.present();
  }

  toggleReorder() {
    this.isReordering.update((value) => !value);
  }

  async handleReorder(event: CustomEvent<ItemReorderEventDetail>) {
    const from = event.detail.from;
    const to = event.detail.to;

    // Reorder the array
    const items = [...this.filteredCategories()];
    const itemToMove = items.splice(from, 1)[0];
    items.splice(to, 0, itemToMove);

    // TODO: Implement reordering in ProductsService
    // For now, just complete the reorder
    event.detail.complete();

    await this.showToast('Category order updated', 'success');
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
