/**
 * System test — Inventory & Procurement flow
 *
 * Layer: SYSTEM
 * Scenario: criar encomenda a fornecedor → receber → stock atualiza →
 *           consumir peças em intervenção → low-stock alerta.
 *
 * Coverage targets:
 *   RF-19 (catálogo), RF-20 (consumo em intervenção),
 *   RF-21 (movimentos de stock), RF-22 (alerta stock mínimo),
 *   RF-23 (pré-encomenda), RF-24 (histórico de encomendas).
 *
 * ISO/IEC 25010: Functional Suitability + Reliability.
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

describe('SYSTEM: aprovisionamento e consumo de stock', () => {
  let app: FastifyInstance;
  let supplierId: string;
  let mechanicId: string;
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
    supplierId = ids.supplierId;
    mechanicId = ids.mechanicId;
    managerId = ids.managerId;
  });

  it('encomenda → receção → stock atualizado → consumo em intervenção', async () => {
    // 1) Criar PO
    const createPO = await app.inject({
      method: 'POST',
      url: '/api/v1/purchase-orders',
      cookies: managerCookies(),
      headers: { 'idempotency-key': 'sys-po-1' },
      payload: {
        supplierId,
        items: [{ partReference: 'BRK-TEST-1', quantity: 20 }],
      },
    });
    assert.equal(createPO.statusCode, 200);
    const po = createPO.json() as { id: string; status: string };
    assert.equal(po.status, 'requested');

    // 2) Receber PO (RF-21, RF-24)
    const receive = await app.inject({
      method: 'PATCH',
      url: `/api/v1/purchase-orders/${po.id}/receive`,
      cookies: managerCookies(),
    });
    assert.equal(receive.statusCode, 200);
    const received = receive.json() as { status: string };
    assert.equal(received.status, 'received');

    // 3) Confirmar que o stock subiu
    const part = await app.inject({
      method: 'GET',
      url: '/api/v1/parts/BRK-TEST-1',
      cookies: mechanicCookies(),
    });
    assert.equal(part.statusCode, 200);
    const partBody = part.json() as { currentStock: number };
    assert.ok(partBody.currentStock >= 20, `esperava stock >= 20, obteve ${partBody.currentStock}`);

    // 4) Criar OS e intervenção, consumir peça (RF-20)
    const order = (await app.inject({
      method: 'POST',
      url: '/api/v1/service-orders',
      cookies: managerCookies(),
      payload: {
        customerNif: '111111111',
        scooterSerialNumber: 'SN-TEST-0001',
        reportedProblem: 'X',
      },
    })).json() as { id: string };
    void managerId; // reservado para futura customização do criador

    await app.inject({
      method: 'PATCH',
      url: `/api/v1/service-orders/${order.id}/status`,
      cookies: mechanicCookies(),
      payload: { toStatus: 'in-diagnosis' },
    });
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/service-orders/${order.id}/status`,
      cookies: mechanicCookies(),
      payload: { toStatus: 'in-repair' },
    });

    const inter = (await app.inject({
      method: 'POST',
      url: `/api/v1/service-orders/${order.id}/interventions`,
      cookies: mechanicCookies(),
      payload: { description: 'Substituir pastilhas', mechanicUserId: mechanicId },
    })).json() as { id: string };

    const consume = await app.inject({
      method: 'POST',
      url: `/api/v1/interventions/${inter.id}/parts`,
      cookies: mechanicCookies(),
      headers: { 'idempotency-key': `sys-consume-${inter.id}` },
      payload: { partReference: 'BRK-TEST-1', quantity: 3 },
    });
    assert.equal(consume.statusCode, 200);

    // 5) Stock baixou
    const afterConsume = await app.inject({
      method: 'GET',
      url: '/api/v1/parts/BRK-TEST-1',
      cookies: mechanicCookies(),
    });
    const afterBody = afterConsume.json() as { currentStock: number };
    assert.equal(afterBody.currentStock, partBody.currentStock - 3);
  });

  it('alerta low-stock devolve peças abaixo do mínimo (RF-22)', async () => {
    // Forçar consumo até abaixo do mínimo via ajuste manual
    await app.inject({
      method: 'POST',
      url: '/api/v1/parts/BRK-TEST-1/stock-adjustments',
      cookies: managerCookies(),
      headers: { 'idempotency-key': 'sys-adj-low' },
      payload: { quantityDelta: -9, note: 'forçar low-stock' },
    });

    const low = await app.inject({
      method: 'GET',
      url: '/api/v1/parts/low-stock',
      cookies: managerCookies(),
    });
    assert.equal(low.statusCode, 200);
    const body = low.json() as Array<{ partReference: string; currentStock: number; minimumStock: number }>;
    const hit = body.find((p) => p.partReference === 'BRK-TEST-1');
    assert.ok(hit, 'BRK-TEST-1 deveria aparecer no alerta de stock mínimo');
    assert.ok(hit.currentStock <= hit.minimumStock);
  });
});
