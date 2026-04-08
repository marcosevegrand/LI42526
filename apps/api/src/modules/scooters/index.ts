import { createPlaceholderModulePlugin } from '../../shared/http/create-module-plugin';

export const scootersModule = createPlaceholderModulePlugin({
  name: 'scooters',
  prefix: '/api/v1/scooters',
});
