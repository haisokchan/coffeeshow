import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type OrderStatus = 'pending' | 'paid' | 'cancelled';

export interface OrderItem {
  product: string | any;
  qty: number;
  price: number;
  name?: string;
}

export interface Order {
  _id?: string;
  orderNumber?: string;
  customer: string | any;
  items: OrderItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
  status: OrderStatus;
  paymentStatus?: 'pending' | 'paid' | 'refunded';
  paymentMethod?: string;
  payment?: string | any;
  paidAmount?: number;
  changeAmount?: number;
  notes?: string;
  createdBy?: string | any;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateOrderPayload {
  customer: string;
  items: Array<{ product: string; qty: number; price?: number }>;
  status?: OrderStatus;
  notes?: string;
}

export interface OrdersResponse {
  success: boolean;
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  // ✅ FIX: use environment variable, not hardcoded URL
  private API = `${environment.apiUrl}/orders`;

  constructor(private http: HttpClient) {}

  getOrders(params?: {
    page?: number;
    limit?: number;
    status?: string | OrderStatus;
    customer?: string;
  }): Observable<OrdersResponse> {
    return this.http.get<OrdersResponse>(this.API, { params: params as any });
  }

  getOrder(id: string): Observable<{ success: boolean; order: Order }> {
    return this.http.get<{ success: boolean; order: Order }>(`${this.API}/${id}`);
  }

  createOrder(payload: CreateOrderPayload): Observable<any> {
    return this.http.post<any>(this.API, payload);
  }

  updateOrder(id: string, payload: Partial<CreateOrderPayload>): Observable<any> {
    return this.http.put<any>(`${this.API}/${id}`, payload);
  }

  updateOrderStatus(id: string, status: OrderStatus): Observable<any> {
    return this.http.patch<any>(`${this.API}/${id}/status`, { status });
  }

  deleteOrder(id: string): Observable<any> {
    return this.http.delete<any>(`${this.API}/${id}`);
  }

  createOrderFromCart(
    customerId: string,
    cartItems: Array<{ product: any; quantity: number }>,
    notes?: string,
    sendOrderReceipt?: any
  ): Observable<any> {
    const items = cartItems.map(item => ({
      product: item.product._id || item.product,
      qty: item.quantity,
      price: item.product.price
    }));

    const payload: CreateOrderPayload = {
      customer: customerId,
      items,
      status: 'pending',
      notes: notes || ''
    };

    return this.createOrder(payload);
  }
}