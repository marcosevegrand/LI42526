import type { FastifyServerOptions } from 'fastify';

export function createLoggerOptions(): FastifyServerOptions['logger'] {
  return {
    name: 'gengis-khan-api',
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  };
}
