import { createPlaceholderModulePlugin } from '../../shared/http/create-module-plugin';

export const notificationsModule = createPlaceholderModulePlugin({
  name: 'notifications',
  prefix: '/api/v1/notifications',
});
