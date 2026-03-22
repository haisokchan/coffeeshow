// services/cart.service.ts — Cart state + DB persistence + reporting
import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface CartItem {
  product: {
    _id?: string;
    name: string;
    description?: string;
    category: 'Coffee' | 'Tea' | 'Drink' | 'Food' | 'Dessert';
    price: number;
    image?: string;
    stock?: number;
    isAvailable?: boolean;
    minStock?: number;
  };
  quantity: number;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
  maxQuantity?: number;
}

export interface CartSnapshot {
  _id:          string;
  cartNumber:   string;
  status:       'active' | 'saved' | 'checked_out' | 'cleared' | 'expired';
  customer:     { name: string; phone: string };
  items:        CartSnapshotItem[];
  subtotal:     number;
  tax:          number;
  taxRate:      number;
  total:        number;
  itemCount:    number;
  productCount: number;
  notes:        string;
  telegramSent: boolean;
  createdAt:    string;
  updatedAt:    string;
}

export interface CartSnapshotItem {
  productName: string;
  category:    string;
  price:       number;
  quantity:    number;
  itemTotal:   number;
}

export interface CartSnapshotListResponse {
  success:  boolean;
  carts:    CartSnapshot[];
  meta:     { total: number; page: number; limit: number; pages: number };
  summary:  { totalCarts: number; totalItems: number; totalValue: number; avgTotal: number };
}

export interface CartReportFilter {
  status?: string;
  from?:   string;
  to?:     string;
  page?:   number;
  limit?:  number;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private API = `${environment.apiUrl}/cart`;

  private cartItems   = signal<CartItem[]>([]);
  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  cart$ = this.cartSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadCart();
  }

  // ── Local storage ─────────────────────────────────────────

  private loadCart() {
    try {
      const saved = localStorage.getItem('cart');
      if (saved) {
        const items = JSON.parse(saved);
        this.cartItems.set(items);
        this.cartSubject.next(items);
      }
    } catch {
      localStorage.removeItem('cart');
    }
  }

  private saveCartLocal() {
    const items = this.cartItems();
    localStorage.setItem('cart', JSON.stringify(items));
    this.cartSubject.next(items);
  }

  getCart(): CartItem[] { return this.cartItems(); }

  // ── Validation ────────────────────────────────────────────

  private validateProduct(product: any, quantity: number): ValidationResult {
    if (!product?._id)                        return { valid: false, message: '❌ Invalid product: missing ID' };
    if (!product.name?.trim())                return { valid: false, message: '❌ Invalid product: missing name' };
    if (product.isAvailable === false)        return { valid: false, message: `❌ "${product.name}" is unavailable` };
    if (!product.price || product.price <= 0) return { valid: false, message: `❌ "${product.name}" has an invalid price` };
    if (!quantity || quantity <= 0)           return { valid: false, message: '❌ Quantity must be at least 1' };
    if (!Number.isInteger(quantity))          return { valid: false, message: '❌ Quantity must be a whole number' };

    if (product.stock != null) {
      const inCart = this.getItemQuantity(product._id);
      const total  = inCart + quantity;
      if (product.stock <= 0)    return { valid: false, message: `❌ "${product.name}" is out of stock` };
      if (total > product.stock) {
        const avail = product.stock - inCart;
        return { valid: false, message: `❌ Only ${avail} unit(s) of "${product.name}" available`, maxQuantity: avail };
      }
    }

    if (quantity > 99) return { valid: false, message: '❌ Maximum 99 units per item' };

    const validCategories = ['Coffee', 'Tea', 'Drink', 'Food', 'Dessert'];
    if (!validCategories.includes(product.category))
      return { valid: false, message: `❌ Invalid category: ${product.category}` };

    return { valid: true };
  }

  validateCart(): { valid: boolean; errors: string[] } {
    const items  = this.cartItems();
    const errors: string[] = [];
    if (items.length === 0) { errors.push('❌ Cart is empty'); return { valid: false, errors }; }
    items.forEach((item, i) => {
      const v = this.validateProduct(item.product, item.quantity);
      if (!v.valid) errors.push(`Item ${i + 1} (${item.product.name}): ${v.message}`);
    });
    return { valid: errors.length === 0, errors };
  }

  // ── Cart operations ───────────────────────────────────────

  addToCart(product: any, quantity = 1): ValidationResult {
    const v = this.validateProduct(product, quantity);
    if (!v.valid) return v;

    const items = [...this.cartItems()];
    const idx   = items.findIndex(i => i.product._id === product._id);
    if (idx > -1) {
      items[idx].quantity += quantity;
    } else {
      items.push({ product, quantity });
    }
    this.cartItems.set(items);
    this.saveCartLocal();

    // ✅ NO Telegram notification on add to cart

    return { valid: true, message: `✅ "${product.name}" added to cart!` };
  }

  updateQuantity(index: number, quantity: number): ValidationResult {
    const items = [...this.cartItems()];
    if (!items[index]) return { valid: false, message: '❌ Invalid cart item' };
    if (quantity <= 0) return { valid: false, message: '❌ Quantity must be at least 1' };

    const diff = quantity - items[index].quantity;
    const v    = this.validateProduct(items[index].product, diff);
    if (!v.valid) return v;

    items[index].quantity = quantity;
    this.cartItems.set(items);
    this.saveCartLocal();
    return { valid: true };
  }

  increaseQuantity(index: number): ValidationResult {
    const items = [...this.cartItems()];
    if (!items[index]) return { valid: false, message: '❌ Invalid item' };
    const v = this.validateProduct(items[index].product, 1);
    if (!v.valid) return v;
    items[index].quantity++;
    this.cartItems.set(items);
    this.saveCartLocal();
    return { valid: true };
  }

  decreaseQuantity(index: number): ValidationResult {
    const items = [...this.cartItems()];
    if (!items[index]) return { valid: false, message: '❌ Invalid item' };
    if (items[index].quantity <= 1) return { valid: false, message: '❌ Minimum 1. Remove item instead.' };
    items[index].quantity--;
    this.cartItems.set(items);
    this.saveCartLocal();
    return { valid: true };
  }

  removeItem(index: number) {
    const items = [...this.cartItems()];
    items.splice(index, 1);
    this.cartItems.set(items);
    this.saveCartLocal();
  }

  clearCart() {
    // ✅ NO Telegram notification on clear cart
    this.cartItems.set([]);
    localStorage.removeItem('cart');
    this.cartSubject.next([]);
  }

  // ── Totals ────────────────────────────────────────────────

  getItemCount():              number  { return this.cartItems().reduce((s, i) => s + i.quantity, 0); }
  getSubtotal():               number  { return this.cartItems().reduce((s, i) => s + i.product.price * i.quantity, 0); }
  getTax(rate = 0.1):          number  { return this.getSubtotal() * rate; }
  getTotal(rate = 0.1):        number  { return this.getSubtotal() + this.getTax(rate); }
  isInCart(id: string):        boolean { return this.cartItems().some(i => i.product._id === id); }
  getItemQuantity(id: string): number  { return this.cartItems().find(i => i.product._id === id)?.quantity ?? 0; }
  canAddToCart(p: any, q = 1): ValidationResult { return this.validateProduct(p, q); }

  // ── ✅ DB PERSISTENCE ─────────────────────────────────────

  saveCartToDB(customerInfo?: { name?: string; phone?: string }, notes = '', status = 'saved'): Observable<any> {
    return this.http.post(`${this.API}/save`, {
      cartItems:    this.getCart(),
      customerInfo: customerInfo || { name: 'Guest', phone: '' },
      notes,
      status
    });
  }

  // ── ✅ REPORTING ──────────────────────────────────────────

  getSnapshots(filter: CartReportFilter = {}): Observable<CartSnapshotListResponse> {
    let params = new HttpParams();
    if (filter.status) params = params.set('status', filter.status);
    if (filter.from)   params = params.set('from',   filter.from);
    if (filter.to)     params = params.set('to',     filter.to);
    if (filter.page)   params = params.set('page',   String(filter.page));
    if (filter.limit)  params = params.set('limit',  String(filter.limit));
    if (filter.search) params = params.set('search', filter.search);
    return this.http.get<CartSnapshotListResponse>(`${this.API}/snapshots`, { params });
  }

  getSnapshot(id: string): Observable<{ success: boolean; cart: CartSnapshot }> {
    return this.http.get<any>(`${this.API}/snapshots/${id}`);
  }

  updateSnapshotStatus(id: string, status: string): Observable<any> {
    return this.http.patch(`${this.API}/snapshots/${id}/status`, { status });
  }

  deleteSnapshot(id: string): Observable<any> {
    return this.http.delete(`${this.API}/snapshots/${id}`);
  }

  // ── ✅ PRINT ──────────────────────────────────────────────

  getPrintReceipt(id: string): Observable<{ success: boolean; receipt: any }> {
    return this.http.get<any>(`${this.API}/snapshots/${id}/print`);
  }

  // ── ✅ TELEGRAM — Receipt text + Image only ───────────────

  /** Send receipt as TEXT message to Telegram */
  sendSnapshotToTelegram(id: string): Observable<any> {
    return this.http.post(`${this.API}/snapshots/${id}/telegram`, {});
  }

  /** Send receipt as JPG IMAGE to Telegram */
  sendReceiptImage(id: string): Observable<any> {
    return this.http.post(`${this.API}/snapshots/${id}/send-image`, {});
  }

  /** Download receipt as JPG file */
  downloadReceiptJpg(id: string): Observable<Blob> {
    return this.http.get(`${this.API}/snapshots/${id}/download-jpg`, {
      responseType: 'blob'
    });
  }

  // ── ✅ CHECKOUT notification only ────────────────────────

  notifyCheckout(customerInfo: { name?: string; phone?: string }, orderNumber?: string): Observable<any> {
    return this.http.post(`${this.API}/notify-checkout`, {
      cartItems: this.getCart(),
      customerInfo,
      orderNumber
    });
  }
}