import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PaymentService } from '../services/payment.service';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './payment.html',
})
// ✅ FIX: class must implement OnInit — without this, ngOnInit() is declared
// but Angular's lifecycle hook contract is broken at compile time in strict mode.
export class PaymentComponent implements OnInit {
  payments = signal<any[]>([]);
  loading = signal(true);
  stats = signal({
    total: 0,
    completed: 0,
    pending: 0,
    refunded: 0,
    totalAmount: 0
  });

  constructor(private paymentService: PaymentService) {}

  ngOnInit(): void {
    this.loadPayments();
  }

  loadPayments(): void {
    this.loading.set(true);
    this.paymentService.getPayments().subscribe({
      next: (response) => {
        const paymentList = response.payments || response || [];
        this.payments.set(paymentList);
        this.calculateStats(paymentList);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading payments:', err);
        this.loading.set(false);
      }
    });
  }

  calculateStats(payments: any[]): void {
    const completed = payments.filter(p => p.status === 'completed').length;
    const pending = payments.filter(p => p.status === 'pending').length;
    const refunded = payments.filter(p => p.status === 'refunded').length;
    const totalAmount = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    this.stats.set({ total: payments.length, completed, pending, refunded, totalAmount });
  }

  formatMoney(value: any): string {
    return (Number(value) || 0).toFixed(2);
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  showRefundDialog(payment: any): void {
    const reason = prompt('Enter refund reason:');
    if (reason) {
      this.processRefund(payment._id, reason);
    }
  }

  processRefund(paymentId: string, reason: string): void {
    this.paymentService.processRefund(paymentId, { reason }).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Refund processed successfully');
          this.loadPayments();
        }
      },
      error: (err) => {
        alert('Error processing refund: ' + (err.error?.message || 'Unknown error'));
      }
    });
  }
}