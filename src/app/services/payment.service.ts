// services/payment.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  // ✅ FIX: use environment variable, not hardcoded URL
  private apiUrl = `${environment.apiUrl}/payments`;

  constructor(private http: HttpClient) {}

  // ✅ FIX: removed manual getHeaders() — auth interceptor should attach the token.
  // Manually reading localStorage for the token here duplicates logic and uses
  // a different key ('token') than AuthService uses ('managecoffee_token'),
  // so the Authorization header was always empty in production.

  /**
   * Process a payment with optional Telegram receipt
   */
  processPayment(paymentData: {
    orderId: string;
    amount: number;
    paymentMethod: string;
    cardDetails?: any;
    mobileWallet?: any;
    cashDetails?: any;
    sendReceipt?: boolean;
  }): Observable<any> {
    return this.http.post<any>(this.apiUrl, paymentData);
  }

  /**
   * Get all payments
   */
  getPayments(filters?: {
    status?: string;
    paymentMethod?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Observable<any> {
    // ✅ FIX: use HttpParams instead of manual URLSearchParams string building
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }
    return this.http.get<any>(this.apiUrl, { params });
  }

  /**
   * Get single payment by ID
   */
  getPayment(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  /**
   * Process a refund
   */
  processRefund(paymentId: string, refundData: {
    amount?: number;
    reason: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${paymentId}/refund`, refundData);
  }

  /**
   * Get payment statistics
   */
  getPaymentStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats/overview`);
  }
}