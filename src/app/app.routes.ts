import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'data-loader',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'data-loader',
    loadComponent: () => import('./pages/data-loader/data-loader.page').then(m => m.DataLoaderPage)
  },
  {
    path: 'pos',
    loadComponent: () => import('./pages/pos/pos.page').then(m => m.PosPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'pos-products',
    loadComponent: () => import('./pages/pos-products/pos-products.page').then(m => m.PosProductsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'menu',
    loadComponent: () => import('./pages/menu/menu.page').then(m => m.MenuPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'orders',
    loadComponent: () => import('./pages/orders/orders.page').then(m => m.OrdersPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'order-details/:id',
    loadComponent: () => import('./pages/order-details/order-details.page').then(m => m.OrderDetailsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'products',
    loadComponent: () => import('./pages/products/manage.page').then(m => m.ManagePage),
    canActivate: [AuthGuard]
  },
  {
    path: 'inventory',
    loadComponent: () => import('./pages/inventory/inventory.page').then(m => m.InventoryPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'accounts',
    loadComponent: () => import('./pages/accounts/accounts.page').then(m => m.AccountsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'reports',
    loadComponent: () => import('./pages/reports/sales.page').then(m => m.SalesPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'users',
    loadComponent: () => import('./pages/users/users.page').then(m => m.UsersPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'locations',
    loadComponent: () => import('./pages/locations/locations.page').then(m => m.LocationsPage),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: 'data-loader'
  }
];
