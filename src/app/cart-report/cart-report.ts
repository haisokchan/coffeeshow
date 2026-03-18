// cart-report.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CartService, CartSnapshot, CartReportFilter } from '../services/cart.service';

@Component({
  selector: 'app-cart-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './cart-report.html'
})
export class CartReportComponent implements OnInit {
  carts:   CartSnapshot[] = [];
  summary  = { totalCarts: 0, totalItems: 0, totalValue: 0, avgTotal: 0 };
  meta     = { total: 0, page: 1, limit: 20, pages: 1 };

  loading  = false;
  error    = '';
  success  = '';
  printing = false;

  // Filters
  filterStatus = '';
  filterFrom   = '';
  filterTo     = '';
  filterSearch = '';

  // Receipt modal
  selectedCart: CartSnapshot | null = null;
  showDetail   = false;

  readonly STATUS_OPTIONS = [
    { value: '',            label: 'All Statuses' },
    { value: 'active',      label: '🟢 Active' },
    { value: 'saved',       label: '💾 Saved' },
    { value: 'checked_out', label: '✅ Checked Out' },
    { value: 'cleared',     label: '🗑️ Cleared' },
    { value: 'expired',     label: '⏰ Expired' }
  ];

  constructor(private cartService: CartService) {}

  ngOnInit() { this.loadReport(); }

  // ── Pagination helper (no pipe needed) ───────────────────
  get showingTo(): number {
    return Math.min(this.meta.page * this.meta.limit, this.meta.total);
  }
  get showingFrom(): number {
    return (this.meta.page - 1) * this.meta.limit + 1;
  }
  get pageNumbers(): number[] {
    return Array.from({ length: this.meta.pages }, (_, i) => i + 1);
  }

  // ── Data ──────────────────────────────────────────────────

  loadReport() {
    this.loading = true;
    this.error   = '';

    const f: CartReportFilter = { page: this.meta.page, limit: this.meta.limit };
    if (this.filterStatus) f.status = this.filterStatus;
    if (this.filterFrom)   f.from   = this.filterFrom;
    if (this.filterTo)     f.to     = this.filterTo;
    if (this.filterSearch) f.search = this.filterSearch;

    this.cartService.getSnapshots(f).subscribe({
      next: res => {
        this.loading = false;
        this.carts   = res.carts   || [];
        this.summary = res.summary || { totalCarts: 0, totalItems: 0, totalValue: 0, avgTotal: 0 };
        this.meta    = res.meta    || { total: 0, page: 1, limit: 20, pages: 1 };
      },
      error: err => {
        this.loading = false;
        this.error   = err?.error?.error || 'Failed to load cart report';
      }
    });
  }

  applyFilters() { this.meta.page = 1; this.loadReport(); }

  resetFilters() {
    this.filterStatus = '';
    this.filterFrom   = '';
    this.filterTo     = '';
    this.filterSearch = '';
    this.meta.page    = 1;
    this.loadReport();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.meta.pages) return;
    this.meta.page = page;
    this.loadReport();
  }

  // ── Row actions ───────────────────────────────────────────

  openDetail(cart: CartSnapshot) {
    this.selectedCart = cart;
    this.showDetail   = true;
  }

  closeDetail() {
    this.showDetail   = false;
    this.selectedCart = null;
  }

  /** Open receipt modal then trigger browser print */
  printCart(cart: CartSnapshot) {
    this.printing     = true;
    this.selectedCart = cart;
    this.showDetail   = true;

    // Give Angular one tick to render the receipt, then print
    setTimeout(() => {
      this.printing = false;
      window.print();
    }, 300);
  }

  sendToTelegram(cart: CartSnapshot) {
    this.cartService.sendSnapshotToTelegram(cart._id).subscribe({
      next: () => this.showSuccess(`Cart ${cart.cartNumber} sent to Telegram ✅`),
      error: err => this.showError(err?.error?.error || 'Failed to send to Telegram')
    });
  }

  /** ✅ Render receipt as JPG → forward to Telegram as photo */
  sendImageToTelegram(cart: CartSnapshot) {
    this.showSuccess(`📸 Rendering receipt image…`);
    this.cartService.sendReceiptImage(cart._id).subscribe({
      next: (res: any) => this.showSuccess(`📸 Receipt image sent to Telegram! ${cart.cartNumber}`),
      error: err  => this.showError(err?.error?.error || 'Failed to send image to Telegram')
    });
  }

  /** ✅ Download receipt as JPG to local device */
  downloadJpg(cart: CartSnapshot) {
    this.showSuccess(`⏳ Generating JPG…`);
    this.cartService.downloadReceiptJpg(cart._id).subscribe({
      next: (blob: Blob) => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = `receipt-${cart.cartNumber}.jpg`;
        link.click();
        URL.revokeObjectURL(url);
        this.showSuccess(`✅ Receipt downloaded as JPG`);
      },
      error: err => this.showError(err?.error?.error || 'Failed to download JPG')
    });
  }

  updateStatus(cart: CartSnapshot, status: string) {
    this.cartService.updateSnapshotStatus(cart._id, status).subscribe({
      next: () => {
        cart.status = status as any;
        this.showSuccess(`Status updated to "${status}"`);
      },
      error: err => this.showError(err?.error?.error || 'Failed to update status')
    });
  }

  deleteCart(cart: CartSnapshot) {
    if (!confirm(`Delete ${cart.cartNumber}? This cannot be undone.`)) return;
    this.cartService.deleteSnapshot(cart._id).subscribe({
      next: () => {
        this.carts = this.carts.filter(c => c._id !== cart._id);
        this.summary.totalCarts = Math.max(0, this.summary.totalCarts - 1);
        this.showSuccess(`${cart.cartNumber} deleted`);
      },
      error: err => this.showError(err?.error?.error || 'Failed to delete')
    });
  }

  // ── Display helpers ───────────────────────────────────────

  formatMoney(v: number): string { return (v || 0).toFixed(2); }

  formatDate(d: string): string {
    return new Date(d).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = {
      active: '🟢 Active', saved: '💾 Saved',
      checked_out: '✅ Checked Out', cleared: '🗑️ Cleared', expired: '⏰ Expired'
    };
    return m[s] || s;
  }

  statusClass(s: string): string {
    const m: Record<string, string> = {
      active:      'bg-emerald-100 text-emerald-700 border-emerald-200',
      saved:       'bg-blue-100 text-blue-700 border-blue-200',
      checked_out: 'bg-violet-100 text-violet-700 border-violet-200',
      cleared:     'bg-stone-100 text-stone-600 border-stone-200',
      expired:     'bg-amber-100 text-amber-700 border-amber-200'
    };
    return m[s] || 'bg-stone-100 text-stone-600 border-stone-200';
  }

  getCategoryIcon(cat: string): string {
    const m: Record<string, string> = {
      Coffee: '☕', Tea: '🍵', Drink: '🥤', Food: '🍽️', Dessert: '🍰'
    };
    return m[cat] || '📦';
  }

  // ── Toasts ────────────────────────────────────────────────

  private showSuccess(msg: string) {
    this.success = msg; this.error = '';
    setTimeout(() => { this.success = ''; }, 3500);
  }
  private showError(msg: string) {
    this.error = msg; this.success = '';
    setTimeout(() => { this.error = ''; }, 5000);
  }
}