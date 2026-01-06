import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Promotion } from '../../models';

@Injectable({ providedIn: 'root' })
export class PromotionsService {
  private api = inject(ApiService);

  private promotionsState = signal<Promotion[]>([]);
  private loadingState = signal<boolean>(false);

  promotions = this.promotionsState.asReadonly();
  isLoading = this.loadingState.asReadonly();

  async loadPromotions(): Promise<void> {
    this.loadingState.set(true);
    try {
      const list = await this.api.getPromotions();
      this.promotionsState.set(list || []);
    } catch (error) {
      console.error('Failed to load promotions', error);
    } finally {
      this.loadingState.set(false);
    }
  }

  async createPromotion(data: Partial<Promotion>): Promise<void> {
    await this.api.createPromotion(data);
    await this.loadPromotions();
  }

  async updatePromotion(id: string, data: Partial<Promotion>): Promise<void> {
    await this.api.updatePromotion(id, data);
    await this.loadPromotions();
  }

  async deletePromotion(id: string): Promise<void> {
    await this.api.deletePromotion(id);
    await this.loadPromotions();
  }
}
