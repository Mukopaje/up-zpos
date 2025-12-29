import { Injectable, inject } from '@angular/core';
import { Product, Category } from '../../models';
import { ProductsService } from './products.service';

@Injectable({
  providedIn: 'root'
})
export class SeedDataService {
  private productsService = inject(ProductsService);

  /**
   * Seed sample data for testing
   */
  async seedSampleData(): Promise<void> {
    try {
      console.log('Checking for existing data...');

      // Check if we already have products in SQLite
      const existing = await this.productsService.loadProducts();
      if (existing.length > 0) {
        console.log('Data already exists, skipping seed');
        return;
      }

      console.log('Seeding sample data...');

      // Create categories
      const categories: Category[] = [
        {
          _id: 'CAT_001',
          type: 'category',
          name: 'Beverages',
          description: 'Drinks and refreshments',
          icon: '',
          order: 1,
          active: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          _id: 'CAT_002',
          type: 'category',
          name: 'Snacks',
          description: 'Chips, nuts and snacks',
          icon: '',
          order: 2,
          active: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          _id: 'CAT_003',
          type: 'category',
          name: 'Groceries',
          description: 'Basic food items',
          icon: '',
          order: 3,
          active: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          _id: 'CAT_004',
          type: 'category',
          name: 'Household',
          description: 'Cleaning and household items',
          icon: '',
          order: 4,
          active: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      // Create products
      const products: Product[] = [
        // Beverages
        {
          _id: 'PRD_001',
          type: 'product',
          name: 'Coca Cola 500ml',
          barcode: '001',
          category: 'CAT_001',
          price: 15.00,
          cost: 10.00,
          quantity: 50,
          unit: 'unit',
          description: 'Refreshing cola drink',
          imageUrl: '',
          taxable: true,
          active: true,
          inventory: [{
            location: 'default',
            warehouse: 'main',
            qty: 50,
            cost: 10.00
          }],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'system',
          updatedBy: 'system'
        },
        {
          _id: 'PRD_002',
          type: 'product',
          name: 'Fanta Orange 500ml',
          barcode: '002',
          category: 'CAT_001',
          price: 15.00,
          cost: 10.00,
          quantity: 45,
          unit: 'unit',
          description: 'Orange flavored soda',
          imageUrl: '',
          taxable: true,
          active: true,
          inventory: [{
            location: 'default',
            warehouse: 'main',
            qty: 45,
            cost: 10.00
          }],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'system',
          updatedBy: 'system'
        },
        {
          _id: 'PRD_003',
          type: 'product',
          name: 'Bottled Water 750ml',
          barcode: '003',
          category: 'CAT_001',
          price: 8.00,
          cost: 5.00,
          quantity: 100,
          unit: 'unit',
          description: 'Pure drinking water',
          imageUrl: '',
          taxable: false,
          active: true,
          inventory: [{
            location: 'default',
            warehouse: 'main',
            qty: 100,
            cost: 5.00
          }],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'system',
          updatedBy: 'system'
        },
        // Snacks
        {
          _id: 'PRD_004',
          type: 'product',
          name: 'Lays Chips Original',
          barcode: '004',
          category: 'CAT_002',
          price: 12.00,
          cost: 8.00,
          quantity: 35,
          unit: 'unit',
          description: 'Classic potato chips',
          imageUrl: '',
          taxable: true,
          active: true,
          inventory: [{
            location: 'default',
            warehouse: 'main',
            qty: 35,
            cost: 8.00
          }],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'system',
          updatedBy: 'system'
        },
        {
          _id: 'PRD_005',
          type: 'product',
          name: 'Peanuts Roasted 100g',
          barcode: '005',
          category: 'CAT_002',
          price: 10.00,
          cost: 6.00,
          quantity: 40,
          unit: 'unit',
          description: 'Salted roasted peanuts',
          imageUrl: '',
          taxable: true,
          active: true,
          inventory: [{
            location: 'default',
            warehouse: 'main',
            qty: 40,
            cost: 6.00
          }],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'system',
          updatedBy: 'system'
        },
        // Groceries
        {
          _id: 'PRD_006',
          type: 'product',
          name: 'White Bread Loaf',
          barcode: '006',
          category: 'CAT_003',
          price: 18.00,
          cost: 12.00,
          quantity: 25,
          unit: 'unit',
          description: 'Fresh white bread',
          imageUrl: '',
          taxable: false,
          active: true,
          inventory: [{
            location: 'default',
            warehouse: 'main',
            qty: 25,
            cost: 12.00
          }],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'system',
          updatedBy: 'system'
        },
        {
          _id: 'PRD_007',
          type: 'product',
          name: 'Cooking Oil 2L',
          barcode: '007',
          category: 'CAT_003',
          price: 85.00,
          cost: 65.00,
          quantity: 20,
          unit: 'unit',
          description: 'Vegetable cooking oil',
          imageUrl: '',
          taxable: false,
          active: true,
          inventory: [{
            location: 'default',
            warehouse: 'main',
            qty: 20,
            cost: 65.00
          }],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'system',
          updatedBy: 'system'
        },
        {
          _id: 'PRD_008',
          type: 'product',
          name: 'Rice 1kg',
          barcode: '008',
          category: 'CAT_003',
          price: 45.00,
          cost: 35.00,
          quantity: 30,
          unit: 'unit',
          description: 'Long grain white rice',
          imageUrl: '',
          taxable: false,
          active: true,
          inventory: [{
            location: 'default',
            warehouse: 'main',
            qty: 30,
            cost: 35.00
          }],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'system',
          updatedBy: 'system'
        },
        // Household
        {
          _id: 'PRD_009',
          type: 'product',
          name: 'Dish Soap 500ml',
          barcode: '009',
          category: 'CAT_004',
          price: 25.00,
          cost: 18.00,
          quantity: 15,
          unit: 'unit',
          description: 'Dishwashing liquid',
          imageUrl: '',
          taxable: true,
          active: true,
          inventory: [{
            location: 'default',
            warehouse: 'main',
            qty: 15,
            cost: 18.00
          }],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'system',
          updatedBy: 'system'
        },
        {
          _id: 'PRD_010',
          type: 'product',
          name: 'Toilet Paper 4 Pack',
          barcode: '010',
          category: 'CAT_004',
          price: 35.00,
          cost: 25.00,
          quantity: 20,
          unit: 'unit',
          description: 'Soft toilet tissue',
          imageUrl: '',
          taxable: true,
          active: true,
          inventory: [{
            location: 'default',
            warehouse: 'main',
            qty: 20,
            cost: 25.00
          }],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'system',
          updatedBy: 'system'
        }
      ];

      // Create categories in SQLite via ProductsService and map old IDs
      const categoryIdMap = new Map<string, string>();
      for (const category of categories) {
        const created = await this.productsService.createCategory(
          category.name,
          category.description || '',
          category.imageUrl || ''
        );
        if (created) {
          categoryIdMap.set(category._id, created._id);
        }
      }

      // Create products in SQLite via ProductsService using mapped category IDs
      for (const product of products) {
        const categoryId = categoryIdMap.get(product.category) || '';
        await this.productsService.createProduct(
          product.name,
          product.barcode,
          categoryId,
          product.price,
          product.cost,
          product.quantity,
          product.imageUrl || '',
          {
            description: product.description,
            taxExempt: !product.taxable
          }
        );
      }

      console.log('Sample data seeded successfully!');
      console.log(`Created ${categories.length} categories and ${products.length} products`);
    } catch (error) {
      console.error('Error seeding data:', error);
      throw error;
    }
  }

  /**
   * Clear all sample data
   */
  async clearSampleData(): Promise<void> {
    try {
      // Best-effort clearing based on sample names
      const products = await this.productsService.loadProducts();
      const categories = await this.productsService.loadCategories();

      const sampleCategoryNames = new Set(categories
        .filter(c => ['Beverages', 'Snacks', 'Groceries', 'Household'].includes(c.name))
        .map(c => c._id));

      // Delete sample products
      for (const product of products) {
        if (sampleCategoryNames.has(product.category)) {
          await this.productsService.deleteProduct(product._id);
        }
      }

      // Delete sample categories
      for (const category of categories) {
        if (['Beverages', 'Snacks', 'Groceries', 'Household'].includes(category.name)) {
          await this.productsService.deleteCategory(category._id);
        }
      }

      console.log('Sample data cleared successfully from SQLite!');
    } catch (error) {
      console.error('Error clearing sample data:', error);
      throw error;
    }
  }
}
