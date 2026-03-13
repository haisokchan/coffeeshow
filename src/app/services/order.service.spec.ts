// services/order.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CartItem } from './cart.service';

// ✅ Export OrderStatus interface
export interface OrderStatus {
  status: 'pending' | 'paid' | 'cancelled';
  paymentStatus?: 'pending' | 'paid' | 'refunded';
}

// ✅ Export Order interface
export interface Order {
  _id: string;
  orderNumber: string;
  customer: any;
  items: Array<{
    product: any;
    qty: number;
    price: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'paid' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentMethod?: string;
  payment?: string;
  paidAmount?: number;
  changeAmount?: number;
  notes?: string;
  createdBy?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = 'http://localhost:3000/api/orders';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  /**
   * Get all orders with optional filters
   */
  getOrders(filters?: {
    page?: number;
    limit?: number;
    status?: string;
    customer?: string;
  }): Observable<any> {
    let url = this.apiUrl;
    
    if (filters) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return this.http.get<any>(url, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get single order by ID
   */
  getOrder(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Create order from cart items
   * @param customerId - Customer ID
   * @param items - Cart items
   * @param notes - Optional order notes
   * @param sendReceipt - Send receipt to Telegram (default: false)
   */
  createOrderFromCart(
    customerId: string,
    items: CartItem[],
    notes?: string,
    sendReceipt: boolean = false
  ): Observable<any> {
    const orderItems = items.map(item => ({
      product: item.product._id,
      qty: item.quantity,
      price: item.product.price
    }));

    const orderData = {
      customer: customerId,
      items: orderItems,
      notes: notes || '',
      sendReceipt: sendReceipt // ✅ Flag to send Telegram receipt
    };

    return this.http.post<any>(this.apiUrl, orderData, {
      headers: this.getHeaders()
    });
  }

  /**
   * Create a custom order
   */
  createOrder(orderData: {
    customer: string;
    items: Array<{ product: string; qty: number; price?: number }>;
    notes?: string;
    sendReceipt?: boolean;
  }): Observable<any> {
    return this.http.post<any>(this.apiUrl, orderData, {
      headers: this.getHeaders()
    });
  }

  /**
   * Update order
   */
  updateOrder(id: string, orderData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, orderData, {
      headers: this.getHeaders()
    });
  }

  /**
   * Update order status
   */
  updateOrderStatus(id: string, statusData: {
    status: string;
    paymentMethod?: string;
    paidAmount?: number;
    changeAmount?: number;
  }): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/status`, statusData, {
      headers: this.getHeaders()
    });
  }

  /**
   * Delete order
   */
  deleteOrder(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get order receipt (optionally send to Telegram)
   */
  getOrderReceipt(id: string, sendToTelegram: boolean = false): Observable<any> {
    const url = `${this.apiUrl}/${id}/receipt?sendToTelegram=${sendToTelegram}`;
    return this.http.get<any>(url, {
      headers: this.getHeaders()
    });
  }

  /**
   * Send order receipt to Telegram
   */
  sendOrderReceipt(id: string, includeImages: boolean = false): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/${id}/send-receipt`,
      { includeImages },
      { headers: this.getHeaders() }
    );
  }
}