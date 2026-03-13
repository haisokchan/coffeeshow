import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type PaymentTerms = 'COD' | 'Net 7' | 'Net 15' | 'Net 30' | 'Net 60';

export interface Supplier {
  _id?: string;
  name: string;
  companyName?: string;
  phone: string;
  email?: string;
  address?: string;
  contactPerson?: string;
  website?: string;
  taxNumber?: string;
  paymentTerms?: PaymentTerms;
  creditLimit?: number;
  productsSupplied?: any[];
  totalPurchases?: number;
  totalOrders?: number;
  avgOrderValue?: number;
  lastOrderDate?: Date;
  isPreferred?: boolean;
  isActive?: boolean;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  productStats?: {
    totalProducts: number;
    totalStock: number;
    totalValue: number;
    avgPrice: number;
    lowStockCount?: number;
  };
}

@Injectable({ providedIn: 'root' })
export class SupplierService {
  // ✅ FIX: use environment variable, not hardcoded URL
  private baseUrl = `${environment.apiUrl}/suppliers`;

  constructor(private http: HttpClient) {}

  getSuppliers(filters?: {
    q?: string;
    page?: number;
    limit?: number;
    isActive?: boolean;
    isPreferred?: boolean;
  }): Observable<any> {
    let params = new HttpParams();
    if (filters?.q) params = params.set('q', filters.q);
    if (filters?.page) params = params.set('page', String(filters.page));
    if (filters?.limit) params = params.set('limit', String(filters.limit));
    if (filters?.isActive !== undefined) params = params.set('isActive', String(filters.isActive));
    if (filters?.isPreferred !== undefined) params = params.set('isPreferred', String(filters.isPreferred));
    return this.http.get<any>(this.baseUrl, { params });
  }

  getSupplier(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`);
  }

  getSupplierStats(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}/stats`);
  }

  createSupplier(supplier: Supplier): Observable<any> {
    return this.http.post<any>(this.baseUrl, supplier);
  }

  updateSupplier(id: string, supplier: Partial<Supplier>): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, supplier);
  }

  deactivateSupplier(id: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${id}/deactivate`, {});
  }

  activateSupplier(id: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${id}/activate`, {});
  }

  deleteSupplier(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`);
  }
}