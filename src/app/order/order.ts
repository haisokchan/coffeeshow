import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { OrderService, OrderStatus } from '../services/order.service';
import { CustomerService } from '../services/customer.service';
import { ProductService } from '../services/product.service';
import { PaymentService } from '../services/payment.service';

type CustomerLite = {
  _id: string;
  name: string;
  phone: string;
  email?: string;
};

type ProductLite = {
  _id: string;
  name: string;
  category?: string;
  price?: number;
  stock?: number;
};

type OrderItemUI = {
  productId: string;
  name: string;
  category?: string;
  price: number;
  qty: number;
};

@Component({
  selector: 'app-order',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './order.html',
})
export class OrdersComponent {
  loading = false;
  paymentLoading = false;
  error = '';
  success = '';

  products = signal<ProductLite[]>([]);
  customers = signal<CustomerLite[]>([]);
  orders = signal<any[]>([]);

  statusFilter: '' | OrderStatus = '';
  page = 1;
  limit = 25;

  items = signal<OrderItemUI[]>([]);
  selectedProductId = '';
  addQty = 1;
  addPrice: number | null = null;

  form!: FormGroup;
  paymentForm!: FormGroup;
  
  showPaymentModal = false;
  selectedOrder: any = null;

  totalQty = computed(() => 
    this.items().reduce((s, it) => s + (Number(it.qty) || 0), 0)
  );
  
  subtotal = computed(() => 
    this.items().reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0)
  );
  
  total = computed(() => this.subtotal());
  Math: any;

  constructor(
    private fb: FormBuilder,
    private ordersApi: OrderService,
    private customersApi: CustomerService,
    private productsApi: ProductService,
    private paymentsApi: PaymentService
  ) {
    this.form = this.fb.group({
      customerId: ['', Validators.required],
      notes: [''],
    });

    this.paymentForm = this.fb.group({
      paymentMethod: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0)]],
      cardHolderName: [''],
      cardLast4: [''],
      walletProvider: [''],
      walletPhone: [''],
    });

    this.loadProducts();
    this.loadCustomers();
    this.loadOrders();
  }

  private apiError(e: any, fallback: string): string {
    console.error('API Error:', e);
    return e?.error?.error || e?.error?.message || e?.message || fallback;
  }

  private showSuccess(msg: string) {
    this.success = msg;
    setTimeout(() => this.success = '', 5000);
  }

  // ---------------- LOADERS ----------------
  loadProducts() {
    this.productsApi.getProducts('', '').subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res?.products;
        this.products.set(list || []);
        console.log('✅ Products loaded:', this.products().length);
      },
      error: (e) => {
        this.error = this.apiError(e, 'Failed to load products');
      },
    });
  }

  loadCustomers() {
    this.customersApi.getCustomers('').subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res?.customers;
        this.customers.set(list || []);
        console.log('✅ Customers loaded:', this.customers().length);
      },
      error: (e) => {
        this.error = this.apiError(e, 'Failed to load customers');
      },
    });
  }

  loadOrders() {
    this.error = '';
    this.ordersApi
      .getOrders({
        status: this.statusFilter,
        page: this.page,
        limit: this.limit,
      })
      .subscribe({
        next: (res: any) => {
          const list = Array.isArray(res) ? res : res?.orders;
          this.orders.set(list || []);
          console.log('✅ Orders loaded:', this.orders().length);
        },
        error: (e) => {
          this.error = this.apiError(e, 'Failed to load orders');
        },
      });
  }

  // ---------------- CART ----------------
  onProductSelect() {
    if (!this.selectedProductId) return;
    
    const p = this.products().find((x) => x._id === this.selectedProductId);
    if (p && p.price) {
      this.addPrice = p.price;
    }
  }

  addItem() {
    if (!this.selectedProductId) {
      this.error = 'Please select a product';
      return;
    }

    const p = this.products().find((x) => x._id === this.selectedProductId);
    if (!p) {
      this.error = 'Product not found';
      return;
    }

    const qty = Math.max(1, Number(this.addQty || 1));
    const price =
      this.addPrice === null || this.addPrice === undefined || (this.addPrice as any) === ''
        ? Number(p.price || 0)
        : Math.max(0, Number(this.addPrice));

    const found = this.items().find((x) => x.productId === p._id);
    
    if (found) {
      this.items.set(
        this.items().map((x) =>
          x.productId === p._id 
            ? { ...x, qty: x.qty + qty, price } 
            : x
        )
      );
      alert(`✓ ${p.name} quantity updated in cart (${found.qty + qty} items)`);
    } else {
      this.items.set([
        ...this.items(),
        {
          productId: p._id,
          name: p.name,
          category: p.category,
          price,
          qty,
        },
      ]);
      alert(`🛒 ${p.name} added to cart successfully!`);
    }

    this.error = '';
    this.selectedProductId = '';
    this.addQty = 1;
    this.addPrice = null;
  }

  changeQty(productId: string, qty: any) {
    const q = Math.max(1, Number(qty || 1));
    this.items.set(
      this.items().map((x) => 
        x.productId === productId ? { ...x, qty: q } : x
      )
    );
  }

  changePrice(productId: string, price: any) {
    const p = Math.max(0, Number(price || 0));
    this.items.set(
      this.items().map((x) => 
        x.productId === productId ? { ...x, price: p } : x
      )
    );
  }

  removeItem(productId: string) {
    const item = this.items().find(x => x.productId === productId);
    this.items.set(this.items().filter((x) => x.productId !== productId));
    if (item) {
      this.showSuccess(`Removed ${item.name} from cart`);
    }
  }

  clearCart() {
    if (this.items().length === 0) return;
    
    if (confirm('Clear all items from cart?')) {
      this.items.set([]);
      this.error = '';
      this.showSuccess('Cart cleared');
    }
  }

  // ---------------- CREATE ORDER ----------------
  saveOrder() {
    if (this.form.invalid) {
      this.error = 'Please select a customer';
      return;
    }
    
    if (this.items().length === 0) {
      this.error = 'Please add at least one product to the cart';
      return;
    }

    this.loading = true;
    this.error = '';

    const payload = {
      customer: this.form.value['customerId'],
      items: this.items().map((it) => ({
        product: it.productId,
        qty: it.qty,
        price: it.price,
      })),
      status: 'pending' as OrderStatus,
      notes: this.form.value['notes'] || '',
    };

    console.log('📤 Creating order:', payload);

    this.ordersApi.createOrder(payload).subscribe({
      next: (res) => {
        this.loading = false;
        console.log('✅ Order created:', res);
        
        alert(`✅ Order #${res.orderNumber || 'created'} placed successfully!\n\nTotal: $${this.formatMoney(this.total())}`);
        
        this.clearCart();
        this.form.reset({ customerId: '', notes: '' });
        this.loadOrders();
      },
      error: (e) => {
        this.loading = false;
        this.error = this.apiError(e, 'Failed to create order');
        console.error('❌ Order creation failed:', e);
      },
    });
  }

  // ---------------- PAYMENT ----------------
  canProcessPayment(order: any): boolean {
    return (
      order.status === 'pending' && 
      order.paymentStatus !== 'paid' &&
      order.paymentStatus !== 'refunded'
    );
  }

  openPaymentModal(order: any) {
    this.selectedOrder = order;
    this.showPaymentModal = true;
    this.error = '';
    
    const orderTotal = this.getOrderTotal(order);
    this.paymentForm.patchValue({
      paymentMethod: '',
      amount: orderTotal,
      cardHolderName: '',
      cardLast4: '',
      walletProvider: '',
      walletPhone: '',
    });
  }

  closePaymentModal() {
    this.showPaymentModal = false;
    this.selectedOrder = null;
    this.paymentForm.reset();
    this.error = '';
  }

  processPayment() {
    if (this.paymentForm.invalid || !this.selectedOrder) {
      this.error = 'Please fill all required fields';
      return;
    }

    const orderTotal = this.getOrderTotal(this.selectedOrder);
    const amount = Number(this.paymentForm.value.amount);

    if (amount < orderTotal) {
      this.error = `Payment amount ($${amount.toFixed(2)}) is less than order total ($${orderTotal.toFixed(2)})`;
      return;
    }

    this.paymentLoading = true;
    this.error = '';

    const paymentData: any = {
      orderId: this.selectedOrder._id,
      amount: amount,
      paymentMethod: this.paymentForm.value.paymentMethod,
    };

    // Add method-specific details
    if (paymentData.paymentMethod === 'cash') {
      paymentData.cashDetails = {
        receivedAmount: amount,
      };
    } else if (paymentData.paymentMethod === 'credit-card' || paymentData.paymentMethod === 'debit-card') {
      paymentData.cardDetails = {
        cardType: paymentData.paymentMethod === 'credit-card' ? 'Credit' : 'Debit',
        last4: this.paymentForm.value.cardLast4 || '',
        holderName: this.paymentForm.value.cardHolderName || '',
      };
    } else if (paymentData.paymentMethod === 'mobile-wallet') {
      paymentData.mobileWallet = {
        provider: this.paymentForm.value.walletProvider || '',
        phone: this.paymentForm.value.walletPhone || '',
      };
    }

    console.log('📤 Processing payment:', paymentData);

    this.paymentsApi.processPayment(paymentData).subscribe({
      next: (res) => {
        this.paymentLoading = false;
        console.log('✅ Payment processed:', res);
        
        const change = amount - orderTotal;
        let msg = `💳 Payment completed successfully!\n\nAmount Paid: $${amount.toFixed(2)}`;
        if (change > 0) {
          msg += `\nChange: $${change.toFixed(2)}`;
        }
        
        alert(msg);
        this.closePaymentModal();
        this.loadOrders();
      },
      error: (e) => {
        this.paymentLoading = false;
        this.error = this.apiError(e, 'Failed to process payment');
        console.error('❌ Payment failed:', e);
      },
    });
  }

  // ---------------- ORDER ACTIONS ----------------
  viewOrderDetails(order: any) {
    const items = order.items?.map((it: any) => 
      `${it.product?.name || it.name || 'Product'} × ${it.qty} = $${this.formatMoney((it.price || 0) * (it.qty || 0))}`
    ).join('\n') || 'No items';

    const msg = `Order Details:
━━━━━━━━━━━━━━━━━━━━━━
Customer: ${order.customer?.name || 'N/A'}
Order #: ${order.orderNumber || 'N/A'}
Status: ${this.getOrderDisplayStatus(order)}
Created: ${this.formatDate(order.createdAt)}
━━━━━━━━━━━━━━━━━━━━━━
Items:
${items}
━━━━━━━━━━━━━━━━━━━━━━
Total: $${this.formatMoney(this.getOrderTotal(order))}`;

    alert(msg);
  }

  deleteOrder(orderId: string) {
    if (!confirm('Are you sure you want to delete this order?')) {
      return;
    }

    console.log('🗑️ Deleting order:', orderId);

    this.ordersApi.deleteOrder(orderId).subscribe({
      next: () => {
        console.log('✅ Order deleted');
        this.showSuccess('Order deleted successfully');
        this.loadOrders();
      },
      error: (e) => {
        this.error = this.apiError(e, 'Failed to delete order');
        console.error('❌ Delete failed:', e);
      },
    });
  }

  // ---------------- HELPERS ----------------
  formatMoney(n: any): string {
    return Number(n || 0).toFixed(2);
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getOrderTotal(o: any): number {
    if (typeof o?.total === 'number') return o.total;
    if (typeof o?.subtotal === 'number') return o.subtotal;
    if (Array.isArray(o?.items)) {
      return o.items.reduce(
        (s: number, it: any) => s + Number(it.price || 0) * Number(it.qty || 0), 
        0
      );
    }
    return 0;
  }

  getOrderQty(o: any): number {
    if (typeof o?.totalQty === 'number') return o.totalQty;
    if (Array.isArray(o?.items)) {
      return o.items.reduce(
        (s: number, it: any) => s + Number(it.qty || 0), 
        0
      );
    }
    return 0;
  }

  getOrderDisplayStatus(order: any): string {
    if (order.paymentStatus === 'paid' || order.status === 'paid') {
      return 'Paid';
    }
    if (order.paymentStatus === 'refunded' || order.status === 'cancelled') {
      return order.status === 'cancelled' ? 'Cancelled' : 'Refunded';
    }
    return 'Pending';
  }
}