import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';

import { loadEnv } from '../env';
import { registerSessionPlugin } from '../shared/auth/session';
import { registerErrorHandler } from '../shared/http/error-handler';
import { registerHealthRoute } from '../shared/http/health-route';

export async function registerPlugins(app: FastifyInstance) {
  const env = loadEnv();

  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      callback(null, isLocalOrigin);
    },
    credentials: true,
  });

  await app.register(cookie, {
    hook: 'onRequest',
    parseOptions: {
      httpOnly: true,
      sameSite: 'lax',
      domain: env.COOKIE_DOMAIN,
    },
  });

  await app.register(registerSessionPlugin);
  await registerHealthRoute(app);
  registerErrorHandler(app);
}
