import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { StorageService } from './storage.service';

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
}
