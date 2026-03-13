import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CartService, CartItem } from '../services/cart.service';
import { OrderService } from '../services/order.service';
import { CustomerService } from '../services/customer.service';
import { PaymentService } from '../services/payment.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './checkout.html',
})
export class CheckoutComponent implements OnInit {
  cartItems: CartItem[] = [];
  customers = signal<any[]>([]);
  
  checkoutForm!: FormGroup;
  paymentForm!: FormGroup;
  
  loading = false;
  error = '';
  success = '';
  
  currentStep: 'customer' | 'review' | 'payment' = 'customer';
  createdOrder: any = null;
  Math = Math;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private cartService: CartService,
    private orderService: OrderService,
    private customerService: CustomerService,
    private paymentService: PaymentService
  ) {
    this.checkoutForm = this.fb.group({
      customerId: ['', Validators.required],
      notes: [''],
      sendOrderReceipt: [false] // ✅ Send order creation receipt to Telegram
    });

    this.paymentForm = this.fb.group({
      paymentMethod: ['cash', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],
      cardHolderName: [''],
      cardLast4: [''],
      cardType: [''],
      walletProvider: [''],
      walletPhone: [''],
      walletTxnId: [''],
      sendPaymentReceipt: [true] // ✅ Send payment receipt to Telegram (default: true)
    });
  }

  ngOnInit() {
    this.loadCart();
    this.loadCustomers();
  }

  loadCart() {
    this.cartItems = this.cartService.getCart();
    if (this.cartItems.length === 0) {
      alert('Your cart is empty. Redirecting to products...');
      this.router.navigate(['/product']);
    }
  }

  loadCustomers() {
    this.customerService.getCustomers('').subscribe({
      next: (res: any) => {
        this.customers.set(res?.customers || res || []);
      },
      error: (e) => {
        this.error = 'Failed to load customers';
        console.error(e);
      }
    });
  }

  getSubtotal(): number {
    return this.cartService.getSubtotal();
  }

  getTax(): number {
    return this.cartService.getTax();
  }

  getTotal(): number {
    return this.cartService.getTotal();
  }

  getTotalItems(): number {
    return this.cartService.getItemCount();
  }

  getSelectedCustomerName(): string {
    const customerId = this.checkoutForm.value.customerId;
    const customer = this.customers().find(c => c._id === customerId);
    return customer ? `${customer.name} - ${customer.phone}` : '';
  }

  nextToReview() {
    if (this.checkoutForm.invalid) {
      this.error = 'Please select a customer';
      return;
    }
    
    this.currentStep = 'review';
    this.error = '';
  }

  backToCustomer() {
    this.currentStep = 'customer';
  }

  /**
   * Create order with optional Telegram receipt
   */
  
  createOrder() {
    if (this.checkoutForm.invalid || this.cartItems.length === 0) {
      this.error = 'Invalid order data';
      return;
    }

    this.loading = true;
    this.error = '';

    const customerId = this.checkoutForm.value.customerId;
    const notes = this.checkoutForm.value.notes || '';
    const sendOrderReceipt = this.checkoutForm.value.sendOrderReceipt || false;

    // ✅ Create order with Telegram receipt option
    this.orderService.createOrderFromCart(
      customerId, 
      this.cartItems, 
      notes,
      sendOrderReceipt // Send order receipt to Telegram if checked
    ).subscribe({
      next: (res) => {
        this.loading = false;
        this.createdOrder = res.order || res;
        this.currentStep = 'payment';
        
        // Set payment amount to order total
        this.paymentForm.patchValue({
          amount: this.getTotal()
        });
        
        console.log('✅ Order created:', this.createdOrder);
        
        // Show confirmation if Telegram receipt was sent
        if (sendOrderReceipt && res.receiptSent) {
          console.log('✅ Order receipt sent to Telegram');
        }
      },
      error: (e) => {
        this.loading = false;
        this.error = e?.error?.error || e?.error?.message || 'Failed to create order';
        console.error('❌ Order creation failed:', e);
      }
    });
  }

  /**
   * Process payment with optional Telegram receipt
   */
  processPayment() {
    if (this.paymentForm.invalid || !this.createdOrder) {
      this.error = 'Please fill all required payment fields';
      return;
    }

    const orderTotal = this.createdOrder.total || this.getTotal();
    const amount = Number(this.paymentForm.value.amount);

    if (amount < orderTotal) {
      this.error = `Payment amount ($${amount.toFixed(2)}) is less than order total ($${orderTotal.toFixed(2)})`;
      return;
    }

    this.loading = true;
    this.error = '';

    const paymentData: any = {
      orderId: this.createdOrder._id,
      amount: amount,
      paymentMethod: this.paymentForm.value.paymentMethod,
      sendReceipt: this.paymentForm.value.sendPaymentReceipt // ✅ Send payment receipt to Telegram
    };

    // Add method-specific details
    if (paymentData.paymentMethod === 'cash') {
      paymentData.cashDetails = {
        receivedAmount: amount,
        changeAmount: amount - orderTotal
      };
    } else if (paymentData.paymentMethod === 'credit-card' || paymentData.paymentMethod === 'debit-card') {
      paymentData.cardDetails = {
        cardType: this.paymentForm.value.cardType || (paymentData.paymentMethod === 'credit-card' ? 'Credit' : 'Debit'),
        last4: this.paymentForm.value.cardLast4 || '',
        holderName: this.paymentForm.value.cardHolderName || ''
      };
    } else if (paymentData.paymentMethod === 'mobile-wallet') {
      paymentData.mobileWallet = {
        provider: this.paymentForm.value.walletProvider || '',
        phone: this.paymentForm.value.walletPhone || '',
        txnId: this.paymentForm.value.walletTxnId || ''
      };
    }

    // ✅ Process payment with Telegram receipt option
    this.paymentService.processPayment(paymentData).subscribe({
      next: (res) => {
        this.loading = false;
        const change = amount - orderTotal;
        
        let msg = `💳 Payment Successful!\n\n`;
        msg += `Order #: ${this.createdOrder.orderNumber}\n`;
        msg += `Payment #: ${res.payment?.paymentNumber || 'N/A'}\n`;
        msg += `Amount Paid: $${amount.toFixed(2)}\n`;
        
        if (change > 0) {
          msg += `Change: $${change.toFixed(2)}\n`;
        }
        
        // ✅ Show Telegram receipt status
        if (this.paymentForm.value.sendPaymentReceipt) {
          if (res.telegramSent) {
            msg += `\n✅ Payment receipt sent to Telegram!`;
          } else {
            msg += `\n⚠️ Payment completed, but Telegram receipt failed`;
          }
        }
        
        alert(msg);
        
        // Clear cart and redirect
        this.cartService.clearCart();
        this.router.navigate(['/order']);
      },
      error: (e) => {
        this.loading = false;
        this.error = e?.error?.error || e?.error?.message || 'Payment failed';
        console.error('❌ Payment failed:', e);
      }
    });
  }

  cancelCheckout() {
    if (confirm('Cancel checkout and return to cart?')) {
      this.router.navigate(['/cart']);
    }
  }

  getCategoryIcon(category: string): string {
    const icons: any = {
      Coffee: '☕',
      Tea: '🍵',
      Drink: '🥤',
      Food: '🍽️',
      Dessert: '🍰'
    };
    return icons[category] || '📦';
  }

  formatMoney(value: number): string {
    return value.toFixed(2);
  }
}