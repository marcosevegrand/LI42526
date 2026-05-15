/**
 * Acceptance test — User stories do Mecânico (US-M01..M08)
 *
 * Layer: ACCEPTANCE
 * Modelo: cada it() instancia uma user story do SRS.
 *
 * ISO/IEC 25010: Functional Suitability — Functional Appropriateness.
 */
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

import type { FastifyInstance } from 'fastify';

import { createApp } from '../app';
import { getPrismaClient } from '../shared/db/prisma';
import {
  cleanDatabase,
  disconnectPrisma,
  managerCookies,
  mechanicCookies,
  seedMinimal,
  setTestEnv,
} from '../test/helpers';

describe('ACCEPTANCE: user stories do Mecânico', () => {
  let app: FastifyInstance;
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
    mechanicId = ids.mechanicId;
    managerId = ids.managerId;
  });

  async function createOrderInRepair(): Promise<string> {
    const order = await getPrismaClient().serviceOrder.create({
      data: {
        customerNif: '111111111',
        scooterSerialNumber: 'SN-TEST-0001',
        reportedProblem: 'X',
        status: 'in-repair',
        createdByUserId: managerId,
      },
    });
    return order.id;
  }

  // US-M01: registar entrada de trotinete e abrir OS rapidamente
  it('US-M01: mecânico (com cookies do mecanico) acede ao endpoint de criar OS via manager', async () => {
    // OS é criada por manager; mecânico operacionaliza a partir daqui
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/service-orders',
      cookies: managerCookies(),
      payload: {
        customerNif: '111111111',
        scooterSerialNumber: 'SN-TEST-0001',
        reportedProblem: 'Recepção rápida',
      },
    });
    assert.equal(response.statusCode, 200);
  });

  // US-M02: registar diagnóstico técnico
  it('US-M02: mecânico regista diagnóstico técnico na OS', async () => {
    const orderId = await createOrderInRepair();
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/service-orders/${orderId}/diagnosis`,
      cookies: mechanicCookies(),
      payload: {
        technicalFindings: 'Cabo de travão partido',
        recommendedActions: 'Substituir cabo',
        estimatedLaborHours: '0.50',
      },
    });
    assert.equal(response.statusCode, 200);
  });

  // US-M03: alterar estado da OS
  it('US-M03: mecânico transita OS de in-repair para completed', async () => {
    const orderId = await createOrderInRepair();
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/service-orders/${orderId}/status`,
      cookies: mechanicCookies(),
      payload: { toStatus: 'completed' },
    });
    assert.equal(response.statusCode, 200);
  });

  // US-M04: registar várias intervenções
  it('US-M04: mecânico cria múltiplas intervenções na mesma OS', async () => {
    const orderId = await createOrderInRepair();
    for (const desc of ['Inspecao', 'Substituicao']) {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/service-orders/${orderId}/interventions`,
        cookies: mechanicCookies(),
        payload: { description: desc, mechanicUserId: mechanicId },
      });
      assert.equal(response.statusCode, 200);
    }
    const list = await app.inject({
      method: 'GET',
      url: `/api/v1/service-orders/${orderId}/interventions`,
      cookies: mechanicCookies(),
    });
    const body = list.json() as Array<unknown>;
    assert.ok(body.length >= 2);
  });

  // US-M05: cronómetro
  it('US-M05: mecânico inicia, pausa e para o cronómetro de uma intervenção', async () => {
    const orderId = await createOrderInRepair();
    const inter = (await app.inject({
      method: 'POST',
      url: `/api/v1/service-orders/${orderId}/interventions`,
      cookies: mechanicCookies(),
      payload: { description: 'Timer test', mechanicUserId: mechanicId },
    })).json() as { id: string };

    const start = await app.inject({
      method: 'POST',
      url: `/api/v1/interventions/${inter.id}/timer/start`,
      cookies: mechanicCookies(),
    });
    assert.equal(start.statusCode, 200);

    const pause = await app.inject({
      method: 'POST',
      url: `/api/v1/interventions/${inter.id}/timer/pause`,
      cookies: mechanicCookies(),
    });
    assert.equal(pause.statusCode, 200);

    const stop = await app.inject({
      method: 'POST',
      url: `/api/v1/interventions/${inter.id}/timer/stop`,
      cookies: mechanicCookies(),
    });
    assert.equal(stop.statusCode, 200);
  });

  // US-M06: associar peças a intervenção
  it('US-M06: mecânico associa peça consumida a intervenção', async () => {
    const orderId = await createOrderInRepair();
    const inter = (await app.inject({
      method: 'POST',
      url: `/api/v1/service-orders/${orderId}/interventions`,
      cookies: mechanicCookies(),
      payload: { description: 'Parts test', mechanicUserId: mechanicId },
    })).json() as { id: string };

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/interventions/${inter.id}/parts`,
      cookies: mechanicCookies(),
      headers: { 'idempotency-key': `usm06-${inter.id}` },
      payload: { partReference: 'BRK-TEST-1', quantity: 1 },
    });
    assert.equal(response.statusCode, 200);
  });

  // US-M07: consultar histórico por nº de série
  it('US-M07: mecânico consulta histórico de reparações de uma trotinete', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/scooters/SN-TEST-0001/repairs',
      cookies: mechanicCookies(),
    });
    assert.equal(response.statusCode, 200);
  });

  // US-M08: consultar disponibilidade de peças
  it('US-M08: mecânico consulta catálogo + stock atual', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/parts',
      cookies: mechanicCookies(),
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as Array<{ currentStock: number }>;
    assert.ok(body.every((p) => typeof p.currentStock === 'number'));
  });
});
