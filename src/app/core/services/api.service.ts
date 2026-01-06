import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { StorageService } from './storage.service';
import { LoyaltyProgram, LoyaltyAccount, Promotion } from '../../models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private storage = inject(StorageService);
  private baseUrl = environment.apiUrl || 'http://localhost:3000';

  private async getHeaders(): Promise<HttpHeaders> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    // Add auth token if available
    const token = await this.storage.get<string>('token');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  private async getAuthHeadersWithoutContentType(): Promise<HttpHeaders> {
    let headers = new HttpHeaders();
    const token = await this.storage.get<string>('token');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = error.error?.message || error.message || `Error Code: ${error.status}`;
    }

    console.error('API Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }

  // AI Product endpoints
  async generateProductDescription(productName: string, category?: string): Promise<string> {
    try {
      const headers = await this.getHeaders();
      const response = await firstValueFrom(
        this.http.post<{ description: string }>(
          `${this.baseUrl}/products/ai/generate-description`,
          { productName, category },
          { headers }
        ).pipe(catchError(this.handleError))
      );
      return response.description;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to generate description');
    }
  }

  async generateProductImage(productName: string, description?: string): Promise<string> {
    try {
      const headers = await this.getHeaders();
      const response = await firstValueFrom(
        this.http.post<{ imageUrl: string }>(
          `${this.baseUrl}/products/ai/generate-image`,
          { productName, description },
          { headers }
        ).pipe(catchError(this.handleError))
      );
      return response.imageUrl;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to generate image');
    }
  }

  async suggestProductCategory(productName: string, description?: string): Promise<string> {
    try {
      const headers = await this.getHeaders();
      const response = await firstValueFrom(
        this.http.post<{ category: string }>(
          `${this.baseUrl}/products/ai/suggest-category`,
          { productName, description },
          { headers }
        ).pipe(catchError(this.handleError))
      );
      return response.category;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to suggest category');
    }
  }

  // Product import template & bulk import
  async emailProductImportTemplate(): Promise<void> {
    try {
      const headers = await this.getHeaders();
      await firstValueFrom(
        this.http
          .post<{ success: boolean; message?: string }>(
            `${this.baseUrl}/products/import/template/email`,
            {},
            { headers }
          )
          .pipe(catchError(this.handleError))
      );
    } catch (error: any) {
      throw new Error(error.message || 'Failed to email import template');
    }
  }

  async importProductsFromCsv(file: File): Promise<{
    imported: number;
    updated: number;
    skipped: number;
    errors: { line: number; message: string }[];
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const headers = await this.getAuthHeadersWithoutContentType();

      const response = await firstValueFrom(
        this.http
          .post<{
            imported: number;
            updated: number;
            skipped: number;
            errors: { line: number; message: string }[];
          }>(`${this.baseUrl}/products/import`, formData, {
            headers,
          })
          .pipe(catchError(this.handleError))
      );

      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to import products from CSV');
    }
  }

  // Master catalog lookup
  async lookupMasterProduct(barcode: string): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const response = await firstValueFrom(
        this.http.get<any>(
          `${this.baseUrl}/products/master-catalog?barcode=${barcode}`,
          { headers }
        ).pipe(catchError(this.handleError))
      );
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Product not found in master catalog');
    }
  }

  // Sync endpoints
  async syncOutbox(items: any[]): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const response = await firstValueFrom(
        this.http.post<any>(
          `${this.baseUrl}/sync/outbox`,
          { items },
          { headers }
        ).pipe(catchError(this.handleError))
      );
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sync data');
    }
  }

  async pullUpdates(cursor?: string): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const url = cursor 
        ? `${this.baseUrl}/sync/pull?cursor=${cursor}`
        : `${this.baseUrl}/sync/pull`;
      
      const response = await firstValueFrom(
        this.http.get<any>(url, { headers })
          .pipe(catchError(this.handleError))
      );
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to pull updates');
    }
  }

  // Print jobs
  async getPrintJobs(status: string = 'pending', limit = 20): Promise<any[]> {
    try {
      const headers = await this.getHeaders();
      const response = await firstValueFrom(
        this.http
          .get<any[]>(`${this.baseUrl}/print-jobs?status=${encodeURIComponent(status)}&limit=${limit}`, { headers })
          .pipe(catchError(this.handleError))
      );
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to load print jobs');
    }
  }

  async markPrintJobProcessed(id: string): Promise<void> {
    try {
      const headers = await this.getHeaders();
      await firstValueFrom(
        this.http
          .post(`${this.baseUrl}/print-jobs/${id}/processed`, {}, { headers })
          .pipe(catchError(this.handleError))
      );
    } catch (error: any) {
      throw new Error(error.message || 'Failed to mark print job processed');
    }
  }

  async markPrintJobFailed(id: string, errorMessage: string): Promise<void> {
    try {
      const headers = await this.getHeaders();
      await firstValueFrom(
        this.http
          .post(`${this.baseUrl}/print-jobs/${id}/failed`, { error: errorMessage }, { headers })
          .pipe(catchError(this.handleError))
      );
    } catch (error: any) {
      throw new Error(error.message || 'Failed to mark print job failed');
    }
  }

  // Suppliers
  async getSuppliers(): Promise<any[]> {
    try {
      const headers = await this.getHeaders();
      const response = await firstValueFrom(
        this.http
          .get<any[]>(`${this.baseUrl}/suppliers`, { headers })
          .pipe(catchError(this.handleError))
      );
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to load suppliers');
    }
  }

  async createSupplier(payload: any): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const response = await firstValueFrom(
        this.http
          .post<any>(`${this.baseUrl}/suppliers`, payload, { headers })
          .pipe(catchError(this.handleError))
      );
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create supplier');
    }
  }

  async updateSupplier(id: string, payload: any): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const response = await firstValueFrom(
        this.http
          .put<any>(`${this.baseUrl}/suppliers/${id}`, payload, { headers })
          .pipe(catchError(this.handleError))
      );
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update supplier');
    }
  }

  async deleteSupplier(id: string): Promise<void> {
    try {
      const headers = await this.getHeaders();
      await firstValueFrom(
        this.http
          .delete(`${this.baseUrl}/suppliers/${id}`, { headers })
          .pipe(catchError(this.handleError))
      );
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete supplier');
    }
  }

  // Loyalty
  async getLoyaltyProgram(): Promise<LoyaltyProgram | null> {
    try {
      const headers = await this.getHeaders();
      const response = await firstValueFrom(
        this.http
          .get<LoyaltyProgram | null>(`${this.baseUrl}/loyalty/program`, { headers })
          .pipe(catchError(this.handleError))
      );
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to load loyalty program');
    }
  }

  async saveLoyaltyProgram(payload: LoyaltyProgram): Promise<LoyaltyProgram> {
    try {
      const headers = await this.getHeaders();
      const response = await firstValueFrom(
        this.http
          .post<LoyaltyProgram>(`${this.baseUrl}/loyalty/program`, payload, { headers })
          .pipe(catchError(this.handleError))
      );
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to save loyalty program');
    }
  }

  async getLoyaltyAccount(customerId: string): Promise<LoyaltyAccount | null> {
    try {
      const headers = await this.getHeaders();
      const response = await firstValueFrom(
        this.http
          .get<LoyaltyAccount | null>(`${this.baseUrl}/loyalty/accounts/${encodeURIComponent(customerId)}`, { headers })
          .pipe(catchError(this.handleError))
      );
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to load loyalty account');
    }
  }

  // Promotions
  async getPromotions(): Promise<Promotion[]> {
    try {
      const headers = await this.getHeaders();
      const response = await firstValueFrom(
        this.http
          .get<Promotion[]>(`${this.baseUrl}/promotions`, { headers })
          .pipe(catchError(this.handleError))
      );
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to load promotions');
    }
  }

  async createPromotion(payload: Partial<Promotion>): Promise<Promotion> {
    try {
      const headers = await this.getHeaders();
      const response = await firstValueFrom(
        this.http
          .post<Promotion>(`${this.baseUrl}/promotions`, payload, { headers })
          .pipe(catchError(this.handleError))
      );
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create promotion');
    }
  }

  async updatePromotion(id: string, payload: Partial<Promotion>): Promise<Promotion> {
    try {
      const headers = await this.getHeaders();
      const response = await firstValueFrom(
        this.http
          .put<Promotion>(`${this.baseUrl}/promotions/${encodeURIComponent(id)}`, payload, { headers })
          .pipe(catchError(this.handleError))
      );
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update promotion');
    }
  }

  async deletePromotion(id: string): Promise<void> {
    try {
      const headers = await this.getHeaders();
      await firstValueFrom(
        this.http
          .delete(`${this.baseUrl}/promotions/${encodeURIComponent(id)}`, { headers })
          .pipe(catchError(this.handleError))
      );
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete promotion');
    }
  }
}
