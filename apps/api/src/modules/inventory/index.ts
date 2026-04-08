import { createPlaceholderModulePlugin } from '../../shared/http/create-module-plugin';

export const inventoryModule = createPlaceholderModulePlugin({
  name: 'inventory',
  prefix: '/api/v1/parts',
});
