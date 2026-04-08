import Fastify from 'fastify';

import { registerModules } from './bootstrap/register-modules';
import { registerPlugins } from './bootstrap/register-plugins';
import { createLoggerOptions } from './shared/observability/logger';
import { registerScheduledJobs } from './shared/scheduler/register-jobs';

export async function createApp() {
  const app = Fastify({
    logger: createLoggerOptions(),
  });

  await registerPlugins(app);
  await registerModules(app);
  registerScheduledJobs(app);

  return app;
}
