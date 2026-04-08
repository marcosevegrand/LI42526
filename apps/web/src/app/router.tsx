import { createBrowserRouter } from 'react-router-dom';

import { AppShell } from '../components/layout/app-shell';
import { RouteGuard } from '../lib/auth/route-guard';
import { AuthPage } from '../modules/auth/page';
import { BillingPage } from '../modules/billing/page';
import { CustomersPage } from '../modules/customers/page';
import { DashboardPage } from '../modules/dashboard/page';
import { InterventionsPage } from '../modules/interventions/page';
import { InventoryPage } from '../modules/inventory/page';
import { ReportsPage } from '../modules/reports/page';
import { ServiceOrdersPage } from '../modules/service-orders/page';
import { SettingsPage } from '../modules/settings/page';
import { ScootersPage } from '../modules/scooters/page';
import { SuppliersPage } from '../modules/suppliers/page';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthPage />,
  },
  {
    path: '/',
    element: (
      <RouteGuard>
        <AppShell />
      </RouteGuard>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'scooters', element: <ScootersPage /> },
      { path: 'service-orders', element: <ServiceOrdersPage /> },
      { path: 'interventions', element: <InterventionsPage /> },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'suppliers', element: <SuppliersPage /> },
      { path: 'billing', element: <BillingPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
