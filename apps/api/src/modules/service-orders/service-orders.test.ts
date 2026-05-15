/**
 * service-orders module
 *
 * Coverage targets: REQ-009 (criação OS sequencial), REQ-010 (campos
 * obrigatórios), REQ-011 (estados), REQ-012 (registo automático de
 * transições), REQ-013 (entrega exige manager — RBAC), REQ-014 (resumo
 * por estado).
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

describe('service-orders module', () => {
  let app: FastifyInstance;
  let managerId: string;

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
    managerId = ids.managerId;
  });

  async function createOrder(overrides: Partial<{ customerNif: string; scooterSerialNumber: string; reportedProblem: string }> = {}): Promise<string> {
    const order = await getPrismaClient().serviceOrder.create({
      data: {
        customerNif: overrides.customerNif ?? '111111111',
        scooterSerialNumber: overrides.scooterSerialNumber ?? 'SN-TEST-0001',
        reportedProblem: overrides.reportedProblem ?? 'Travao avariado',
        status: 'received',
        createdByUserId: managerId,
      },
    });
    return order.id;
  }

  // REQ-009 + REQ-010: criar OS válida
  it('POST /api/v1/service-orders cria OS com estado received', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/service-orders',
      cookies: managerCookies(),
      payload: {
        customerNif: '111111111',
        scooterSerialNumber: 'SN-TEST-0001',
        reportedProblem: 'Bateria nao carrega',
      },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { status?: string; serviceOrderNumber?: number };
    assert.equal(body.status, 'received');
    assert.equal(typeof body.serviceOrderNumber, 'number');
  });

  // REQ-010: cliente inexistente
  it('POST /api/v1/service-orders com customerNif inexistente devolve 400 invalid_customer', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/service-orders',
      cookies: managerCookies(),
      payload: {
        customerNif: '000000000',
        scooterSerialNumber: 'SN-TEST-0001',
        reportedProblem: 'X',
      },
    });
    assert.equal(response.statusCode, 400);
    const body = response.json() as { error?: string };
    assert.equal(body.error, 'invalid_customer');
  });

  // REQ-010: scooter pertence a outro cliente
  it('POST /api/v1/service-orders com scooter de outro cliente devolve 400 invalid_scooter', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/service-orders',
      cookies: managerCookies(),
      payload: {
        customerNif: '222222222',
        scooterSerialNumber: 'SN-TEST-0001',
        reportedProblem: 'X',
      },
    });
    assert.equal(response.statusCode, 400);
    const body = response.json() as { error?: string };
    assert.equal(body.error, 'invalid_scooter');
  });

  // REQ-010: validação Zod (campo em falta)
  it('POST /api/v1/service-orders sem reportedProblem devolve 400 validation_error', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/service-orders',
      cookies: managerCookies(),
      payload: {
        customerNif: '111111111',
        scooterSerialNumber: 'SN-TEST-0001',
      },
    });
    assert.equal(response.statusCode, 400);
    const body = response.json() as { error?: string };
    assert.equal(body.error, 'validation_error');
  });

  // Autenticação obrigatória
  it('GET /api/v1/service-orders sem cookie devolve 401', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/service-orders' });
    assert.equal(response.statusCode, 401);
  });

  // REQ-011 + REQ-012: transição válida
  it('PATCH /api/v1/service-orders/:id/status received -> in-diagnosis sucede', async () => {
    const id = await createOrder();
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/service-orders/${id}/status`,
      cookies: mechanicCookies(),
      payload: { toStatus: 'in-diagnosis' },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { status?: string };
    assert.equal(body.status, 'in-diagnosis');
  });

  // REQ-011: transição inválida (received -> completed)
  it('PATCH /api/v1/service-orders/:id/status received -> completed devolve 409 invalid_status_transition', async () => {
    const id = await createOrder();
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/service-orders/${id}/status`,
      cookies: mechanicCookies(),
      payload: { toStatus: 'completed' },
    });
    assert.equal(response.statusCode, 409);
    const body = response.json() as { error?: string };
    assert.equal(body.error, 'invalid_status_transition');
  });

  // REQ-013: delivered exige role manager (mechanic é proibido)
  it('PATCH /api/v1/service-orders/:id/status para delivered como mechanic devolve 403 forbidden', async () => {
    const order = await getPrismaClient().serviceOrder.create({
      data: {
        customerNif: '111111111',
        scooterSerialNumber: 'SN-TEST-0001',
        reportedProblem: 'X',
        status: 'completed',
        createdByUserId: managerId,
      },
    });
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/service-orders/${order.id}/status`,
      cookies: mechanicCookies(),
      payload: { toStatus: 'delivered' },
    });
    assert.equal(response.statusCode, 403);
    const body = response.json() as { error?: string };
    assert.equal(body.error, 'forbidden');
  });

  // REQ-014: summary
  it('GET /api/v1/service-orders/summary devolve totais por estado', async () => {
    await createOrder();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/service-orders/summary?from=2020-01-01&to=2099-12-31',
      cookies: managerCookies(),
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { total?: number; byStatus?: Array<unknown> };
    assert.equal(typeof body.total, 'number');
    assert.ok(Array.isArray(body.byStatus));
  });

  // Edge case: OS inexistente
  it('GET /api/v1/service-orders/:id inexistente devolve 404', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/service-orders/non-existent-id',
      cookies: mechanicCookies(),
    });
    assert.equal(response.statusCode, 404);
  });
});
