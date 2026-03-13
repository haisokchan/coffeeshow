import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { DashboardService } from '../services/dashboard.service';
import { ThemeService } from '../services/them.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
})
export class DashboardComponent {
  private auth = inject(AuthService);
  private dash = inject(DashboardService);
  // ✅ FIX: inject Router so doLogout can navigate after logout
  private router = inject(Router);
  public themeService = inject(ThemeService);

  loading = false;
  user = this.auth.user;

  productItems = signal(0);
  productQty = signal(0);
  productAmount = signal(0);

  customerTotal = signal(0);
  customerVIP = signal(0);

  orderTotal = signal(0);
  orderPending = signal(0);
  orderPaid = signal(0);
  orderCancelled = signal(0);
  todaySales = signal(0);
  recentOrders = signal<any[]>([]);

  supplierTotal = signal(0);
  supplierActive = signal(0);
  supplierInactive = signal(0);
  supplierPreferred = signal(0);
  supplierPurchases = signal(0);
  supplierAvgPurchase = signal(0);
  topSuppliers = signal<any[]>([]);
  recentSuppliers = signal<any[]>([]);

  paymentTotal = signal(0);
  paymentPending = signal(0);
  paymentCompleted = signal(0);
  paymentRefunded = signal(0);
  paymentTodayTotal = signal(0);
  recentPayments = signal<any[]>([]);

  constructor() {
    this.loadStats();
  }

  canManageUsers(): boolean {
    return this.auth.canManageUsers();
  }

  loadStats() {
    this.dash.getStats().subscribe({
      next: (s) => {
        this.productItems.set(s.products?.items ?? 0);
        this.productQty.set(s.products?.qty ?? 0);
        this.productAmount.set(s.products?.amount ?? 0);

        this.customerTotal.set(s.customers?.total ?? 0);
        this.customerVIP.set(s.customers?.vip ?? 0);

        this.orderTotal.set(s.orders?.total ?? 0);
        this.orderPending.set(s.orders?.pending ?? 0);
        this.orderPaid.set(s.orders?.paid ?? 0);
        this.orderCancelled.set(s.orders?.cancelled ?? 0);
        this.todaySales.set(s.orders?.todaySales ?? 0);
        this.recentOrders.set(s.recentOrders ?? []);

        this.supplierTotal.set(s.suppliers?.total ?? 0);
        this.supplierActive.set(s.suppliers?.active ?? 0);
        this.supplierInactive.set(s.suppliers?.inactive ?? 0);
        this.supplierPreferred.set(s.suppliers?.preferred ?? 0);
        this.supplierPurchases.set(s.suppliers?.purchases ?? 0);
        this.supplierAvgPurchase.set(s.suppliers?.avgPurchasePerSupplier ?? 0);
        this.topSuppliers.set(s.topSuppliers ?? []);
        this.recentSuppliers.set(s.recentSuppliers ?? []);

        this.paymentTotal.set(s.payments?.total ?? 0);
        this.paymentPending.set(s.payments?.pending ?? 0);
        this.paymentCompleted.set(s.payments?.completed ?? 0);
        this.paymentRefunded.set(s.payments?.refunded ?? 0);
        this.paymentTodayTotal.set(s.payments?.todayTotal ?? 0);
        this.recentPayments.set(s.recentPayments ?? []);
      },
      error: (err) => {
        console.error('Error loading dashboard stats:', err);
      },
    });
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

  formatDateShort(date: any): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  getCustomerName(order: any): string {
    return order?.customer?.name || order?.customer?.username || order?.customerName || 'Guest';
  }

  getOrderTotal(order: any): number {
    return Number(order?.total || order?.subtotal || 0);
  }

  getPaymentMethod(payment: any): string {
    return (payment?.paymentMethod || 'unknown').replace('-', ' ');
  }

  getPaymentStatus(payment: any): string {
    return payment?.status || 'pending';
  }

  getOrderPaymentStatus(order: any): string {
    if (order?.isRefunded) return 'refunded';
    if (order?.isPaid) return 'paid';
    if (order?.paymentInfo) return order.paymentInfo.status;
    return order?.status || 'pending';
  }

  hasPayment(order: any): boolean {
    return !!order?.paymentInfo || order?.isPaid;
  }

  doLogout() {
    this.loading = true;
    // ✅ FIX: logout() returns an Observable — must subscribe; the original
    // code called it without subscribing so the HTTP request never fired.
    this.auth.logout().subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/login']);
      },
      error: () => {
        // Even if the server call fails, clear session and redirect
        this.loading = false;
        this.auth.clearSession();
        this.router.navigate(['/login']);
      }
    });
  }
}