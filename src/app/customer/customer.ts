import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { CustomerService } from '../services/customer.service';
import { ProductService, Product } from '../services/product.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './customer.html',
})
export class CustomersComponent {
  private fb = inject(FormBuilder);
  private customersApi = inject(CustomerService);
  private productsApi = inject(ProductService);

  loading = false;
  error = '';
  query = '';

  customers = signal<any[]>([]);
  products = signal<Product[]>([]);

  // ✅ Toast popup
  toastOpen = false;
  toastMessage = '';

  // ✅ Edit modal popup
  editOpen = false;
  editError = '';
  editingCustomerId: string | null = null;

  // LEFT: create form only
  form = this.fb.group({
    name: ['', Validators.required],
    phone: ['', Validators.required],
    email: [''],
    address: [''],
    favoriteProductIds: [[] as string[]],
  });

  // MODAL: edit form
  editForm = this.fb.group({
    name: ['', Validators.required],
    phone: ['', Validators.required],
    email: [''],
    address: [''],
    favoriteProductIds: [[] as string[]],
  });

  constructor() {
    this.loadProducts();
    this.loadCustomers();
  }

  // -------------------------
  // LOAD
  // -------------------------
  loadCustomers() {
    this.error = '';
    this.customersApi.getCustomers(this.query).subscribe({
      next: (res) => this.customers.set(res.customers || []),
      error: (e) => (this.error = e?.error?.error || 'Load customers failed'),
    });
  }

  loadProducts() {
    // if your ProductService requires 2 params, pass: ('','')
    this.productsApi.getProducts('', '').subscribe({
      next: (res: any) => this.products.set(res.products || []),
      error: () => {},
    });
  }

  // -------------------------
  // TOAST
  // -------------------------
  openToast(msg: string) {
    this.toastMessage = msg;
    this.toastOpen = true;
  }

  closeToast() {
    this.toastOpen = false;
  }

  // -------------------------
  // CREATE (LEFT FORM)
  // -------------------------
  save() {
    if (this.form.invalid) return;

    this.loading = true;
    this.error = '';

    const v = this.form.value as any;
    const payload = { name: v.name, phone: v.phone, email: v.email, address: v.address };
    const favIds = (v.favoriteProductIds || []) as string[];

    this.customersApi.createCustomer(payload).subscribe({
      next: (res) => {
        const id = res.customer?._id;
        if (!id) {
          this.loading = false;
          this.error = 'Created but missing customer id';
          return;
        }

        this.customersApi.setFavorites(id, favIds).subscribe({
          next: () => {
            this.loading = false;
            this.openToast('Customer created successfully!');
            this.form.reset({ name: '', phone: '', email: '', address: '', favoriteProductIds: [] });
            this.loadCustomers();
          },
          error: () => {
            this.loading = false;
            this.openToast('Customer created, but favorites failed.');
            this.form.reset({ name: '', phone: '', email: '', address: '', favoriteProductIds: [] });
            this.loadCustomers();
          },
        });
      },
      error: (e) => {
        this.loading = false;
        this.error = e?.error?.error || 'Create failed';
      },
    });
  }

  // -------------------------
  // EDIT MODAL
  // -------------------------
  openEdit(c: any) {
    this.editError = '';
    this.editOpen = true;
    this.editingCustomerId = c._id;

    this.editForm.patchValue({
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      address: c.address || '',
      favoriteProductIds: (c.favoriteProducts || []).map((p: any) => p._id),
    });
  }

  closeEdit() {
    this.editOpen = false;
    this.editError = '';
    this.editingCustomerId = null;
    this.editForm.reset({ name: '', phone: '', email: '', address: '', favoriteProductIds: [] });
  }

  updateFromModal() {
    if (this.editForm.invalid || !this.editingCustomerId) return;

    this.loading = true;
    this.editError = '';

    const v = this.editForm.value as any;
    const payload = { name: v.name, phone: v.phone, email: v.email, address: v.address };
    const favIds = (v.favoriteProductIds || []) as string[];

    this.customersApi.updateCustomer(this.editingCustomerId, payload).subscribe({
      next: () => {
        this.customersApi.setFavorites(this.editingCustomerId!, favIds).subscribe({
          next: () => {
            this.loading = false;
            this.openToast('Customer updated successfully!');
            this.closeEdit();
            this.loadCustomers();
          },
          error: () => {
            this.loading = false;
            this.openToast('Customer updated, but favorites failed.');
            this.closeEdit();
            this.loadCustomers();
          },
        });
      },
      error: (e) => {
        this.loading = false;
        this.editError = e?.error?.error || 'Update failed';
      },
    });
  }

  // -------------------------
  // DELETE (SOFT)
  // -------------------------
  deactivate(id: string) {
    if (!confirm('Deactivate this customer?')) return;

    this.customersApi.deactivateCustomer(id).subscribe({
      next: () => this.loadCustomers(),
      error: () => (this.error = 'Deactivate failed'),
    });
  }
}
