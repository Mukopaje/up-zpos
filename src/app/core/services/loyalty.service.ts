import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { LoyaltyProgram, LoyaltyAccount } from '../../models';

@Injectable({ providedIn: 'root' })
export class LoyaltyServiceClient {
  private api = inject(ApiService);

  private programState = signal<LoyaltyProgram | null>(null);
  private loadingState = signal<boolean>(false);

  program = this.programState.asReadonly();
  isLoading = this.loadingState.asReadonly();

  async loadProgram(): Promise<LoyaltyProgram | null> {
    this.loadingState.set(true);
    try {
      const program = await this.api.getLoyaltyProgram();
      this.programState.set(program);
      return program;
    } finally {
      this.loadingState.set(false);
    }
  }

  async saveProgram(payload: LoyaltyProgram): Promise<LoyaltyProgram> {
    this.loadingState.set(true);
    try {
      const saved = await this.api.saveLoyaltyProgram(payload);
      this.programState.set(saved);
      return saved;
    } finally {
      this.loadingState.set(false);
    }
  }

  async getAccount(customerId: string): Promise<LoyaltyAccount | null> {
    return this.api.getLoyaltyAccount(customerId);
  }
}
