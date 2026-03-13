// cart.component.ts - Enhanced with Validation Error Handling
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CartService, CartItem } from '../services/cart.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './cart.html',
})
export class CartComponent implements OnInit {
  cartItems: CartItem[] = [];
  sendingNotification = false;
  error = '';
  success = '';
  validationErrors: string[] = [];

  constructor(
    private router: Router,
    private cartService: CartService
  ) {}

  ngOnInit() {
    this.loadCart();
    
    // Subscribe to cart changes
    this.cartService.cart$.subscribe(items => {
      this.cartItems = items;
    });
  }

  loadCart() {
    this.cartItems = this.cartService.getCart();
  }

  getCategoryIcon(category: string): string {
    const icons: any = {
      Coffee: '☕',
      Tea: '🍵',
      Drink: '🥤',
      Food: '🍽️',
      Dessert: '🰀'
    };
    return icons[category] || '📦';
  }

  getImagePlaceholder(category: string): string {
    const colors: any = {
      Coffee: 'bg-amber-50',
      Tea: 'bg-green-50',
      Drink: 'bg-blue-50',
      Food: 'bg-orange-50',
      Dessert: 'bg-pink-50'
    };
    return colors[category] || 'bg-stone-50';
  }

  increaseQuantity(index: number) {
    const result = this.cartService.increaseQuantity(index);
    if (!result.valid) {
      this.showError(result.message || 'Cannot increase quantity');
      
      // Show available quantity if provided
      if (result.maxQuantity !== undefined) {
        this.showError(`Maximum ${result.maxQuantity} units available`);
      }
    } else {
      this.showSuccess('✅ Quantity updated');
    }
  }

  decreaseQuantity(index: number) {
    const result = this.cartService.decreaseQuantity(index);
    if (!result.valid) {
      this.showError(result.message || 'Cannot decrease quantity');
    } else {
      this.showSuccess('✅ Quantity updated');
    }
  }

  updateQuantity(index: number) {
    const quantity = this.cartItems[index]?.quantity || 1;
    
    if (quantity < 1) {
      this.showError('❌ Quantity must be at least 1');
      this.cartItems[index].quantity = 1;
      return;
    }

    const result = this.cartService.updateQuantity(index, quantity);
    
    if (!result.valid) {
      this.showError(result.message || 'Cannot update quantity');
      
      // Revert to previous quantity if validation fails
      this.loadCart();
      
      // Show available quantity if provided
      if (result.maxQuantity !== undefined) {
        this.showError(`Maximum ${result.maxQuantity} units available`);
      }
    } else {
      this.showSuccess('✅ Quantity updated successfully');
    }
  }

  removeItem(index: number) {
    const itemName = this.cartItems[index]?.product?.name || 'this item';
    
    if (confirm(`Remove "${itemName}" from cart?`)) {
      this.cartService.removeItem(index);
      this.showSuccess(`✅ "${itemName}" removed from cart`);
    }
  }

  clearCart() {
    if (confirm('Clear all items from cart?')) {
      this.cartService.clearCart();
      this.showSuccess('✅ Cart cleared');
    }
  }

  getTotalItems(): number {
    return this.cartService.getItemCount();
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

  // ✅ NEW: Send cart summary to Telegram
  sendCartToTelegram() {
    if (this.cartItems.length === 0) {
      this.showError('Your cart is empty!');
      return;
    }

    // Validate cart before sending
    const validation = this.cartService.validateCart();
    if (!validation.valid) {
      this.validationErrors = validation.errors;
      this.showError('❌ Cart has validation errors. Please fix them before proceeding.');
      return;
    }

    this.sendingNotification = true;

    const customerInfo = {
      name: 'Guest Customer',
      phone: ''
    };

    this.cartService.sendCartSummary(customerInfo).subscribe({
      next: () => {
        this.sendingNotification = false;
        this.showSuccess('✅ Cart summary sent to Telegram successfully!');
      },
      error: (err) => {
        this.sendingNotification = false;
        console.error('Failed to send cart summary:', err);
        this.showError('⚠️ Failed to send cart summary to Telegram');
      }
    });
  }

  // ✅ Enhanced checkout with validation
  checkout() {
    if (this.cartItems.length === 0) {
      this.showError('Your cart is empty!');
      return;
    }
    
    // Validate entire cart before checkout
    const validation = this.cartService.validateCart();
    
    if (!validation.valid) {
      this.validationErrors = validation.errors;
      this.showError('❌ Cannot proceed to checkout. Please fix the following issues:');
      
      // Show each validation error
      validation.errors.forEach(error => {
        console.error(error);
      });
      
      alert(
        '❌ Cart Validation Failed\n\n' +
        validation.errors.join('\n')
      );
      return;
    }
    
    const total = this.getTotal();
    const orderNumber = `ORD-${Date.now()}`;

    // Send checkout notification to Telegram
    const customerInfo = {
      name: 'Guest Customer',
      phone: ''
    };

    this.cartService.notifyCheckout(customerInfo, orderNumber).subscribe({
      next: () => {
        console.log('✅ Checkout notification sent to Telegram');
        this.showSuccess(
          `✅ Order ${orderNumber} placed successfully! Total: $${total.toFixed(2)}`
        );
        this.clearCart();
        this.router.navigate(['/order']);
      },
      error: (err) => {
        console.error('⚠️ Failed to send checkout notification:', err);
        this.showSuccess(`✅ Order placed successfully! Total: $${total.toFixed(2)}`);
        this.clearCart();
        this.router.navigate(['/order']);
      }
    });
  }

  // ✅ Helper methods for user feedback
  private showSuccess(message: string) {
    this.success = message;
    this.error = '';
    this.validationErrors = [];
    setTimeout(() => {
      this.success = '';
    }, 3000);
  }

  private showError(message: string) {
    this.error = message;
    this.success = '';
    setTimeout(() => {
      this.error = '';
    }, 5000);
  }

  // ✅ Get stock status for an item
  getStockStatus(item: CartItem): string {
    if (!item.product.stock) return '';
    
    const available = item.product.stock - item.quantity;
    
    if (available <= 0) {
      return '⚠️ Last units in cart';
    } else if (available < 5) {
      return `⚠️ Only ${available} more available`;
    }
    
    return '';
  }

  // ✅ Check if item has stock warning
  hasStockWarning(item: CartItem): boolean {
    if (!item.product.stock) return false;
    return (item.product.stock - item.quantity) < 5;
  }

  // ✅ Check if item is out of stock
  isOutOfStock(item: CartItem): boolean {
    if (!item.product.stock) return false;
    return item.quantity >= item.product.stock;
  }
}