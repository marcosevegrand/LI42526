/**
 * suppliers-procurement module
 *
 * Coverage targets: REQ-024 (histórico de encomendas), REQ-025 (dados
 * de fornecedor).
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

describe('suppliers-procurement module', () => {
  let app: FastifyInstance;
  let supplierId: string;

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
    const ids = await seedMinimal();
    supplierId = ids.supplierId;
  });

  // REQ-025: listar fornecedores
  it('GET /api/v1/suppliers devolve lista', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/suppliers',
      cookies: mechanicCookies(),
    });
    assert.equal(response.statusCode, 200);
  });

  // Autenticação
  it('GET /api/v1/suppliers sem cookie devolve 401', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/suppliers' });
    assert.equal(response.statusCode, 401);
  });

  // REQ-025: criar fornecedor (manager)
  it('POST /api/v1/suppliers como manager cria fornecedor', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/suppliers',
      cookies: managerCookies(),
      payload: {
        name: 'NewCo',
        email: 'newco@test.local',
        phone: '+351 911 222 333',
        paymentTerms: '30 dias',
      },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { name?: string };
    assert.equal(body.name, 'NewCo');
  });

  // RBAC: mechanic não pode criar fornecedor
  it('POST /api/v1/suppliers como mechanic devolve 403', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/suppliers',
      cookies: mechanicCookies(),
      payload: {
        name: 'NopeCo',
        email: 'nope@test.local',
        phone: '+351 911 222 333',
        paymentTerms: '30 dias',
      },
    });
    assert.equal(response.statusCode, 403);
  });

  // Validação Zod
  it('POST /api/v1/suppliers com email invalido devolve 400 validation_error', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/suppliers',
      cookies: managerCookies(),
      payload: {
        name: 'BadEmail',
        email: 'not-an-email',
        phone: '+351 911 222 333',
        paymentTerms: '30 dias',
      },
    });
    assert.equal(response.statusCode, 400);
    const body = response.json() as { error?: string };
    assert.equal(body.error, 'validation_error');
  });

  // REQ-024: criar encomenda válida
  it('POST /api/v1/purchase-orders cria encomenda', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/purchase-orders',
      cookies: managerCookies(),
      headers: { 'idempotency-key': 'po-test-1' },
      payload: {
        supplierId,
        items: [{ partReference: 'BRK-TEST-1', quantity: 5 }],
      },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { status?: string };
    assert.equal(body.status, 'requested');
  });

  // REQ-024: listar encomendas
  it('GET /api/v1/purchase-orders devolve lista (manager)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/purchase-orders',
      cookies: managerCookies(),
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as Array<unknown>;
    assert.ok(Array.isArray(body));
  });

  // Edge case: encomenda inexistente
  it('GET /api/v1/purchase-orders/:id inexistente devolve 404', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/purchase-orders/does-not-exist',
      cookies: managerCookies(),
    });
    assert.equal(response.statusCode, 404);
  });
});
