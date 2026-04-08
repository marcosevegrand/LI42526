import { createPlaceholderModulePlugin } from '../../shared/http/create-module-plugin';

export const reportsModule = createPlaceholderModulePlugin({
  name: 'reports',
  prefix: '/api/v1/reports',
});
