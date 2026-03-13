import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SupplierService, Supplier, PaymentTerms } from '../services/supplier.service';

@Component({
  selector: 'app-supplier',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './supplier.html',
})
export class SupplierComponent {
  suppliers = signal<Supplier[]>([]);
  loading = false;
  error = '';
  success = '';
  
  searchQuery = '';
  filterActive: boolean | undefined = undefined;
  filterPreferred: boolean | undefined = undefined;
  
  showForm = false;
  editMode = false;
  editingId = '';
  
  form!: FormGroup;

  paymentTermsOptions: PaymentTerms[] = ['COD', 'Net 7', 'Net 15', 'Net 30', 'Net 60'];

  constructor(
    private supplierService: SupplierService,
    private fb: FormBuilder
  ) {
    this.initForm();
    this.searchQuery = '';
    this.loadSuppliers();
  }

  initForm() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      companyName: [''],
      phone: ['', Validators.required],
      email: ['', [Validators.email]],
      address: [''],
      contactPerson: [''],
      website: [''],
      taxNumber: [''],
      paymentTerms: ['COD'],
      creditLimit: [0],
      isPreferred: [false],
      notes: [''],
    });
  }

  loadSuppliers() {
    this.loading = true;
    this.error = '';

    this.supplierService.getSuppliers({
      q: this.searchQuery || undefined,
      isActive: this.filterActive,
      isPreferred: this.filterPreferred,
      limit: 100,
    }).subscribe({
      next: (res) => {
        const list = res?.data || [];
        this.suppliers.set(list);
        this.loading = false;
      },
      error: (e) => {
        this.error = this.apiError(e, 'Failed to load suppliers');
        this.loading = false;
      },
    });
  }

  onSearch() {
    this.loadSuppliers();
  }

  onFilterChange() {
    this.loadSuppliers();
  }

  openCreateForm() {
    this.showForm = true;
    this.editMode = false;
    this.editingId = '';
    this.error = '';
    this.form.reset({
      paymentTerms: 'COD',
      creditLimit: 0,
      isPreferred: false,
    });
  }

  openEditForm(supplier: Supplier) {
    this.showForm = true;
    this.editMode = true;
    this.editingId = supplier._id!;
    this.error = '';
    
    this.form.patchValue({
      name: supplier.name,
      companyName: supplier.companyName || '',
      phone: supplier.phone,
      email: supplier.email || '',
      address: supplier.address || '',
      contactPerson: supplier.contactPerson || '',
      website: supplier.website || '',
      taxNumber: supplier.taxNumber || '',
      paymentTerms: supplier.paymentTerms || 'COD',
      creditLimit: supplier.creditLimit || 0,
      isPreferred: supplier.isPreferred || false,
      notes: supplier.notes || '',
    });
  }

  closeForm() {
    this.showForm = false;
    this.editMode = false;
    this.editingId = '';
    this.error = '';
    this.form.reset();
  }

  saveSupplier() {
    if (this.form.invalid) {
      this.error = 'Please fill in all required fields';
      return;
    }

    this.loading = true;
    this.error = '';

    const supplierData = this.form.value;
    const supplierName = supplierData.name;

    const request = this.editMode
      ? this.supplierService.updateSupplier(this.editingId, supplierData)
      : this.supplierService.createSupplier(supplierData);

    request.subscribe({
      next: () => {
        this.loading = false;
        const action = this.editMode ? 'updated' : 'created';
        this.showSuccess(`Supplier "${supplierName}" ${action} successfully!`);
        this.closeForm();
        this.loadSuppliers();
      },
      error: (e) => {
        this.loading = false;
        this.error = this.apiError(e, `Failed to ${this.editMode ? 'update' : 'create'} supplier`);
      },
    });
  }

  toggleActive(supplier: Supplier) {
    const action = supplier.isActive ? 'deactivate' : 'activate';
    
    if (!confirm(`Are you sure you want to ${action} "${supplier.name}"?`)) {
      return;
    }

    const request = supplier.isActive
      ? this.supplierService.deactivateSupplier(supplier._id!)
      : this.supplierService.activateSupplier(supplier._id!);

    request.subscribe({
      next: () => {
        const actionPast = supplier.isActive ? 'deactivated' : 'activated';
        this.showSuccess(`Supplier "${supplier.name}" ${actionPast} successfully!`);
        this.loadSuppliers();
      },
      error: (e) => {
        this.error = this.apiError(e, 'Failed to update supplier status');
      },
    });
  }

  deleteSupplier(id: string) {
    const supplier = this.suppliers().find(s => s._id === id);
    const supplierName = supplier?.name || 'this supplier';
    
    if (!confirm(`Are you sure you want to permanently delete "${supplierName}"?`)) {
      return;
    }

    this.supplierService.deleteSupplier(id).subscribe({
      next: () => {
        this.showSuccess(`Supplier "${supplierName}" deleted successfully!`);
        this.loadSuppliers();
      },
      error: (e) => {
        this.error = this.apiError(e, 'Failed to delete supplier');
      },
    });
  }

  private showSuccess(msg: string) {
    this.success = msg;
    setTimeout(() => this.success = '', 5000);
  }

  formatMoney(amount: any): string {
    return Number(amount || 0).toFixed(2);
  }

  formatDate(date: any): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  }

  private apiError(e: any, fallback: string): string {
    return e?.error?.message || e?.message || fallback;
  }

  get activeSuppliers() {
    return this.suppliers().filter(s => s.isActive).length;
  }

  get preferredSuppliers() {
    return this.suppliers().filter(s => s.isPreferred).length;
  }

  get totalPurchases() {
    return this.suppliers().reduce((sum, s) => sum + (s.totalPurchases || 0), 0);
  }
}