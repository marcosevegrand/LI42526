/**
 * Acceptance test — User stories do Gerente (US-G01..G08)
 *
 * Layer: ACCEPTANCE (orientado ao valor para o stakeholder)
 * Modelo: cada it() corresponde a uma user story do SRS, expressa
 * como "Dado/Quando/Então" implícito no corpo do teste.
 *
 * ISO/IEC 25010 atributo dominante: Functional Suitability —
 * Functional Appropriateness.
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
  seedMinimal,
  setTestEnv,
} from '../test/helpers';

describe('ACCEPTANCE: user stories do Gerente', () => {
  let app: FastifyInstance;
  let supplierId: string;
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
    managerId = ids.managerId;
  });

  // US-G01: registar e manter clientes particulares e empresariais
  it('US-G01: gerente regista cliente particular e cliente empresarial', async () => {
    const personal = await app.inject({
      method: 'POST',
      url: '/api/v1/customers',
      cookies: managerCookies(),
      payload: {
        nif: '900000001',
        customerType: 'personal',
        fullName: 'Maria Particular',
        email: 'maria@test.local',
        phone: '+351 911 000 001',
      },
    });
    assert.equal(personal.statusCode, 200);

    const business = await app.inject({
      method: 'POST',
      url: '/api/v1/customers',
      cookies: managerCookies(),
      payload: {
        nif: '900000002',
        customerType: 'business',
        fullName: 'TransportesX',
        legalName: 'TransportesX Lda.',
        email: 'tx@test.local',
        phone: '+351 911 000 002',
        creditLimit: '5000.00',
        paymentTerms: '30 dias',
      },
    });
    assert.equal(business.statusCode, 200);
  });

  // US-G02: consultar faturas pendentes e atrasadas
  it('US-G02: gerente consulta faturas pendentes de clientes empresariais', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/invoices/pending-business',
      cookies: managerCookies(),
    });
    assert.equal(response.statusCode, 200);
  });

  // US-G03: emitir faturas a partir de OS concluídas
  it('US-G03: gerente emite fatura a partir de OS concluída', async () => {
    const order = await getPrismaClient().serviceOrder.create({
      data: {
        customerNif: '111111111',
        scooterSerialNumber: 'SN-TEST-0001',
        reportedProblem: 'X',
        status: 'completed',
        createdByUserId: managerId,
      },
    });
    const invoice = await app.inject({
      method: 'POST',
      url: '/api/v1/invoices',
      cookies: managerCookies(),
      headers: { 'idempotency-key': `usg03-${order.id}` },
      payload: { serviceOrderId: order.id, paymentMethod: 'Multibanco' },
    });
    assert.equal(invoice.statusCode, 200);
  });

  // US-G04: configurar taxa horária e IVA
  it('US-G04: gerente atualiza taxa horária e IVA', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/config/financial-parameters',
      cookies: managerCookies(),
      payload: { hourlyLaborRate: '45.00', vatRate: '23.00' },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { hourlyLaborRate?: string };
    assert.equal(body.hourlyLaborRate, '45.00');
  });

  // US-G05: visualizar quantas OS por estado
  it('US-G05: gerente consulta resumo de OS por estado', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/service-orders/summary?from=2020-01-01&to=2099-12-31',
      cookies: managerCookies(),
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { byStatus: Array<unknown> };
    assert.ok(Array.isArray(body.byStatus));
  });

  // US-G06: receber alertas de stock mínimo
  it('US-G06: gerente vê peças em rutura no endpoint low-stock', async () => {
    await getPrismaClient().part.update({
      where: { partReference: 'BRK-TEST-1' },
      data: { currentStock: 0 },
    });
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/parts/low-stock',
      cookies: managerCookies(),
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as Array<{ partReference: string }>;
    assert.ok(body.some((p) => p.partReference === 'BRK-TEST-1'));
  });

  // US-G07: criar e enviar encomendas
  it('US-G07: gerente cria encomenda a fornecedor', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/purchase-orders',
      cookies: managerCookies(),
      headers: { 'idempotency-key': 'usg07-1' },
      payload: {
        supplierId,
        items: [{ partReference: 'BRK-TEST-1', quantity: 10 }],
      },
    });
    assert.equal(response.statusCode, 200);
  });

  // US-G08: relatórios de faturação, peças e produtividade
  it('US-G08: gerente consulta relatórios filtrados por período', async () => {
    const period = 'from=2020-01-01&to=2099-12-31';
    const endpoints = [
      `/api/v1/reports/billing?${period}`,
      `/api/v1/reports/parts-usage?${period}`,
      `/api/v1/reports/mechanic-productivity?${period}`,
    ];
    for (const url of endpoints) {
      const response = await app.inject({ method: 'GET', url, cookies: managerCookies() });
      assert.equal(response.statusCode, 200, `falhou ${url}`);
    }
  });
});
