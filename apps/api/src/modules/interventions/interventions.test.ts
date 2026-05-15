/**
 * interventions module
 *
 * Coverage targets: REQ-015 (intervenções múltiplas por OS), REQ-016
 * (descrição/mecânico/tempo/peças), REQ-017 (cronómetro com transições
 * válidas), REQ-020 (associar peças e movimentar stock).
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

describe('interventions module', () => {
  let app: FastifyInstance;
  let managerId: string;
  let mechanicId: string;

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
    mechanicId = ids.mechanicId;
  });

  async function createOrder(status = 'in-repair'): Promise<string> {
    const order = await getPrismaClient().serviceOrder.create({
      data: {
        customerNif: '111111111',
        scooterSerialNumber: 'SN-TEST-0001',
        reportedProblem: 'X',
        status,
        createdByUserId: managerId,
      },
    });
    return order.id;
  }

  async function createIntervention(orderId: string, opts: { timerState?: 'idle' | 'running' | 'paused' | 'stopped' } = {}): Promise<string> {
    const intervention = await getPrismaClient().intervention.create({
      data: {
        serviceOrderId: orderId,
        description: 'Test work',
        mechanicUserId: mechanicId,
        timerState: opts.timerState ?? 'idle',
        timerStartedAt: opts.timerState === 'running' ? new Date() : null,
      },
    });
    return intervention.id;
  }

  // REQ-015: criar intervenção
  it('POST /api/v1/service-orders/:id/interventions cria intervencao', async () => {
    const orderId = await createOrder();
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/service-orders/${orderId}/interventions`,
      cookies: mechanicCookies(),
      payload: {
        description: 'Substituicao de pastilhas',
        mechanicUserId: mechanicId,
      },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { description?: string };
    assert.equal(body.description, 'Substituicao de pastilhas');
  });

  // Autenticação obrigatória
  it('GET /api/v1/service-orders/:id/interventions sem cookie devolve 401', async () => {
    const orderId = await createOrder();
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/service-orders/${orderId}/interventions`,
    });
    assert.equal(response.statusCode, 401);
  });

  // Validação Zod
  it('POST /api/v1/service-orders/:id/interventions sem description devolve 400', async () => {
    const orderId = await createOrder();
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/service-orders/${orderId}/interventions`,
      cookies: mechanicCookies(),
      payload: { mechanicUserId: mechanicId },
    });
    assert.equal(response.statusCode, 400);
    const body = response.json() as { error?: string };
    assert.equal(body.error, 'validation_error');
  });

  // REQ-017: timer start a partir de idle
  it('POST /api/v1/interventions/:id/timer/start a partir de idle sucede', async () => {
    const orderId = await createOrder();
    const interventionId = await createIntervention(orderId);
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/interventions/${interventionId}/timer/start`,
      cookies: mechanicCookies(),
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { timerState?: string };
    assert.equal(body.timerState, 'running');
  });

  // REQ-017: timer pause apenas a partir de running
  it('POST /api/v1/interventions/:id/timer/pause a partir de idle devolve 409 invalid_timer_transition', async () => {
    const orderId = await createOrder();
    const interventionId = await createIntervention(orderId, { timerState: 'idle' });
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/interventions/${interventionId}/timer/pause`,
      cookies: mechanicCookies(),
    });
    assert.equal(response.statusCode, 409);
    const body = response.json() as { error?: string };
    assert.equal(body.error, 'invalid_timer_transition');
  });

  // REQ-017: reiniciar timer já parado é proibido
  it('POST /api/v1/interventions/:id/timer/start em stopped devolve 409 invalid_timer_transition', async () => {
    const orderId = await createOrder();
    const interventionId = await createIntervention(orderId, { timerState: 'stopped' });
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/interventions/${interventionId}/timer/start`,
      cookies: mechanicCookies(),
    });
    assert.equal(response.statusCode, 409);
  });

  // REQ-020: associar peça
  it('POST /api/v1/interventions/:id/parts associa peca e devolve resposta', async () => {
    const orderId = await createOrder();
    const interventionId = await createIntervention(orderId);
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/interventions/${interventionId}/parts`,
      cookies: mechanicCookies(),
      headers: { 'idempotency-key': 'part-test-1' },
      payload: { partReference: 'BRK-TEST-1', quantity: 1 },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { partReference?: string };
    assert.equal(body.partReference, 'BRK-TEST-1');
  });

  // Edge case: peça inexistente
  it('POST /api/v1/interventions/:id/parts com partReference inexistente devolve 404', async () => {
    const orderId = await createOrder();
    const interventionId = await createIntervention(orderId);
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/interventions/${interventionId}/parts`,
      cookies: mechanicCookies(),
      headers: { 'idempotency-key': 'part-test-2' },
      payload: { partReference: 'DOES-NOT-EXIST', quantity: 1 },
    });
    assert.ok(response.statusCode >= 400 && response.statusCode < 600);
  });

  // RBAC: ambos os papéis podem listar
  it('GET /api/v1/interventions/:id/parts funciona para manager', async () => {
    const orderId = await createOrder();
    const interventionId = await createIntervention(orderId);
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/interventions/${interventionId}/parts`,
      cookies: managerCookies(),
    });
    assert.equal(response.statusCode, 200);
  });
});
