import { createPlaceholderModulePlugin } from '../../shared/http/create-module-plugin';

export const customersModule = createPlaceholderModulePlugin({
  name: 'customers',
  prefix: '/api/v1/customers',
});
