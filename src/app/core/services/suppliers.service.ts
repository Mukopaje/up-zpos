import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class SuppliersService {
  private api = inject(ApiService);

  private suppliersState = signal<Supplier[]>([]);
  private loadingState = signal<boolean>(false);

  suppliers = this.suppliersState.asReadonly();
  isLoading = this.loadingState.asReadonly();

  async loadSuppliers(): Promise<void> {
    this.loadingState.set(true);
    try {
      const result = await this.api.getSuppliers();
      this.suppliersState.set(
        (result || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          contactName: row.contact_name ?? undefined,
          phone: row.phone ?? undefined,
          email: row.email ?? undefined,
          address: row.address ?? undefined,
          notes: row.notes ?? undefined,
        })),
      );
    } catch (error) {
      console.error('Failed to load suppliers', error);
    } finally {
      this.loadingState.set(false);
    }
  }

  async createSupplier(data: Omit<Supplier, 'id'>): Promise<void> {
    await this.api.createSupplier({
      name: data.name,
      contact_name: data.contactName,
      phone: data.phone,
      email: data.email,
      address: data.address,
      notes: data.notes,
    });
    await this.loadSuppliers();
  }

  async updateSupplier(id: string, data: Partial<Supplier>): Promise<void> {
    await this.api.updateSupplier(id, {
      name: data.name,
      contact_name: data.contactName,
      phone: data.phone,
      email: data.email,
      address: data.address,
      notes: data.notes,
    });
    await this.loadSuppliers();
  }

  async deleteSupplier(id: string): Promise<void> {
    await this.api.deleteSupplier(id);
    await this.loadSuppliers();
  }
}
