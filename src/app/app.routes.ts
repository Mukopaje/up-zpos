import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { posRedirectGuard } from './core/guards/pos-redirect.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'data-loader',
    pathMatch: 'full'
  },
  {
    path: 'license-login',
    loadComponent: () => import('./pages/auth/license-login/license-login.page').then(m => m.LicenseLoginPage)
  },
  {
    path: 'pin-login',
    loadComponent: () => import('./pages/auth/pin-login/pin-login.page').then(m => m.PinLoginPage)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'data-loader',
    loadComponent: () => import('./pages/data-loader/data-loader.page').then(m => m.DataLoaderPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'pos-retail',
    loadComponent: () => import('./pages/pos-retail/pos-retail.page').then(m => m.PosRetailPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'pos-category',
    loadComponent: () => import('./pages/pos-category/pos-category.page').then(m => m.PosCategoryPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'pos-hospitality',
    loadComponent: () => import('./pages/pos-hospitality/pos-hospitality.page').then(m => m.PosHospitalityPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'pos',
    canActivate: [posRedirectGuard],
    children: []
  },
  {
    path: 'pos-products',
    loadComponent: () => import('./pages/pos-products/pos-products.page').then(m => m.PosProductsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'checkout',
    loadComponent: () => import('./pages/checkout/checkout.page').then(m => m.CheckoutPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'printer-settings',
    loadComponent: () => import('./pages/printer-settings/printer-settings.page').then(m => m.PrinterSettingsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'customers',
    loadComponent: () => import('./pages/customers/customers.page').then(m => m.CustomersPage),
    canActivate: [AuthGuard]
  },
  /*
  {
    path: 'menu',
    loadComponent: () => import('./pages/menu/menu.page').then(m => m.MenuPage),
    canActivate: [AuthGuard]
  },
  */
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
    path: 'reports',
    loadComponent: () => import('./pages/reports/reports.page').then(m => m.ReportsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'products',
    loadComponent: () => import('./pages/products/products.page').then(m => m.ProductsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'products-management',
    loadComponent: () => import('./pages/products-management/products-management.page').then(m => m.ProductsManagementPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'inventory',
    loadComponent: () => import('./pages/inventory/inventory.page').then(m => m.InventoryPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'roles',
    loadComponent: () => import('./pages/roles/roles.page').then(m => m.RolesPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'users',
    loadComponent: () => import('./pages/users/users.page').then(m => m.UsersPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'terminals',
    loadComponent: () => import('./pages/terminals/terminals.page').then(m => m.TerminalsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'tables',
    loadComponent: () => import('./pages/tables/tables.page').then(m => m.TablesPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'waiters',
    loadComponent: () => import('./pages/waiters/waiters.page').then(m => m.WaitersPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'modifier-groups',
    loadComponent: () => import('./pages/modifier-groups/modifier-groups.page').then(m => m.ModifierGroupsPage),
    canActivate: [AuthGuard]
  },
  /*
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
  */
  {
    path: '**',
    redirectTo: 'data-loader'
  }
];
