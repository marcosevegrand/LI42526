/**
 * reports module
 *
 * Coverage targets: REQ-033 (relatórios filtráveis por período sobre
 * faturação, custos, peças, avarias frequentes, produtividade).
 * Todos os endpoints são manager-only.
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

const period = 'from=2020-01-01&to=2099-12-31';

describe('reports module', () => {
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

  // REQ-033: relatório operacional (manager-only)
  it('GET /api/v1/reports/operations como manager devolve 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/operations?${period}`,
      cookies: managerCookies(),
    });
    assert.equal(response.statusCode, 200);
  });

  // RBAC
  it('GET /api/v1/reports/operations como mechanic devolve 403', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/operations?${period}`,
      cookies: mechanicCookies(),
    });
    assert.equal(response.statusCode, 403);
  });

  // Autenticação
  it('GET /api/v1/reports/operations sem cookie devolve 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/operations?${period}`,
    });
    assert.equal(response.statusCode, 401);
  });

  // REQ-033: relatório de faturação
  it('GET /api/v1/reports/billing devolve 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/billing?${period}`,
      cookies: managerCookies(),
    });
    assert.equal(response.statusCode, 200);
  });

  // REQ-033: relatório de custos
  it('GET /api/v1/reports/costs devolve 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/costs?${period}`,
      cookies: managerCookies(),
    });
    assert.equal(response.statusCode, 200);
  });

  // REQ-033: peças mais usadas
  it('GET /api/v1/reports/parts-usage devolve lista', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/parts-usage?${period}`,
      cookies: managerCookies(),
    });
    assert.equal(response.statusCode, 200);
  });

  // REQ-033: avarias frequentes
  it('GET /api/v1/reports/common-failures devolve resposta', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/common-failures?${period}`,
      cookies: managerCookies(),
    });
    assert.equal(response.statusCode, 200);
  });

  // REQ-033: produtividade
  it('GET /api/v1/reports/mechanic-productivity devolve resposta', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/mechanic-productivity?${period}`,
      cookies: managerCookies(),
    });
    assert.equal(response.statusCode, 200);
  });

  // Validação: período mal formatado
  it('GET /api/v1/reports/billing com datas invalidas devolve 400', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/billing?from=not-a-date&to=2099-12-31',
      cookies: managerCookies(),
    });
    assert.equal(response.statusCode, 400);
  });
});
