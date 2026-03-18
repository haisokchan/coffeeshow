// cart.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CartService, CartItem } from '../services/cart.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './cart.html',
})
export class CartComponent implements OnInit, OnDestroy {
  cartItems: CartItem[] = [];
  sendingNotification = false;
  savingCart          = false;
  error               = '';
  success             = '';
  validationErrors: string[] = [];

  private cartSub!: Subscription;
  private errorTimer: any;
  private successTimer: any;

  constructor(
    private router: Router,
    private cartService: CartService
  ) {}

  ngOnInit() {
    this.cartItems = this.cartService.getCart();
    this.cartSub   = this.cartService.cart$.subscribe(items => {
      this.cartItems = items;
    });
  }

  ngOnDestroy() {
    this.cartSub?.unsubscribe();
    clearTimeout(this.errorTimer);
    clearTimeout(this.successTimer);
  }

  // ── Icons / styles ────────────────────────────────────────

  getCategoryIcon(category: string): string {
    const m: Record<string, string> = {
      Coffee: '☕', Tea: '🍵', Drink: '🥤', Food: '🍽️', Dessert: '🍰'
    };
    return m[category] || '📦';
  }

  getImagePlaceholder(category: string): string {
    const m: Record<string, string> = {
      Coffee: 'bg-amber-50', Tea: 'bg-green-50',
      Drink: 'bg-blue-50',   Food: 'bg-orange-50', Dessert: 'bg-pink-50'
    };
    return m[category] || 'bg-stone-50';
  }

  // ── Stock helpers ─────────────────────────────────────────

  isOutOfStock(item: CartItem): boolean {
    if (item.product.stock == null) return false;
    return item.quantity > item.product.stock;
  }

  hasStockWarning(item: CartItem): boolean {
    if (item.product.stock == null) return false;
    return !this.isOutOfStock(item) && (item.product.stock - item.quantity) < 5;
  }

  getStockStatus(item: CartItem): string {
    if (item.product.stock == null) return '';
    const rem = item.product.stock - item.quantity;
    if (rem <= 0) return 'Last units are in your cart';
    if (rem === 1) return 'Only 1 more unit available';
    if (rem < 5)  return `Only ${rem} more units available`;
    return '';
  }

  getOutOfStockCount():   number { return this.cartItems.filter(i => this.isOutOfStock(i)).length; }
  getStockWarningCount(): number { return this.cartItems.filter(i => this.hasStockWarning(i)).length; }

  // ── Category breakdown ────────────────────────────────────

  getCategoryBreakdown(): { category: string; totalQty: number; totalValue: number }[] {
    const map = new Map<string, { totalQty: number; totalValue: number }>();
    for (const item of this.cartItems) {
      const cat = item.product.category || 'Other';
      const cur = map.get(cat) ?? { totalQty: 0, totalValue: 0 };
      map.set(cat, {
        totalQty:   cur.totalQty   + item.quantity,
        totalValue: cur.totalValue + item.product.price * item.quantity
      });
    }
    return Array.from(map.entries())
      .map(([category, d]) => ({ category, ...d }))
      .sort((a, b) => b.totalValue - a.totalValue);
  }

  // ── Totals ────────────────────────────────────────────────

  getTotalItems(): number { return this.cartService.getItemCount(); }
  getSubtotal():   number { return this.cartService.getSubtotal(); }
  getTax():        number { return this.cartService.getTax(); }
  getTotal():      number { return this.cartService.getTotal(); }

  // ── Quantity controls ─────────────────────────────────────

  increaseQuantity(index: number) {
    const r = this.cartService.increaseQuantity(index);
    if (!r.valid) {
      this.showError(
        r.maxQuantity !== undefined
          ? `Max ${r.maxQuantity} unit(s) available`
          : (r.message || 'Cannot increase quantity')
      );
    }
  }

  decreaseQuantity(index: number) {
    const r = this.cartService.decreaseQuantity(index);
    if (!r.valid) this.showError(r.message || 'Cannot decrease quantity');
  }

  updateQuantity(index: number) {
    const qty = this.cartItems[index]?.quantity;
    if (!qty || qty < 1) {
      this.showError('Quantity must be at least 1');
      if (this.cartItems[index]) this.cartItems[index].quantity = 1;
      return;
    }
    const r = this.cartService.updateQuantity(index, qty);
    if (!r.valid) {
      this.showError(
        r.maxQuantity !== undefined
          ? `Only ${r.maxQuantity} unit(s) available`
          : (r.message || 'Cannot update quantity')
      );
      this.cartItems = this.cartService.getCart();
    }
  }

  removeItem(index: number) {
    const name = this.cartItems[index]?.product?.name || 'this item';
    if (confirm(`Remove "${name}" from cart?`)) {
      this.cartService.removeItem(index);
      this.showSuccess(`"${name}" removed`);
    }
  }

  clearCart() {
    if (confirm('Clear all items from cart?')) {
      this.cartService.clearCart();
      this.showSuccess('Cart cleared');
    }
  }

  dismissValidationErrors() { this.validationErrors = []; }

  // ── ✅ Save cart to DB ─────────────────────────────────────

  saveCart() {
    if (this.cartItems.length === 0) { this.showError('Cart is empty'); return; }

    const v = this.cartService.validateCart();
    if (!v.valid) {
      this.validationErrors = v.errors;
      this.showError('Fix validation issues before saving');
      return;
    }

    this.savingCart = true;
    this.cartService.saveCartToDB({ name: 'Guest Customer', phone: '' }).subscribe({
      next: (res: any) => {
        this.savingCart = false;
        this.showSuccess(`Cart saved as ${res.cartNumber} 💾`);
      },
      error: (err: any) => {
        this.savingCart = false;
        this.showError(err?.error?.error || 'Failed to save cart');
      }
    });
  }

  // ── Telegram ──────────────────────────────────────────────

  sendCartToTelegram() {
    if (this.cartItems.length === 0) { this.showError('Cart is empty'); return; }

    const v = this.cartService.validateCart();
    if (!v.valid) {
      this.validationErrors = v.errors;
      this.showError('Fix validation issues before sending');
      return;
    }

    this.sendingNotification = true;
    this.cartService.sendCartSummary({ name: 'Guest Customer', phone: '' }).subscribe({
      next: () => { this.sendingNotification = false; this.showSuccess('Cart sent to Telegram ✅'); },
      error: () => { this.sendingNotification = false; this.showError('Failed to send to Telegram'); }
    });
  }

  // ── Checkout ──────────────────────────────────────────────

  checkout() {
    if (this.cartItems.length === 0) { this.showError('Cart is empty'); return; }

    if (this.getOutOfStockCount() > 0) {
      this.showError(`${this.getOutOfStockCount()} item(s) exceed available stock`);
      return;
    }

    const v = this.cartService.validateCart();
    if (!v.valid) {
      this.validationErrors = v.errors;
      this.showError('Fix cart issues before checkout');
      return;
    }

    const total    = this.getTotal();
    const orderNum = `ORD-${Date.now()}`;

    this.cartService.notifyCheckout({ name: 'Guest Customer', phone: '' }, orderNum).subscribe({
      next: () => {
        this.showSuccess(`Order ${orderNum} placed! $${total.toFixed(2)}`);
        this.cartService.clearCart();
        this.router.navigate(['/checkout']);
      },
      error: () => {
        this.showSuccess(`Order ${orderNum} placed! $${total.toFixed(2)}`);
        this.cartService.clearCart();
        this.router.navigate(['/checkout']);
      }
    });
  }

  // ── Toasts ────────────────────────────────────────────────

  private showSuccess(msg: string) {
    this.success = msg; this.error = '';
    clearTimeout(this.successTimer);
    this.successTimer = setTimeout(() => { this.success = ''; }, 3500);
  }

  private showError(msg: string) {
    this.error = msg; this.success = '';
    clearTimeout(this.errorTimer);
    this.errorTimer = setTimeout(() => { this.error = ''; }, 5000);
  }
}