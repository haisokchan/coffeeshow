import { Injectable } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ProductService } from './product.service';
import { CustomerService } from './customer.service';
import { OrderService } from './order.service';
import { SupplierService } from './supplier.service';
import { PaymentService } from './payment.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(
    private products: ProductService,
    private customers: CustomerService,
    private orders: OrderService,
    private suppliers: SupplierService,
    private payments: PaymentService
  ) {}

  getStats() {
    return forkJoin({
      product: this.products.getProducts('', '').pipe(
        catchError(() => of({ products: [], total: 0, totalQty: 0, totalValue: 0 }))
      ),
      customer: this.customers.getCustomers('').pipe(
        catchError(() => of({ customers: [], totalActive: 0, totalVIP: 0 }))
      ),
      order: this.orders.getOrders({}).pipe(
        catchError(() => of({ orders: [], total: 0 }))
      ),
      supplier: this.suppliers.getSuppliers({ limit: 100 }).pipe(
        catchError(() => of({ data: [], meta: { total: 0 } }))
      ),
      payment: this.payments.getPayments().pipe(
        catchError(() => of({ payments: [], total: 0 }))
      )
    }).pipe(
      map(({ product, customer, order, supplier, payment }) => {
        // Parse products
        const productList = Array.isArray(product) ? product : (product?.products || []);
        const productTotal = product?.total ?? productList.length;
        const productQty = product?.totalQty ?? productList.reduce((s: number, p: any) => s + (Number(p.stock) || 0), 0);
        const productAmount = product?.totalValue ?? productList.reduce((s: number, p: any) => s + (Number(p.price) || 0) * (Number(p.stock) || 0), 0);

        // Parse customers
        const customerList = Array.isArray(customer) ? customer : (customer?.customers || []);
        const customerTotal = customer?.totalActive ?? customerList.length;
        const customerVIP = customer?.totalVIP ?? customerList.filter((c: any) => c.vip).length;

        // Parse orders
        const orderList = Array.isArray(order) ? order : (order?.orders || []);
        const orderTotal = order?.total ?? orderList.length;

        // Parse payments
        const paymentList = Array.isArray(payment) ? payment : (payment?.payments || []);
        
        // Create a map of order IDs to their payment status
        const orderPaymentMap = new Map<string, any>();
        paymentList.forEach((p: any) => {
          const orderId = typeof p.order === 'string' ? p.order : p.order?._id;
          if (orderId) {
            orderPaymentMap.set(orderId, p);
          }
        });

        // Enhance orders with payment information
        const enhancedOrders = orderList.map((o: any) => {
          const payment = orderPaymentMap.get(o._id);
          return {
            ...o,
            paymentInfo: payment || null,
            isPaid: payment?.status === 'completed' || o.paymentStatus === 'paid',
            isRefunded: payment?.status === 'refunded'
          };
        });
        
        // Calculate today's date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Filter today's orders
        const todayOrders = enhancedOrders.filter((o: any) => {
          const orderDate = new Date(o.createdAt);
          return orderDate >= today;
        });

        // Calculate today's sales from PAID orders only
        const todaySales = todayOrders
          .filter((o: any) => o.isPaid && !o.isRefunded)
          .reduce((sum: number, o: any) => {
            const total = o.total || o.subtotal || 0;
            return sum + Number(total);
          }, 0);

        // Count orders by status
        const pendingOrders = enhancedOrders.filter((o: any) => 
          o.status === 'pending' && !o.isPaid
        ).length;
        
        const paidOrders = enhancedOrders.filter((o: any) => 
          o.isPaid && !o.isRefunded
        ).length;

        const cancelledOrders = enhancedOrders.filter((o: any) => 
          o.status === 'cancelled' || o.isRefunded
        ).length;

        // Parse suppliers - UPDATED to handle new response format
        const supplierData = supplier?.data || supplier?.suppliers || [];
        const supplierList = Array.isArray(supplierData) ? supplierData : [];
        const supplierTotal = supplier?.meta?.total ?? supplierList.length;
        
        // Calculate supplier statistics
        const supplierActive = supplierList.filter((s: any) => s.isActive).length;
        const supplierPreferred = supplierList.filter((s: any) => s.isPreferred).length;
        const supplierInactive = supplierList.filter((s: any) => !s.isActive).length;
        
        const supplierPurchases = supplierList.reduce((sum: number, s: any) => {
          return sum + (Number(s.totalPurchases) || 0);
        }, 0);

        // Get top suppliers by purchase amount
        const topSuppliers = supplierList
          .sort((a: any, b: any) => {
            const aTotal = Number(a.totalPurchases) || 0;
            const bTotal = Number(b.totalPurchases) || 0;
            return bTotal - aTotal;
          })
          .slice(0, 5);

        // Get recent suppliers (last 5 created)
        const recentSuppliers = supplierList
          .sort((a: any, b: any) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          })
          .slice(0, 5);

        // Payment statistics
        const paymentTotal = paymentList.length;
        
        const todayPayments = paymentList.filter((p: any) => {
          const paymentDate = new Date(p.createdAt);
          return paymentDate >= today;
        });

        const todayPaymentTotal = todayPayments
          .filter((p: any) => p.status === 'completed')
          .reduce((sum: number, p: any) => {
            return sum + Number(p.amount || 0);
          }, 0);

        const pendingPayments = paymentList.filter((p: any) => p.status === 'pending').length;
        const completedPayments = paymentList.filter((p: any) => p.status === 'completed').length;
        const refundedPayments = paymentList.filter((p: any) => p.status === 'refunded').length;

        // Get recent orders (last 5) with payment info
        const recentOrders = enhancedOrders
          .sort((a: any, b: any) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA;
          })
          .slice(0, 5);

        // Get recent payments (last 5) with order info
        const recentPayments = paymentList
          .sort((a: any, b: any) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA;
          })
          .slice(0, 5);

        return {
          products: {
            items: productTotal,
            qty: productQty,
            amount: Number(productAmount.toFixed(2)),
          },
          customers: {
            total: customerTotal,
            vip: customerVIP,
          },
          orders: {
            total: orderTotal,
            pending: pendingOrders,
            paid: paidOrders,
            cancelled: cancelledOrders,
            todaySales: Number(todaySales.toFixed(2)),
          },
          suppliers: {
            total: supplierTotal,
            active: supplierActive,
            inactive: supplierInactive,
            preferred: supplierPreferred,
            purchases: Number(supplierPurchases.toFixed(2)),
            avgPurchasePerSupplier: supplierTotal > 0 ? Number((supplierPurchases / supplierTotal).toFixed(2)) : 0
          },
          payments: {
            total: paymentTotal,
            pending: pendingPayments,
            completed: completedPayments,
            refunded: refundedPayments,
            todayTotal: Number(todayPaymentTotal.toFixed(2))
          },
          recentOrders,
          recentPayments,
          topSuppliers,
          recentSuppliers
        };
      })
    );
  }
}