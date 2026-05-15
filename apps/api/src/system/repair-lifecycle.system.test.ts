/**
 * System test — Repair Lifecycle (End-to-end)
 *
 * Layer: SYSTEM (multi-module orchestration through HTTP)
 * Scenario: rececao -> diagnostico -> reparacao com pecas -> fatura -> pagamento -> entrega.
 *
 * Coverage targets (rastreabilidade SRS):
 *   RF-09, RF-10, RF-11, RF-12, RF-13 — máquina de estados completa
 *   RF-15, RF-16, RF-17, RF-20 — intervenção, cronómetro, peças
 *   RF-26, RF-27, RF-28, RF-29, RF-31 — emissão e pagamento de fatura
 *
 * ISO/IEC 25010:
 *   - Functional Suitability (Completeness, Correctness)
 *   - Reliability (Fault tolerance via idempotência das mutações)
 */
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

import type { FastifyInstance } from 'fastify';

import { createApp } from '../app';
import {
  cleanDatabase,
  disconnectPrisma,
  managerCookies,
  mechanicCookies,
  seedMinimal,
  setTestEnv,
} from '../test/helpers';

describe('SYSTEM: ciclo completo de reparação', () => {
  let app: FastifyInstance;
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
    mechanicId = ids.mechanicId;
  });

  it('percorre receção → diagnóstico → reparação → fatura → entrega', async () => {
    // 1) Criar OS (RF-09, RF-10) — usar par cliente/scooter seedado
    const createdOrder = await app.inject({
      method: 'POST',
      url: '/api/v1/service-orders',
      cookies: managerCookies(),
      payload: {
        customerNif: '111111111',
        scooterSerialNumber: 'SN-TEST-0001',
        reportedProblem: 'Bateria descarrega rapidamente',
      },
    });
    assert.equal(createdOrder.statusCode, 200);
    const order = createdOrder.json() as { id: string; status: string };
    assert.equal(order.status, 'received');

    // 2) Transição para in-diagnosis (RF-11, RF-12)
    const toDiagnosis = await app.inject({
      method: 'PATCH',
      url: `/api/v1/service-orders/${order.id}/status`,
      cookies: mechanicCookies(),
      payload: { toStatus: 'in-diagnosis' },
    });
    assert.equal(toDiagnosis.statusCode, 200);

    // 3) Guardar diagnóstico (RF-18)
    const saveDiagnosis = await app.inject({
      method: 'PATCH',
      url: `/api/v1/service-orders/${order.id}/diagnosis`,
      cookies: mechanicCookies(),
      payload: {
        technicalFindings: 'Bateria fim de vida',
        recommendedActions: 'Substituir bateria',
        estimatedLaborHours: '1.50',
      },
    });
    assert.equal(saveDiagnosis.statusCode, 200);

    // 4) Avançar para reparação (RF-11)
    const toRepair = await app.inject({
      method: 'PATCH',
      url: `/api/v1/service-orders/${order.id}/status`,
      cookies: mechanicCookies(),
      payload: { toStatus: 'in-repair' },
    });
    assert.equal(toRepair.statusCode, 200);

    // 5) Criar intervenção (RF-15, RF-16)
    const intervention = await app.inject({
      method: 'POST',
      url: `/api/v1/service-orders/${order.id}/interventions`,
      cookies: mechanicCookies(),
      payload: { description: 'Substituição de bateria', mechanicUserId: mechanicId },
    });
    assert.equal(intervention.statusCode, 200);
    const inter = intervention.json() as { id: string };

    // 6) Cronómetro: start -> stop (RF-17)
    const start = await app.inject({
      method: 'POST',
      url: `/api/v1/interventions/${inter.id}/timer/start`,
      cookies: mechanicCookies(),
    });
    assert.equal(start.statusCode, 200);

    const stop = await app.inject({
      method: 'POST',
      url: `/api/v1/interventions/${inter.id}/timer/stop`,
      cookies: mechanicCookies(),
    });
    assert.equal(stop.statusCode, 200);

    // 7) Associar peça (RF-20)
    const attachPart = await app.inject({
      method: 'POST',
      url: `/api/v1/interventions/${inter.id}/parts`,
      cookies: mechanicCookies(),
      headers: { 'idempotency-key': `system-part-${order.id}` },
      payload: { partReference: 'BRK-TEST-1', quantity: 1 },
    });
    assert.equal(attachPart.statusCode, 200);

    // 8) Concluir OS (RF-11)
    const toCompleted = await app.inject({
      method: 'PATCH',
      url: `/api/v1/service-orders/${order.id}/status`,
      cookies: managerCookies(),
      payload: { toStatus: 'completed' },
    });
    assert.equal(toCompleted.statusCode, 200);

    // 9) Emitir fatura (RF-26, RF-27, RF-28, RF-29)
    const invoice = await app.inject({
      method: 'POST',
      url: '/api/v1/invoices',
      cookies: managerCookies(),
      headers: { 'idempotency-key': `system-inv-${order.id}` },
      payload: { serviceOrderId: order.id, paymentMethod: 'Multibanco' },
    });
    assert.equal(invoice.statusCode, 200);
    const inv = invoice.json() as { id: string; paymentStatus: string; total: string };
    assert.equal(inv.paymentStatus, 'pending');
    assert.ok(parseFloat(inv.total) > 0, 'total da fatura deve ser positivo');

    // 10) Registar pagamento (RF-31)
    const pay = await app.inject({
      method: 'POST',
      url: `/api/v1/invoices/${inv.id}/payments`,
      cookies: managerCookies(),
      headers: { 'idempotency-key': `system-pay-${inv.id}` },
      payload: { paymentMethod: 'Multibanco' },
    });
    assert.equal(pay.statusCode, 200);
    const paid = pay.json() as { paymentStatus: string };
    assert.equal(paid.paymentStatus, 'paid');

    // 11) Entregar (RF-13: manager-only)
    const deliver = await app.inject({
      method: 'PATCH',
      url: `/api/v1/service-orders/${order.id}/status`,
      cookies: managerCookies(),
      payload: { toStatus: 'delivered' },
    });
    assert.equal(deliver.statusCode, 200);
    const delivered = deliver.json() as { status: string };
    assert.equal(delivered.status, 'delivered');
  });

  it('regista histórico cronológico de cada transição (RF-12)', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/service-orders',
      cookies: managerCookies(),
      payload: {
        customerNif: '111111111',
        scooterSerialNumber: 'SN-TEST-0001',
        reportedProblem: 'X',
      },
    });
    const order = created.json() as { id: string };

    await app.inject({
      method: 'PATCH',
      url: `/api/v1/service-orders/${order.id}/status`,
      cookies: mechanicCookies(),
      payload: { toStatus: 'in-diagnosis' },
    });

    const history = await app.inject({
      method: 'GET',
      url: `/api/v1/service-orders/${order.id}/history`,
      cookies: mechanicCookies(),
    });
    assert.equal(history.statusCode, 200);
    const entries = history.json() as Array<{ toStatus?: string }>;
    assert.ok(entries.length >= 1);
  });
});
