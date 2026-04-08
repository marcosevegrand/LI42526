import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';

import { loadEnv } from '../../env';

export type SessionUser = {
  id: string;
  fullName: string;
  role: 'manager' | 'mechanic';
};

declare module 'fastify' {
  interface FastifyRequest {
    sessionUser: SessionUser | null;
  }
}

function readSessionUser(request: FastifyRequest): SessionUser | null {
  const env = loadEnv();
  const token = request.cookies.session;

  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, env.JWT_SECRET) as SessionUser;
  } catch {
    return null;
  }
}

const sessionPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest('sessionUser', null);

  app.addHook('preHandler', async (request) => {
    request.sessionUser = readSessionUser(request);
  });
};

export const registerSessionPlugin = fp(sessionPlugin);

export function requireRole(roles: SessionUser['role'][]) {
  return async function enforceRole(request: FastifyRequest) {
    if (!request.sessionUser) {
      throw appError(401, 'unauthorized', 'Authentication required');
    }

    if (!roles.includes(request.sessionUser.role)) {
      throw appError(403, 'forbidden', 'Insufficient permissions');
    }
  };
}

export function appError(statusCode: number, error: string, message: string) {
  return Object.assign(new Error(message), {
    statusCode,
    error,
  });
}
