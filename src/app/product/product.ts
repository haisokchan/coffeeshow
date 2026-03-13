// product.component.ts - Enhanced with Add-to-Cart Validation
import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ProductService, Product } from '../services/product.service';
import { SupplierService, Supplier } from '../services/supplier.service';
import { CartService } from '../services/cart.service';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './product.html',
})
export class ProductsComponent implements OnInit {
  loading = false;
  error = '';
  success = '';

  products = signal<Product[]>([]);
  suppliers = signal<Supplier[]>([]);
  total = signal(0);
  totalQty = signal(0);
  totalValue = signal(0);

  query = '';
  selectedCategory = '';
  selectedSupplier = '';
  viewMode: 'grid' | 'list' = 'grid';

  form: any;
  editForm: any;

  editOpen = false;
  createOpen = false;
  editingId: string | null = null;

  categories = ['Coffee', 'Tea', 'Drink', 'Food', 'Dessert'];

  constructor(
    private fb: FormBuilder, 
    private api: ProductService,
    private supplierService: SupplierService,
    public cartService: CartService,
    private router: Router
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      category: ['Coffee', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      stock: [0, [Validators.min(0)]],
      minStock: [5, [Validators.min(0)]],
      image: [''],
      description: [''],
      supplier: [''],
    });

    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      category: ['Coffee', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      stock: [0, [Validators.min(0)]],
      minStock: [5, [Validators.min(0)]],
      image: [''],
      description: [''],
      supplier: [''],
    });
  }

  ngOnInit() {
    this.loadSuppliers();
    this.load();
  }

  loadSuppliers() {
    this.supplierService.getSuppliers({ isActive: true, limit: 1000 }).subscribe({
      next: (res) => {
        this.suppliers.set(res?.data || []);
      },
      error: (e) => console.error('Error loading suppliers:', e),
    });
  }

  load() {
    this.error = '';
    this.api.getProducts(this.query, this.selectedCategory, this.selectedSupplier).subscribe({
      next: (res) => {
        this.products.set(res.products || []);
        this.total.set(res.total || 0);
        this.totalQty.set(res.totalQty || 0);
        this.totalValue.set(res.totalValue || 0);
      },
      error: (e) => (this.error = e?.error?.message || 'Load products failed'),
    });
  }

  filterByCategory(category: string) {
    this.selectedCategory = this.selectedCategory === category ? '' : category;
    this.load();
  }

  openCreate() {
    this.createOpen = true;
    this.form.reset({
      name: '',
      category: 'Coffee',
      price: 0,
      stock: 0,
      minStock: 5,
      image: '',
      description: '',
      supplier: '',
    });
  }

  closeCreate() {
    this.createOpen = false;
    this.error = '';
  }

  create() {
    if (this.form.invalid) return;

    this.loading = true;
    this.error = '';
    this.success = '';

    const data = { ...this.form.value };
    if (!data.supplier) data.supplier = null;

    this.api.createProduct(data as any).subscribe({
      next: () => {
        this.loading = false;
        this.showSuccess(`✅ Product "${this.form.value.name}" created successfully!`);
        this.closeCreate();
        this.load();
      },
      error: (e) => {
        this.loading = false;
        this.error = e?.error?.message || 'Create failed';
      },
    });
  }

  openEdit(p: Product) {
    this.editingId = p._id || null;
    this.editForm.patchValue({
      name: p.name,
      category: p.category,
      price: p.price as any,
      stock: (p.stock ?? 0) as any,
      minStock: (p.minStock ?? 5) as any,
      image: p.image ?? '',
      description: p.description ?? '',
      supplier: typeof p.supplier === 'string' ? p.supplier : (p.supplier?._id || ''),
    });
    this.editOpen = true;
    this.error = '';
    this.success = '';
  }

  closeEdit() {
    this.editOpen = false;
    this.editingId = null;
    this.error = '';
  }

  update() {
    if (!this.editingId || this.editForm.invalid) return;

    this.loading = true;
    this.error = '';
    const productName = this.editForm.value.name;

    const data = { ...this.editForm.value };
    if (!data.supplier) data.supplier = null;

    this.api.updateProduct(this.editingId, data as any).subscribe({
      next: () => {
        this.loading = false;
        this.closeEdit();
        this.load();
        setTimeout(() => {
          this.showSuccess(`✅ Product "${productName}" updated successfully!`);
        }, 100);
      },
      error: (e) => {
        this.loading = false;
        this.error = e?.error?.message || 'Update failed';
      },
    });
  }

  remove(id?: string) {
    if (!id) return;
    
    const product = this.products().find(p => p._id === id);
    const productName = product?.name || 'this product';
    
    if (!confirm(`Delete "${productName}"?`)) return;

    this.error = '';
    this.success = '';
    
    this.api.deleteProduct(id).subscribe({
      next: () => {
        this.showSuccess(`✅ Product "${productName}" deleted successfully!`);
        this.load();
      },
      error: (e) => (this.error = e?.error?.message || 'Delete failed'),
    });
  }

  getSupplierName(product: Product): string {
    if (!product.supplier) return 'No supplier';
    if (typeof product.supplier === 'string') {
      return product.supplierDetails?.name || 'Unknown';
    }
    return product.supplier.name || 'Unknown';
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

  private showSuccess(msg: string) {
    this.success = msg;
    setTimeout(() => this.success = '', 5000);
  }

  // ===== CART INTEGRATION METHODS WITH VALIDATION =====
  
  /**
   * ✅ Enhanced addToCart with validation feedback
   */
  addToCart(product: Product) {
    if (!product._id) {
      this.error = '❌ Cannot add product without ID';
      return;
    }

    // Check if product can be added
    const validation = this.cartService.canAddToCart(product, 1);
    
    if (!validation.valid) {
      this.error = validation.message || 'Cannot add product to cart';
      setTimeout(() => this.error = '', 5000);
      return;
    }

    // Add to cart
    const result = this.cartService.addToCart(product, 1);
    
    if (result.valid) {
      this.showSuccess(result.message || `✅ "${product.name}" added to cart!`);
    } else {
      this.error = result.message || 'Failed to add to cart';
      setTimeout(() => this.error = '', 5000);
    }
  }

  /**
   * ✅ Get available quantity for a product
   */
  getAvailableQuantity(product: Product): number {
    if (!product._id || !product.stock) return 0;
    
    const inCart = this.cartService.getItemQuantity(product._id);
    return product.stock - inCart;
  }

  /**
   * ✅ Check if product can be added to cart
   */
  canAddToCart(product: Product): boolean {
    if (!product._id) return false;
    
    const validation = this.cartService.canAddToCart(product, 1);
    return validation.valid;
  }

  /**
   * ✅ Get stock status message for a product
   */
  getStockStatus(product: Product): string {
    if (!product.stock) return '';
    
    const inCart = this.getCartQuantity(product._id);
    const available = product.stock - inCart;
    
    if (available <= 0) {
      return '❌ Out of stock';
    } else if (available <= 5) {
      return `⚠️ Only ${available} left`;
    } else if (inCart > 0) {
      return `✅ ${inCart} in cart`;
    }
    
    return `✅ ${product.stock} in stock`;
  }

  /**
   * ✅ Check if product is low on stock
   */
  isLowStock(product: Product): boolean {
    if (!product.stock) return false;
    return product.stock <= (product.minStock || 5);
  }

  /**
   * ✅ Check if product is out of stock
   */
  isOutOfStock(product: Product): boolean {
    if (!product.stock) return false;
    
    const inCart = this.getCartQuantity(product._id);
    return (product.stock - inCart) <= 0;
  }

  getCartQuantity(productId?: string): number {
    if (!productId) return 0;
    return this.cartService.getItemQuantity(productId);
  }

  isInCart(productId?: string): boolean {
    if (!productId) return false;
    return this.cartService.isInCart(productId);
  }

  /**
   * ✅ Quick buy - add to cart and go directly to checkout
   */
  quickBuy(product: Product) {
    if (!product._id) {
      this.error = '❌ Cannot add product without ID';
      return;
    }

    // Validate product before quick buy
    const validation = this.cartService.canAddToCart(product, 1);
    
    if (!validation.valid) {
      this.error = validation.message || 'Cannot purchase this product';
      setTimeout(() => this.error = '', 5000);
      return;
    }

    // Clear cart and add only this product
    this.cartService.clearCart();
    const result = this.cartService.addToCart(product, 1);
    
    if (result.valid) {
      this.showSuccess(`✅ "${product.name}" added! Redirecting to checkout...`);
      setTimeout(() => {
        this.router.navigate(['/cart']);
      }, 500);
    } else {
      this.error = result.message || 'Failed to add to cart';
      setTimeout(() => this.error = '', 5000);
    }
  }

  /**
   * ✅ View cart (navigate to cart page)
   */
  viewCart() {
    this.router.navigate(['/cart']);
  }

  /**
   * ✅ Proceed to checkout from products page
   */
  proceedToCheckout() {
    const itemCount = this.cartService.getItemCount();
    
    if (itemCount === 0) {
      this.error = '❌ Your cart is empty. Add some products first.';
      setTimeout(() => this.error = '', 3000);
      return;
    }

    // Validate cart before checkout
    const validation = this.cartService.validateCart();
    
    if (!validation.valid) {
      this.error = '❌ Cart has validation errors. Please check your cart.';
      setTimeout(() => this.error = '', 5000);
      
      alert(
        '❌ Cart Validation Failed\n\n' +
        validation.errors.join('\n') +
        '\n\nPlease fix these issues before proceeding.'
      );
      return;
    }

    this.router.navigate(['/cart']);
  }

  // Helper methods
  getImageUrl(image?: string): string {
    if (!image) return '';
    
    if (image.startsWith('http://') || image.startsWith('https://')) {
      return image;
    }
    
    if (image.startsWith('/')) {
      return `http://localhost:3000${image}`;
    }
    
    return image;
  }

  handleImageError(event: any) {
    const imgElement = event.target as HTMLImageElement;
    if (imgElement) {
      imgElement.style.display = 'none';
    }
  }
}

export type { Product };