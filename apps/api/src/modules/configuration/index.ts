import { createPlaceholderModulePlugin } from '../../shared/http/create-module-plugin';

export const configurationModule = createPlaceholderModulePlugin({
  name: 'configuration',
  prefix: '/api/v1/config',
});
