import { createPlaceholderModulePlugin } from '../../shared/http/create-module-plugin';

export const suppliersProcurementModule = createPlaceholderModulePlugin({
  name: 'suppliers-procurement',
  prefix: '/api/v1/purchase-orders',
});
