import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Customer {
  _id?: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  favoriteProducts?: any[];
}

@Injectable({ providedIn: 'root' })
export class CustomerService {
  // ✅ FIX: use environment variable, not hardcoded URL
  private API = `${environment.apiUrl}/customers`;

  constructor(private http: HttpClient) {}

  getCustomers(search = ''): Observable<any> {
    const params: any = {};
    if (search) params.search = search;
    return this.http.get<any>(this.API, { params });
  }

  createCustomer(body: Partial<Customer>) {
    return this.http.post<any>(this.API, body);
  }

  updateCustomer(id: string, body: Partial<Customer>) {
    return this.http.put<any>(`${this.API}/${id}`, body);
  }

  deactivateCustomer(id: string) {
    return this.http.delete<any>(`${this.API}/${id}`);
  }

  setFavorites(id: string, productIds: string[]) {
    return this.http.put<any>(`${this.API}/${id}/favorites`, { productIds });
  }
}