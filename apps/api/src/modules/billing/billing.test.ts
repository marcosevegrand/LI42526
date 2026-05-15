/**
 * billing module
 *
 * Coverage targets: REQ-026 (cálculo automático), REQ-027 (geração a
 * partir de OS concluída), REQ-028 (discriminação peças/horas/IVA),
 * REQ-029 (numeração sequencial), REQ-031 (estado de pagamento),
 * REQ-032 (faturas pendentes — manager-only).
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

describe('billing module', () => {
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

  async function createOrder(status: string): Promise<string> {
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

  // RBAC: faturação é manager-only — mechanic não tem acesso à listagem
  it('GET /api/v1/invoices como mechanic devolve 403', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/invoices',
      cookies: mechanicCookies(),
    });
    assert.equal(response.statusCode, 403);
  });

  // Autenticação
  it('GET /api/v1/invoices sem cookie devolve 401', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/invoices' });
    assert.equal(response.statusCode, 401);
  });

  // REQ-027: emissão sobre OS concluída sucede
  it('POST /api/v1/invoices sobre OS concluida emite fatura', async () => {
    const orderId = await createOrder('completed');
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/invoices',
      cookies: managerCookies(),
      headers: { 'idempotency-key': `inv-${orderId}` },
      payload: { serviceOrderId: orderId, paymentMethod: 'Multibanco' },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { paymentStatus?: string; total?: string };
    assert.equal(body.paymentStatus, 'pending');
    assert.ok(body.total);
  });

  // REQ-027: OS não concluída — bloqueio com 409 service_order_not_billable
  it('POST /api/v1/invoices sobre OS in-repair devolve 409 service_order_not_billable', async () => {
    const orderId = await createOrder('in-repair');
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/invoices',
      cookies: managerCookies(),
      headers: { 'idempotency-key': `inv-bad-${orderId}` },
      payload: { serviceOrderId: orderId, paymentMethod: 'Multibanco' },
    });
    assert.equal(response.statusCode, 409);
    const body = response.json() as { error?: string };
    assert.equal(body.error, 'service_order_not_billable');
  });

  // Domínio: segunda fatura sobre a mesma OS — 409 invoice_already_exists
  it('POST /api/v1/invoices duas vezes sobre a mesma OS devolve 409 invoice_already_exists', async () => {
    const orderId = await createOrder('completed');
    await app.inject({
      method: 'POST',
      url: '/api/v1/invoices',
      cookies: managerCookies(),
      headers: { 'idempotency-key': `inv-dup-1-${orderId}` },
      payload: { serviceOrderId: orderId, paymentMethod: 'Multibanco' },
    });
    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/invoices',
      cookies: managerCookies(),
      headers: { 'idempotency-key': `inv-dup-2-${orderId}` },
      payload: { serviceOrderId: orderId, paymentMethod: 'MB Way' },
    });
    assert.equal(second.statusCode, 409);
    const body = second.json() as { error?: string };
    assert.equal(body.error, 'invoice_already_exists');
  });

  // Validação Zod
  it('POST /api/v1/invoices sem paymentMethod devolve 400 validation_error', async () => {
    const orderId = await createOrder('completed');
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/invoices',
      cookies: managerCookies(),
      headers: { 'idempotency-key': `inv-bad-${orderId}` },
      payload: { serviceOrderId: orderId },
    });
    assert.equal(response.statusCode, 400);
  });

  // REQ-031: registar pagamento numa fatura pendente
  it('POST /api/v1/invoices/:id/payments marca fatura como paga', async () => {
    const orderId = await createOrder('completed');
    const issued = await app.inject({
      method: 'POST',
      url: '/api/v1/invoices',
      cookies: managerCookies(),
      headers: { 'idempotency-key': `inv-pay-${orderId}` },
      payload: { serviceOrderId: orderId, paymentMethod: 'Multibanco' },
    });
    const invoice = issued.json() as { id: string };
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/invoices/${invoice.id}/payments`,
      cookies: managerCookies(),
      headers: { 'idempotency-key': `pay-${invoice.id}` },
      payload: { paymentMethod: 'Multibanco' },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { paymentStatus?: string };
    assert.equal(body.paymentStatus, 'paid');
  });

  // Edge case: GET fatura inexistente
  it('GET /api/v1/invoices/:id inexistente devolve 404', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/invoices/does-not-exist',
      cookies: managerCookies(),
    });
    assert.equal(response.statusCode, 404);
  });

  // REQ-032: faturas empresariais pendentes (manager-only)
  it('GET /api/v1/invoices/pending-business como manager devolve 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/invoices/pending-business',
      cookies: managerCookies(),
    });
    assert.equal(response.statusCode, 200);
  });
});
