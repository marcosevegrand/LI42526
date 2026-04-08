import { createPlaceholderModulePlugin } from '../../shared/http/create-module-plugin';

export const interventionsModule = createPlaceholderModulePlugin({
  name: 'interventions',
  prefix: '/api/v1/interventions',
});
