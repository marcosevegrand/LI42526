/**
 * configuration module
 *
 * Coverage targets: REQ-030 (parametrizar taxa horária e IVA — manager-only).
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

describe('configuration module', () => {
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

  // REQ-030: leitura de parâmetros financeiros
  it('GET /api/v1/config/financial-parameters como manager devolve config', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/config/financial-parameters',
      cookies: managerCookies(),
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { hourlyLaborRate?: string; vatRate?: string };
    assert.ok(body.hourlyLaborRate);
    assert.ok(body.vatRate);
  });

  // RBAC: leitura é manager-only
  it('GET /api/v1/config/financial-parameters como mechanic devolve 403', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/config/financial-parameters',
      cookies: mechanicCookies(),
    });
    assert.equal(response.statusCode, 403);
  });

  // Autenticação
  it('GET /api/v1/config/financial-parameters sem cookie devolve 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/config/financial-parameters',
    });
    assert.equal(response.statusCode, 401);
  });

  // REQ-030: atualização de IVA e taxa horária
  it('PATCH /api/v1/config/financial-parameters atualiza valores', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/config/financial-parameters',
      cookies: managerCookies(),
      payload: { hourlyLaborRate: '40.00', vatRate: '23.00' },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { hourlyLaborRate?: string };
    assert.equal(body.hourlyLaborRate, '40.00');
  });

  // RBAC: PATCH é manager-only
  it('PATCH /api/v1/config/financial-parameters como mechanic devolve 403', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/config/financial-parameters',
      cookies: mechanicCookies(),
      payload: { hourlyLaborRate: '40.00', vatRate: '23.00' },
    });
    assert.equal(response.statusCode, 403);
  });

  // Validação Zod: taxa horária mal formatada
  it('PATCH com valor monetario invalido devolve 400 validation_error', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/config/financial-parameters',
      cookies: managerCookies(),
      payload: { hourlyLaborRate: '40', vatRate: '23.00' },
    });
    assert.equal(response.statusCode, 400);
    const body = response.json() as { error?: string };
    assert.equal(body.error, 'validation_error');
  });
});
