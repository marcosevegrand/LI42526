import type { FastifyPluginAsync } from 'fastify';

type PlaceholderModuleOptions = {
  name: string;
  prefix: string;
};

export function createPlaceholderModulePlugin(
  options: PlaceholderModuleOptions,
): FastifyPluginAsync {
  return async (app) => {
    app.get(`${options.prefix}/_meta`, async () => ({
      module: options.name,
      status: 'scaffolded',
    }));
  };
}
