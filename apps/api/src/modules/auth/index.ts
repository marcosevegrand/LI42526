import { loginRequestSchema, loginResponseSchema, userSessionSchema } from '@gengis-khan/contracts';
import type { FastifyPluginAsync } from 'fastify';
import jwt from 'jsonwebtoken';

import { loadEnv } from '../../env';
import { appError } from '../../shared/auth/session';
import { AuthService } from './auth.service';

const authService = new AuthService();

export const authModule: FastifyPluginAsync = async (app) => {
  app.post('/api/v1/auth/login', async (request, reply) => {
    const parsed = loginRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    const env = loadEnv();
    const sessionUser = await authService.login(parsed.data);
    const token = jwt.sign(sessionUser, env.JWT_SECRET, {
      expiresIn: '12h',
    });

    reply.setCookie('session', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      domain: env.COOKIE_DOMAIN,
    });

    return loginResponseSchema.parse({
      user: sessionUser,
    });
  });

  app.get('/api/v1/auth/session', async (request) => {
    if (!request.sessionUser) {
      throw appError(401, 'unauthorized', 'Authentication required');
    }

    return loginResponseSchema.parse({
      user: request.sessionUser,
    });
  });

  app.get('/api/v1/auth/me', async (request) => {
    if (!request.sessionUser) {
      throw appError(401, 'unauthorized', 'Authentication required');
    }

    return userSessionSchema.parse(request.sessionUser);
  });

  app.post('/api/v1/auth/logout', async (_, reply) => {
    reply.clearCookie('session', {
      path: '/',
    });

    reply.status(204);
    return null;
  });
};
