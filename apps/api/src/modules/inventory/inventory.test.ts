/**
 * inventory module
 *
 * Coverage targets: REQ-019 (catálogo de peças), REQ-021 (movimentos
 * de stock), REQ-022 (alerta stock mínimo).
 */
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

import type { FastifyInstance } from 'fastify';

import { createApp } from '../../app';
import { getPrismaClient } from '../../shared/db/prisma';
import {
  cleanDatabase,
  disconnectPrisma,
  managerCookies,
  mechanicCookies,
  seedMinimal,
  setTestEnv,
} from '../../test/helpers';

describe('inventory module', () => {
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

  // REQ-019: listar catálogo
  it('GET /api/v1/parts devolve catalogo', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/parts',
      cookies: mechanicCookies(),
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as Array<unknown>;
    assert.ok(Array.isArray(body));
    assert.ok(body.length >= 1);
  });

  // Autenticação
  it('GET /api/v1/parts sem cookie devolve 401', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/parts' });
    assert.equal(response.statusCode, 401);
  });

  // REQ-019: criar peça (manager)
  it('POST /api/v1/parts como manager cria peca', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/parts',
      cookies: managerCookies(),
      payload: {
        partReference: 'NEW-001',
        description: 'Peca nova',
        supplierId,
        costPrice: '5.00',
        salePrice: '10.00',
        currentStock: 0,
        minimumStock: 1,
      },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { partReference?: string };
    assert.equal(body.partReference, 'NEW-001');
  });

  // RBAC: criar peça é manager-only
  it('POST /api/v1/parts como mechanic devolve 403', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/parts',
      cookies: mechanicCookies(),
      payload: {
        partReference: 'NEW-002',
        description: 'X',
        supplierId,
        costPrice: '5.00',
        salePrice: '10.00',
        currentStock: 0,
        minimumStock: 1,
      },
    });
    assert.equal(response.statusCode, 403);
  });

  // REQ-019: validação Zod (preço sem 2 casas)
  it('POST /api/v1/parts com preco invalido devolve 400 validation_error', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/parts',
      cookies: managerCookies(),
      payload: {
        partReference: 'BAD-001',
        description: 'X',
        supplierId,
        costPrice: '5',
        salePrice: '10.00',
        currentStock: 0,
        minimumStock: 1,
      },
    });
    assert.equal(response.statusCode, 400);
    const body = response.json() as { error?: string };
    assert.equal(body.error, 'validation_error');
  });

  // REQ-022: peças com low stock
  it('GET /api/v1/parts/low-stock devolve apenas pecas abaixo do minimo', async () => {
    await getPrismaClient().part.create({
      data: {
        partReference: 'LOW-001',
        description: 'Peca em rutura',
        supplierId,
        costPrice: '1.00',
        salePrice: '2.00',
        currentStock: 0,
        minimumStock: 5,
      },
    });
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/parts/low-stock',
      cookies: managerCookies(),
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as Array<{ partReference: string }>;
    assert.ok(body.some((p) => p.partReference === 'LOW-001'));
  });

  // REQ-021: movimento manual válido
  it('POST /api/v1/parts/:partReference/stock-adjustments aumenta stock', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/parts/BRK-TEST-1/stock-adjustments',
      cookies: managerCookies(),
      headers: { 'idempotency-key': 'adj-1' },
      payload: { quantityDelta: 5, note: 'Reposicao manual' },
    });
    assert.equal(response.statusCode, 200);
  });

  // REQ-021: ajuste que torna stock negativo é rejeitado
  it('POST /api/v1/parts/:partReference/stock-adjustments negativo excessivo devolve 409 invalid_stock_adjustment', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/parts/BRK-TEST-1/stock-adjustments',
      cookies: managerCookies(),
      headers: { 'idempotency-key': 'adj-2' },
      payload: { quantityDelta: -1000, note: 'forcar invalido' },
    });
    assert.equal(response.statusCode, 409);
    const body = response.json() as { error?: string };
    assert.equal(body.error, 'invalid_stock_adjustment');
  });

  // REQ-021: histórico de movimentos
  it('GET /api/v1/stock-movements devolve lista paginada', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stock-movements?limit=10',
      cookies: managerCookies(),
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as Array<unknown>;
    assert.ok(Array.isArray(body));
  });
});
