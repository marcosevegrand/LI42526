import { createPlaceholderModulePlugin } from '../../shared/http/create-module-plugin';

export const serviceOrdersModule = createPlaceholderModulePlugin({
  name: 'service-orders',
  prefix: '/api/v1/service-orders',
});
