/**
 * scooters module
 *
 * Coverage targets: REQ-007 (registo de trotinete com nº de série único),
 * REQ-008 (histórico de reparações por nº de série).
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

describe('scooters module', () => {
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

  // REQ-007: listar trotinetes (autenticado)
  it('GET /api/v1/scooters devolve lista', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/scooters',
      cookies: mechanicCookies(),
    });
    assert.equal(response.statusCode, 200);
  });

  it('GET /api/v1/scooters sem cookie devolve 401', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/scooters' });
    assert.equal(response.statusCode, 401);
  });

  // REQ-007: criar trotinete (happy path)
  it('POST /api/v1/scooters cria trotinete com numero de serie unico', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/scooters',
      cookies: managerCookies(),
      payload: {
        serialNumber: 'SN-NEW-0001',
        brand: 'Segway',
        model: 'Ninebot Max',
        customerNif: '111111111',
      },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { serialNumber?: string };
    assert.equal(body.serialNumber, 'SN-NEW-0001');
  });

  // REQ-007: número de série duplicado é rejeitado
  it('POST /api/v1/scooters com serialNumber duplicado devolve erro', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/scooters',
      cookies: managerCookies(),
      payload: {
        serialNumber: 'SN-TEST-0001',
        brand: 'Xiaomi',
        model: 'Pro 2',
        customerNif: '111111111',
      },
    });
    assert.ok(response.statusCode >= 400 && response.statusCode < 600);
  });

  // Validação Zod
  it('POST /api/v1/scooters sem brand devolve 400 validation_error', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/scooters',
      cookies: managerCookies(),
      payload: {
        serialNumber: 'SN-BAD-0001',
        model: 'X',
        customerNif: '111111111',
      },
    });
    assert.equal(response.statusCode, 400);
    const body = response.json() as { error?: string };
    assert.equal(body.error, 'validation_error');
  });

  // REQ-008: detalhe por número de série
  it('GET /api/v1/scooters/:serialNumber devolve trotinete', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/scooters/SN-TEST-0001',
      cookies: mechanicCookies(),
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { serialNumber?: string };
    assert.equal(body.serialNumber, 'SN-TEST-0001');
  });

  // REQ-008: trotinete inexistente devolve 404
  it('GET /api/v1/scooters/:serialNumber inexistente devolve 404', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/scooters/SN-DOES-NOT-EXIST',
      cookies: mechanicCookies(),
    });
    assert.equal(response.statusCode, 404);
  });

  // REQ-008: histórico de reparações por nº de série
  it('GET /api/v1/scooters/:serialNumber/repairs devolve lista (eventualmente vazia)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/scooters/SN-TEST-0001/repairs',
      cookies: mechanicCookies(),
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as Array<unknown>;
    assert.ok(Array.isArray(body));
  });
});
