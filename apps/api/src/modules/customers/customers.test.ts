/**
 * customers module
 *
 * Coverage targets: REQ-001 (registo de clientes), REQ-002 (distinção
 * particular/empresarial), REQ-003 (campos empresariais), REQ-004 (NIF
 * único), REQ-005 (histórico do cliente), REQ-006 (edição de contactos).
 */
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

import type { FastifyInstance } from 'fastify';

import { createApp } from '../../app';
import {
  cleanDatabase,
  disconnectPrisma,
  managerCookies,
  mechanicCookies,
  seedMinimal,
  setTestEnv,
} from '../../test/helpers';

describe('customers module', () => {
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
    await seedMinimal();
  });

  // REQ-001: listagem básica para utilizadores autenticados
  it('GET /api/v1/customers devolve lista para mechanic e manager', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/customers',
      cookies: mechanicCookies(),
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as Array<unknown>;
    assert.ok(Array.isArray(body));
    assert.ok(body.length >= 2);
  });

  // Autenticação obrigatória
  it('GET /api/v1/customers sem cookie devolve 401 unauthorized', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/customers' });
    assert.equal(response.statusCode, 401);
  });

  // REQ-001 + RBAC: criar cliente é restrito ao manager
  it('POST /api/v1/customers como mechanic devolve 403 forbidden', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/customers',
      cookies: mechanicCookies(),
      payload: {
        nif: '999888777',
        customerType: 'personal',
        fullName: 'Should Reject',
        email: 'reject@test.local',
        phone: '+351 911 000 000',
      },
    });
    assert.equal(response.statusCode, 403);
  });

  // REQ-001: happy path de criação
  it('POST /api/v1/customers como manager cria particular', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/customers',
      cookies: managerCookies(),
      payload: {
        nif: '987654321',
        customerType: 'personal',
        fullName: 'Novo Cliente',
        email: 'novo@test.local',
        phone: '+351 912 000 000',
      },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { nif?: string };
    assert.equal(body.nif, '987654321');
  });

  // REQ-004: NIF inválido falha validação Zod
  it('POST /api/v1/customers com NIF invalido devolve 400 validation_error', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/customers',
      cookies: managerCookies(),
      payload: {
        nif: '123',
        customerType: 'personal',
        fullName: 'Bad NIF',
        email: 'bad@test.local',
        phone: '+351 912 000 000',
      },
    });
    assert.equal(response.statusCode, 400);
    const body = response.json() as { error?: string };
    assert.equal(body.error, 'validation_error');
  });

  // REQ-003: campos obrigatórios para empresariais
  it('POST /api/v1/customers business sem legalName devolve 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/customers',
      cookies: managerCookies(),
      payload: {
        nif: '555444333',
        customerType: 'business',
        fullName: 'Empresa Sem LegalName',
        email: 'empresa@test.local',
        phone: '+351 912 000 000',
      },
    });
    assert.equal(response.statusCode, 400);
  });

  // REQ-005: GET /:nif devolve cliente existente
  it('GET /api/v1/customers/:nif devolve cliente seedado', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/customers/111111111',
      cookies: mechanicCookies(),
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { nif?: string };
    assert.equal(body.nif, '111111111');
  });

  // REQ-005: NIF inexistente devolve 404
  it('GET /api/v1/customers/:nif inexistente devolve 404', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/customers/000000000',
      cookies: mechanicCookies(),
    });
    assert.equal(response.statusCode, 404);
  });

  // REQ-006: edição de contactos
  it('PATCH /api/v1/customers/:nif como manager atualiza contactos', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/customers/111111111',
      cookies: managerCookies(),
      payload: { phone: '+351 999 999 999' },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { phone?: string };
    assert.equal(body.phone, '+351 999 999 999');
  });
});
