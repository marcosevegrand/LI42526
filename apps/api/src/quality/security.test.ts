/**
 * Quality test — Security (ISO/IEC 25010)
 *
 * Sub-atributos cobertos:
 *   - Confidentiality: protecao por sessao JWT
 *   - Integrity: rejeicao de tokens forjados
 *   - Authenticity: assinatura JWT verificada com JWT_SECRET
 *   - Authorization: separacao manager/mechanic
 *   - Accountability: traceId em respostas de erro
 *
 * Cross-ref SRS: REQ-034, REQ-035, RNF-03 (RGPD/controlo de acessos).
 */
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

import jwt from 'jsonwebtoken';
import type { FastifyInstance } from 'fastify';

import { createApp } from '../app';
import {
  buildSessionToken,
  cleanDatabase,
  disconnectPrisma,
  managerCookies,
  mechanicCookies,
  seedMinimal,
  setTestEnv,
} from '../test/helpers';

describe('QUALITY: Security (ISO 25010)', () => {
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

  // Authenticity: assinatura inválida é rejeitada
  it('cookie com JWT assinado por chave errada devolve 401', async () => {
    const forged = jwt.sign(
      { id: 'x', fullName: 'X', email: 'x@y.z', role: 'manager' },
      'WRONG-SECRET',
      { expiresIn: '1h' },
    );
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      cookies: { session: forged },
    });
    assert.equal(response.statusCode, 401);
  });

  // Integrity: tokens malformados rejeitados sem 500
  it('cookie com lixo arbitrário não rebenta o servidor', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      cookies: { session: 'not.a.valid.jwt' },
    });
    assert.equal(response.statusCode, 401);
  });

  // Integrity: token expirado
  it('cookie com JWT expirado devolve 401', async () => {
    const expired = jwt.sign(
      { id: 'x', fullName: 'X', email: 'x@y.z', role: 'manager' },
      'super-secret-test-key-12345',
      { expiresIn: '-1m' },
    );
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      cookies: { session: expired },
    });
    assert.equal(response.statusCode, 401);
  });

  // Integrity: payload manipulado (papel adulterado mas sem assinatura válida)
  it('payload com role adulterado sem assinar é rejeitado', async () => {
    const fakeHeader = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
    const fakePayload = Buffer.from(
      JSON.stringify({ id: 'x', fullName: 'X', email: 'x@y.z', role: 'manager' }),
    ).toString('base64url');
    const forged = `${fakeHeader}.${fakePayload}.`;
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      cookies: { session: forged },
    });
    assert.equal(response.statusCode, 401);
  });

  // Authorization: limite por papel
  it('mechanic não consegue aceder a endpoint manager-only de configuração', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/config/financial-parameters',
      cookies: mechanicCookies(),
    });
    assert.equal(response.statusCode, 403);
  });

  // Accountability: erros incluem traceId
  it('respostas de erro incluem traceId para rastreio', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/customers/000000000',
      cookies: managerCookies(),
    });
    const body = response.json() as { traceId?: string };
    assert.ok(body.traceId, 'esperava traceId na resposta de erro');
  });

  // Confidentiality: dados de cliente exigem autenticação
  it('listagem de clientes sem cookie devolve 401 (não exposição pública)', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/customers' });
    assert.equal(response.statusCode, 401);
  });

  // Authorization: token válido com role suportado funciona
  it('cookie válido com role correcto permite acesso', async () => {
    const cookie = buildSessionToken('manager');
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      cookies: { session: cookie },
    });
    assert.equal(response.statusCode, 200);
  });
});
