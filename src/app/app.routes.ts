import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './login/login';
import { RegisterComponent } from './register/register';
import { DashboardComponent } from './dashboard/dashboard';
import { ProductsComponent } from './product/product';
import { CustomersComponent } from './customer/customer';
import { OrdersComponent } from './order/order';
import { SupplierComponent } from './supplier/supplier';
import { PaymentComponent } from './payment/payment';
import { CartComponent } from './cart/cart';
import { CartReportComponent } from './cart-report/cart-report';

export const routes: Routes = [
  { 
    path: '', 
    redirectTo: '/login', 
    pathMatch: 'full' 
  },
  { 
    path: 'login', 
    component: LoginComponent 
  },
  { 
    path: 'register', 
    component: RegisterComponent 
  },
  { 
    path: 'dashboard', 
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'order', 
    component: OrdersComponent, 
    canActivate: [authGuard],
    data: { roles: ['admin', 'manager', 'staff'] }
  },
  { 
    path: 'product', 
    component: ProductsComponent, 
    canActivate: [authGuard],
    data: { roles: ['admin', 'manager'] }
  },
  {
    path:'cart',component:CartComponent,
    canActivate:[authGuard],
    data:{roles:['admin','manager','staff','customer']}
  },
  {
    path:'cart-report',component:CartReportComponent,
     canActivate: [authGuard],
    data: { roles: ['admin', 'manager', 'staff'] }
  },
  { 
    path: 'customer', 
    component: CustomersComponent, 
    canActivate: [authGuard],
    data: { roles: ['admin', 'manager', 'staff'] }
  },
  {
    path:'checkout',component:PaymentComponent,
    canActivate:[authGuard],
    data:{roles:['admin','manager','staff']}
  },
  { 
    path: 'payment', 
    component: PaymentComponent, 
    canActivate: [authGuard],
    data: { roles: ['admin', 'manager', 'staff'] }
  },
  { 
    path: 'supplier', 
    component: SupplierComponent, 
    canActivate: [authGuard],
    data: { roles: ['admin', 'manager'] }
  },
  
  { 
    path: '**', 
    redirectTo: '/login' 
  }
];