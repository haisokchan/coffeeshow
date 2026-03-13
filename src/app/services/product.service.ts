import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Product {
  _id?: string;
  name: string;
  description?: string;
  category: 'Coffee' | 'Tea' | 'Drink' | 'Food' | 'Dessert';
  price: number;
  stock?: number;
  minStock?: number;
  image?: string;
  isAvailable?: boolean;
  supplier?: any;
  supplierDetails?: {
    name?: string;
    phone?: string;
    lastSupplyDate?: Date;
  };
  createdBy?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProductsResponse {
  success: boolean;
  total: number;
  totalQty: number;
  totalValue: number;
  products: Product[];
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  // ✅ FIX: use environment variable, not hardcoded URL
  private API = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) {}

  getProducts(search = '', category = '', supplier = ''): Observable<ProductsResponse> {
    const params: any = {};
    if (search) params.search = search;
    if (category) params.category = category;
    if (supplier) params.supplier = supplier;
    return this.http.get<ProductsResponse>(this.API, { params });
  }

  getProductsBySupplier(supplierId: string): Observable<any> {
    return this.http.get<any>(`${this.API}/supplier/${supplierId}`);
  }

  createProduct(body: Partial<Product>) {
    return this.http.post<any>(this.API, body);
  }

  updateProduct(id: string, body: Partial<Product>) {
    return this.http.put<any>(`${this.API}/${id}`, body);
  }

  deleteProduct(id: string) {
    return this.http.delete<any>(`${this.API}/${id}`);
  }
}