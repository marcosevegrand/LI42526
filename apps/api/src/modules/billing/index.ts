import { createPlaceholderModulePlugin } from '../../shared/http/create-module-plugin';

export const billingModule = createPlaceholderModulePlugin({
  name: 'billing',
  prefix: '/api/v1/invoices',
});
