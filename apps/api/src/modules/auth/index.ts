import { createPlaceholderModulePlugin } from '../../shared/http/create-module-plugin';

export const authModule = createPlaceholderModulePlugin({
  name: 'auth',
  prefix: '/api/v1/auth',
});
