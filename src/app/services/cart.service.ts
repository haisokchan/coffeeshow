// services/cart.service.ts - Enhanced with Product Validation
import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
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

@Injectable({
  providedIn: 'root'
})
export class CartService {
  // ✅ FIX: use environment variable, not hardcoded production URL
  private API = `${environment.apiUrl}/cart`;

  private cartItems = signal<CartItem[]>([]);
  private cartSubject = new BehaviorSubject<CartItem[]>([]);

  cart$ = this.cartSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadCart();
  }

  private loadCart() {
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const items = JSON.parse(savedCart);
        this.cartItems.set(items);
        this.cartSubject.next(items);
      }
    } catch {
      // ✅ FIX: handle corrupt localStorage data gracefully
      localStorage.removeItem('cart');
    }
  }

  private saveCart() {
    const items = this.cartItems();
    localStorage.setItem('cart', JSON.stringify(items));
    this.cartSubject.next(items);
  }

  getCart(): CartItem[] {
    return this.cartItems();
  }

  // ==========================================
  // PRODUCT VALIDATION METHODS
  // ==========================================

  private validateProduct(product: any, quantity: number): ValidationResult {
    if (!product || !product._id) {
      return { valid: false, message: '❌ Invalid product: Product ID is missing' };
    }
    if (!product.name || product.name.trim() === '') {
      return { valid: false, message: '❌ Invalid product: Product name is missing' };
    }
    if (product.isAvailable === false) {
      return { valid: false, message: `❌ "${product.name}" is currently unavailable` };
    }
    if (!product.price || product.price <= 0) {
      return { valid: false, message: `❌ "${product.name}" has an invalid price` };
    }
    if (!quantity || quantity <= 0) {
      return { valid: false, message: '❌ Quantity must be at least 1' };
    }
    if (!Number.isInteger(quantity)) {
      return { valid: false, message: '❌ Quantity must be a whole number' };
    }

    if (product.stock !== undefined && product.stock !== null) {
      const currentCartQuantity = this.getItemQuantity(product._id);
      const totalRequested = currentCartQuantity + quantity;

      if (product.stock <= 0) {
        return { valid: false, message: `❌ "${product.name}" is out of stock` };
      }
      if (totalRequested > product.stock) {
        const available = product.stock - currentCartQuantity;
        return {
          valid: false,
          message: `❌ Only ${available} unit${available !== 1 ? 's' : ''} of "${product.name}" available (${currentCartQuantity} already in cart)`,
          maxQuantity: available
        };
      }
      if (product.minStock && totalRequested > (product.stock - product.minStock)) {
        console.warn(`⚠️ Warning: Adding "${product.name}" will bring stock close to minimum threshold`);
      }
    }

    const MAX_QUANTITY_PER_ITEM = 99;
    if (quantity > MAX_QUANTITY_PER_ITEM) {
      return { valid: false, message: `❌ Maximum ${MAX_QUANTITY_PER_ITEM} units per item allowed` };
    }

    const validCategories = ['Coffee', 'Tea', 'Drink', 'Food', 'Dessert'];
    if (!validCategories.includes(product.category)) {
      return { valid: false, message: `❌ Invalid product category: ${product.category}` };
    }

    return { valid: true };
  }

  validateCart(): { valid: boolean; errors: string[] } {
    const items = this.cartItems();
    const errors: string[] = [];

    if (items.length === 0) {
      errors.push('❌ Cart is empty');
      return { valid: false, errors };
    }

    items.forEach((item, index) => {
      const validation = this.validateProduct(item.product, item.quantity);
      if (!validation.valid) {
        errors.push(`Item ${index + 1}: ${validation.message}`);
      }
    });

    return { valid: errors.length === 0, errors };
  }

  addToCart(product: any, quantity: number = 1): ValidationResult {
    const validation = this.validateProduct(product, quantity);
    if (!validation.valid) return validation;

    const items = [...this.cartItems()];
    const existingIndex = items.findIndex(item => item.product._id === product._id);

    if (existingIndex > -1) {
      const newQuantity = items[existingIndex].quantity + quantity;
      const revalidation = this.validateProduct(product, newQuantity - items[existingIndex].quantity);
      if (!revalidation.valid) return revalidation;
      items[existingIndex].quantity = newQuantity;
    } else {
      items.push({ product, quantity });
    }

    this.cartItems.set(items);
    this.saveCart();

    // Non-blocking Telegram notification
    this.notifyItemAdded({ product, quantity }).subscribe({
      next: () => console.log('✅ Cart notification sent'),
      error: (err) => console.warn('⚠️ Cart notification failed:', err)
    });

    return { valid: true, message: `✅ "${product.name}" added to cart successfully!` };
  }

  updateQuantity(index: number, quantity: number): ValidationResult {
    const items = [...this.cartItems()];
    if (!items[index]) return { valid: false, message: '❌ Invalid cart item' };
    if (quantity <= 0) return { valid: false, message: '❌ Quantity must be at least 1' };

    const product = items[index].product;
    const currentQuantity = items[index].quantity;
    const quantityDifference = quantity - currentQuantity;
    const validation = this.validateProduct(product, quantityDifference);
    if (!validation.valid) return validation;

    items[index].quantity = quantity;
    this.cartItems.set(items);
    this.saveCart();
    return { valid: true, message: '✅ Quantity updated successfully' };
  }

  increaseQuantity(index: number): ValidationResult {
    const items = [...this.cartItems()];
    if (!items[index]) return { valid: false, message: '❌ Invalid cart item' };

    const product = items[index].product;
    const validation = this.validateProduct(product, 1);
    if (!validation.valid) return validation;

    items[index].quantity++;
    this.cartItems.set(items);
    this.saveCart();
    return { valid: true };
  }

  decreaseQuantity(index: number): ValidationResult {
    const items = [...this.cartItems()];
    if (!items[index]) return { valid: false, message: '❌ Invalid cart item' };

    if (items[index].quantity <= 1) {
      return { valid: false, message: '❌ Minimum quantity is 1. Remove item instead.' };
    }

    items[index].quantity--;
    this.cartItems.set(items);
    this.saveCart();
    return { valid: true };
  }

  removeItem(index: number) {
    const items = [...this.cartItems()];
    items.splice(index, 1);
    this.cartItems.set(items);
    this.saveCart();
  }

  clearCart() {
    const itemCount = this.getItemCount();
    const totalValue = this.getTotal();

    this.cartItems.set([]);
    localStorage.removeItem('cart');
    this.cartSubject.next([]);

    if (itemCount > 0) {
      this.notifyCartCleared(itemCount, totalValue).subscribe({
        next: () => console.log('✅ Cart cleared notification sent'),
        error: (err) => console.warn('⚠️ Cart clear notification failed:', err)
      });
    }
  }

  getItemCount(): number {
    return this.cartItems().reduce((sum, item) => sum + item.quantity, 0);
  }

  getSubtotal(): number {
    return this.cartItems().reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }

  getTax(taxRate: number = 0.1): number {
    return this.getSubtotal() * taxRate;
  }

  getTotal(taxRate: number = 0.1): number {
    return this.getSubtotal() + this.getTax(taxRate);
  }

  isInCart(productId: string): boolean {
    return this.cartItems().some(item => item.product._id === productId);
  }

  getItemQuantity(productId: string): number {
    const item = this.cartItems().find(item => item.product._id === productId);
    return item ? item.quantity : 0;
  }

  getAvailableQuantity(productId: string): number {
    const item = this.cartItems().find(item => item.product._id === productId);
    if (!item || !item.product.stock) return 0;
    return item.product.stock - item.quantity;
  }

  canAddToCart(product: any, quantity: number = 1): ValidationResult {
    return this.validateProduct(product, quantity);
  }

  // ==========================================
  // TELEGRAM NOTIFICATION METHODS
  // ==========================================

  notifyItemAdded(item: { product: any; quantity: number }) {
    return this.http.post(`${this.API}/notify-add`, {
      item: { product: item.product, quantity: item.quantity },
      cartTotal: this.getItemCount()
    });
  }

  sendCartSummary(customerInfo?: { name?: string; phone?: string }) {
    return this.http.post(`${this.API}/notify-summary`, {
      cartItems: this.getCart(),
      customerInfo: customerInfo || null
    });
  }

  notifyCheckout(customerInfo: { name?: string; phone?: string }, orderNumber?: string) {
    return this.http.post(`${this.API}/notify-checkout`, {
      cartItems: this.getCart(),
      customerInfo,
      orderNumber
    });
  }

  private notifyCartCleared(itemCount: number, totalValue: number) {
    return this.http.post(`${this.API}/notify-cleared`, { itemCount, totalValue });
  }
}