# Category Management Fix - Implementation Guide

## Problem Analysis

### Issues Found:
1. **Dual Database Systems** - Categories page uses SqliteService (mobile-only) while POS uses PouchDB
2. **Single Category Per Product** - Products can only belong to ONE category
3. **No Subcategory Implementation** - Model supports it but no UI/logic
4. **Seed Data Confusion** - Sample products (Coca Cola, etc.) are created as seed data, not hardcoded

## Solution Overview

This fix implements:
✅ Unified database (PouchDB) for all category operations
✅ Many-to-many product-category relationships
✅ Full subcategory support with hierarchy
✅ Category management UI integrated into products page
✅ Backward compatibility with existing single-category products

## Changes Made

### 1. Model Updates (`src/app/models/index.ts`)

**Product Interface:**
```typescript
export interface Product {
  // ... existing fields
  category: string; // @deprecated - kept for backward compatibility
  categories?: string[]; // NEW: Array of category IDs
  // ... rest of fields
}
```

**Category Interface - Enhanced:**
```typescript
export interface Category {
  _id: string;
  name: string;
  description?: string;
  parentId?: string; // For subcategories
  parentPath?: string[]; // Full hierarchy path
  level?: number; // Depth level
  productCount?: number; // Cached count
  // ... rest of fields
}
```

### 2. ProductsService Updates (`src/app/core/services/products.service.ts`)

**New Methods Added:**
```typescript
// Multi-category filtering
filterByCategories(categoryIds: string[]): Product[]

// Category deletion with validation
async deleteCategory(id: string): Promise<boolean>

// Subcategory management
getSubcategories(parentId: string): Category[]
getRootCategories(): Category[]
getCategoryHierarchy(categoryId: string): Category[]

// Product category assignment
async updateProductCategories(productId: string, categoryIds: string[]): Promise<boolean>
```

**Enhanced Methods:**
- `filterByCategory()` - Now supports both old single category and new multiple categories

## Implementation Steps

### Step 1: Update Categories Page (PRIORITY)

Replace `src/app/pages/categories/categories.page.ts` to use ProductsService instead of SqliteService:

```typescript
import { ProductsService } from '../../core/services/products.service';
import { Category } from '../../models';

export class CategoriesPage implements OnInit {
  private productsService = inject(ProductsService);
  categories = this.productsService.categories;
  
  async loadCategories() {
    await this.productsService.loadCategories();
  }
  
  async addCategory(data: any) {
    const parentId = data.parentId || undefined;
    await this.productsService.createCategory(
      data.name,
      data.description,
      data.imageBase64,
      parentId  // Support for subcategories
    );
  }
  
  async deleteCategory(category: Category) {
    try {
      await this.productsService.deleteCategory(category._id);
      await this.showToast('Category deleted', 'success');
    } catch (error: any) {
      await this.showToast(error.message, 'danger');
    }
  }
}
```

### Step 2: Add Category Management to Products Page

Add a segment/tab in `products.page.html` for category management:

```html
<ion-segment [(ngModel)]="activeSegment">
  <ion-segment-button value="products">
    <ion-label>Products</ion-label>
  </ion-segment-button>
  <ion-segment-button value="categories">
    <ion-label>Categories</ion-label>
  </ion-segment-button>
</ion-segment>

<!-- Categories View -->
<div *ngIf="activeSegment === 'categories'">
  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button (click)="openAddCategoryDialog()">
      <ion-icon name="add-outline"></ion-icon>
    </ion-fab-button>
  </ion-fab>
  
  <ion-list>
    @for (category of rootCategories(); track category._id) {
      <ion-item button (click)="editCategory(category)">
        <ion-label>
          <h2>{{ category.name }}</h2>
          <p *ngIf="category.description">{{ category.description }}</p>
          @if (getSubcategories(category._id).length > 0) {
            <ion-badge color="primary">
              {{ getSubcategories(category._id).length }} subcategories
            </ion-badge>
          }
        </ion-label>
        <ion-button slot="end" fill="clear" (click)="deleteCategory(category); $event.stopPropagation()">
          <ion-icon name="trash-outline" color="danger"></ion-icon>
        </ion-button>
      </ion-item>
      
      <!-- Subcategories -->
      @for (sub of getSubcategories(category._id); track sub._id) {
        <ion-item class="subcategory" button (click)="editCategory(sub)">
          <ion-label class="ion-padding-start">
            <h3>└─ {{ sub.name }}</h3>
          </ion-label>
          <ion-button slot="end" fill="clear" (click)="deleteCategory(sub); $event.stopPropagation()">
            <ion-icon name="trash-outline" color="danger"></ion-icon>
          </ion-button>
        </ion-item>
      }
    }
  </ion-list>
</div>
```

In `products.page.ts`:
```typescript
export class ProductsPage implements OnInit {
  activeSegment = signal<'products' | 'categories'>('products');
  rootCategories = computed(() => this.productsService.getRootCategories());
  
  getSubcategories(parentId: string): Category[] {
    return this.productsService.getSubcategories(parentId);
  }
  
  async openAddCategoryDialog() {
    const alert = await this.alertCtrl.create({
      header: 'Add Category',
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
          name: 'parentId',
          type: 'text',
          placeholder: 'Parent Category ID (for subcategory)',
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: async (data) => {
            if (!data.name?.trim()) {
              await this.showToast('Category name is required');
              return false;
            }
            await this.productsService.createCategory(
              data.name.trim(),
              data.description?.trim() || '',
              '', // imageBase64
              data.parentId?.trim() || undefined
            );
            await this.showToast('Category added successfully');
            return true;
          }
        }
      ]
    });
    await alert.present();
  }
  
  async deleteCategory(category: Category) {
    const confirm = await this.alertCtrl.create({
      header: 'Delete Category',
      message: `Delete "${category.name}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              await this.productsService.deleteCategory(category._id);
              await this.showToast('Category deleted');
            } catch (error: any) {
              await this.showToast(error.message, 'danger');
            }
          }
        }
      ]
    });
    await confirm.present();
  }
}
```

### Step 3: Update Product Form for Multiple Categories

In `product-form-modal.component.ts`:

```typescript
export class ProductFormModalComponent {
  selectedCategories = signal<string[]>([]);
  
  ngOnInit() {
    if (this.product) {
      // Load existing categories
      if (this.product.categories && this.product.categories.length > 0) {
        this.selectedCategories.set([...this.product.categories]);
      } else if (this.product.category) {
        // Backward compatibility
        this.selectedCategories.set([this.product.category]);
      }
    }
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
  
  async save() {
    // ... other validation
    
    const productData = {
      // ... other fields
      categories: this.selectedCategories(),
      category: this.selectedCategories()[0] || '', // Backward compatibility
    };
    
    // Save product...
  }
}
```

In `product-form-modal.component.html`:
```html
<ion-item>
  <ion-label>Categories</ion-label>
</ion-item>

@for (category of categories; track category._id) {
  <ion-item>
    <ion-checkbox
      [checked]="isCategorySelected(category._id)"
      (ionChange)="toggleCategory(category._id)"
    >
      {{ category.name }}
    </ion-checkbox>
    @if (category.parentId) {
      <ion-badge color="medium" slot="end">Subcategory</ion-badge>
    }
  </ion-item>
}
```

### Step 4: Update POS Category Filtering

Update the filtering logic in POS pages:

```typescript
// pos-category.page.ts
filteredProducts = computed(() => {
  let filtered = this.products();

  const categoryId = this.selectedCategory();
  if (categoryId) {
    filtered = this.productsService.filterByCategory(categoryId);
  }

  // Search filter
  const query = this.searchQuery().toLowerCase();
  if (query) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.barcode.includes(query)
    );
  }

  return filtered;
});
```

### Step 5: Data Migration (Optional but Recommended)

Create a migration utility to convert existing products:

```typescript
// In ProductsService
async migrateProductCategories(): Promise<void> {
  const products = this.products();
  let migratedCount = 0;
  
  for (const product of products) {
    if (!product.categories && product.category) {
      // Migrate single category to array
      product.categories = [product.category];
      await this.db.put(product);
      migratedCount++;
    }
  }
  
  console.log(`Migrated ${migratedCount} products to use category arrays`);
  await this.loadProducts();
}
```

Call this once after deploying:
```typescript
// In app.component.ts ngOnInit or settings page
async ngOnInit() {
  // ... other init code
  await this.productsService.migrateProductCategories();
}
```

## Testing Checklist

- [ ] Categories created in Products Management appear in POS screen
- [ ] Can create root categories
- [ ] Can create subcategories under root categories
- [ ] Cannot delete category with assigned products
- [ ] Cannot delete category with subcategories
- [ ] Products can be assigned to multiple categories
- [ ] POS filtering works with products in multiple categories
- [ ] Category hierarchy displays correctly
- [ ] Backward compatibility: Old single-category products still work

## Rollout Plan

1. **Phase 1:** Deploy model changes and ProductsService updates (backward compatible)
2. **Phase 2:** Update categories page to use PouchDB
3. **Phase 3:** Add category management UI to products page
4. **Phase 4:** Update product form for multi-category selection
5. **Phase 5:** Run migration for existing products
6. **Phase 6:** Update all POS screens for new filtering logic

## Notes

- **Backward Compatibility:** Products with only `category` field will still work
- **SqliteService:** Keep it for now but mark as @deprecated, eventually remove
- **Performance:** Category filtering is done in-memory, should be fast even with 1000s of products
- **Future Enhancement:** Add drag-and-drop category reordering

## Need Help?

If you encounter issues:
1. Check browser console for errors
2. Verify PouchDB is initialized
3. Check if seed data created categories correctly
4. Ensure category IDs match between products and categories
