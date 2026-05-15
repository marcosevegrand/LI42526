/**
 * notifications module
 *
 * Coverage targets: REQ-036 (confirmação de receção), REQ-037 (pedido
 * de aprovação), REQ-038 (notificação de conclusão), REQ-040 (templates
 * personalizáveis).
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

describe('notifications module', () => {
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

  // REQ-036/037/038: histórico (manager-only)
  it('GET /api/v1/notifications como manager devolve 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications',
      cookies: managerCookies(),
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as Array<unknown>;
    assert.ok(Array.isArray(body));
  });

  // RBAC: histórico bloqueado para mechanic
  it('GET /api/v1/notifications como mechanic devolve 403', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications',
      cookies: mechanicCookies(),
    });
    assert.equal(response.statusCode, 403);
  });

  // Autenticação
  it('GET /api/v1/notifications sem cookie devolve 401', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/notifications' });
    assert.equal(response.statusCode, 401);
  });

  // REQ-036: enviar notificação válida (jsonTransport mode)
  it('POST /api/v1/notifications grava registo com sucesso (jsonTransport)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications',
      cookies: managerCookies(),
      headers: { 'idempotency-key': 'notif-1' },
      payload: {
        type: 'reception_confirmation',
        recipientEmail: 'cliente@teste.local',
        subject: 'Recebemos a sua trotinete',
        body: 'Obrigado',
      },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { deliveryStatus?: string; recipientEmail?: string };
    assert.equal(body.recipientEmail, 'cliente@teste.local');
    assert.ok(['sent', 'failed', 'queued'].includes(body.deliveryStatus ?? ''));
  });

  // Validação Zod: tipo inválido
  it('POST /api/v1/notifications com tipo invalido devolve 400 validation_error', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications',
      cookies: managerCookies(),
      payload: {
        type: 'unknown_type',
        recipientEmail: 'x@y.z',
        subject: 'X',
        body: 'X',
      },
    });
    assert.equal(response.statusCode, 400);
    const body = response.json() as { error?: string };
    assert.equal(body.error, 'validation_error');
  });

  // REQ-040: templates (lista)
  it('GET /api/v1/notification-templates devolve templates default', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/notification-templates',
      cookies: managerCookies(),
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as Array<{ key: string }>;
    assert.ok(Array.isArray(body));
    assert.ok(body.length > 0, 'expected default templates to be ensured');
  });

  // REQ-040: edição de template
  it('PATCH /api/v1/notification-templates/:id atualiza assunto e corpo', async () => {
    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/notification-templates',
      cookies: managerCookies(),
    });
    const templates = list.json() as Array<{ id: string }>;
    const id = templates[0]?.id;
    assert.ok(id);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/notification-templates/${id}`,
      cookies: managerCookies(),
      payload: {
        subjectTemplate: 'Novo Assunto',
        bodyTemplate: 'Novo corpo',
      },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { subjectTemplate?: string };
    assert.equal(body.subjectTemplate, 'Novo Assunto');
  });
});
