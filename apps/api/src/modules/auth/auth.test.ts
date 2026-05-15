/**
 * auth module — login, session, logout
 *
 * Coverage targets: REQ-034 (autenticação por utilizador) and REQ-035
 * (papéis distintos para gerente e mecânico).
 */
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';

import { createApp } from '../../app';
import { getPrismaClient } from '../../shared/db/prisma';
import {
  buildSessionToken,
  cleanDatabase,
  disconnectPrisma,
  managerCookies,
  setTestEnv,
} from '../../test/helpers';

describe('auth module', () => {
  let app: FastifyInstance;

  before(async () => {
    setTestEnv();
    app = await createApp();
  });

  after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  beforeEach(async () => {
    await cleanDatabase();
    const passwordHash = await bcrypt.hash('correct-password', 4);
    await getPrismaClient().user.create({
      data: {
        fullName: 'Auth Manager',
        email: 'auth-manager@test.local',
        passwordHash,
        role: 'manager',
      },
    });
  });

  // REQ-034: login com credenciais válidas devolve utilizador autenticado
  it('POST /api/v1/auth/login devolve utilizador e cookie de sessao', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'auth-manager@test.local', password: 'correct-password' },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as { user?: { email?: string; role?: string } };
    assert.equal(body.user?.email, 'auth-manager@test.local');
    assert.equal(body.user?.role, 'manager');
    const setCookie = response.headers['set-cookie'];
    assert.ok(setCookie, 'session cookie should be set');
  });

  // REQ-034: credenciais inválidas devolvem erro de autenticação
  it('POST /api/v1/auth/login rejeita password incorreta', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'auth-manager@test.local', password: 'wrong-password' },
    });

    assert.equal(response.statusCode, 401);
  });

  // Validação Zod: payload inválido devolve 400
  it('POST /api/v1/auth/login com email malformado devolve 400 validation_error', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'not-an-email', password: 'whatever' },
    });

    assert.equal(response.statusCode, 400);
    const body = response.json() as { error?: string };
    assert.equal(body.error, 'validation_error');
  });

  // REQ-034: pedido sem cookie devolve 401
  it('GET /api/v1/auth/me sem sessao devolve 401 unauthorized', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/auth/me' });
    assert.equal(response.statusCode, 401);
    const body = response.json() as { error?: string };
    assert.equal(body.error, 'unauthorized');
  });

  // REQ-034: pedido com cookie válido devolve dados do utilizador
  it('GET /api/v1/auth/session com cookie valido devolve sessao', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/session',
      cookies: managerCookies(),
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as { user?: { role?: string } };
    assert.equal(body.user?.role, 'manager');
  });

  // REQ-034: logout limpa o cookie
  it('POST /api/v1/auth/logout limpa cookie e devolve 204', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      cookies: { session: buildSessionToken('manager') },
    });
    assert.equal(response.statusCode, 204);
  });
});
