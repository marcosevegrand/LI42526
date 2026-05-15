/**
 * Quality test — Performance Efficiency (ISO/IEC 25010)
 *
 * Sub-atributos cobertos:
 *   - Time behavior: SLO informal por endpoint, validado com node:test timers.
 *   - Resource utilization: monitorizada via cobertura, não medida aqui.
 *
 * Cross-ref SRS: RNF-05 (escalabilidade até 500 OS/mês).
 *
 * Nota: estes testes definem orçamentos GROSSEIROS (segundos) compatíveis
 * com execução em CI partilhada. Não substituem load tests dedicados.
 */
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

import type { FastifyInstance } from 'fastify';

import { createApp } from '../app';
import {
  cleanDatabase,
  disconnectPrisma,
  managerCookies,
  seedMinimal,
  setTestEnv,
} from '../test/helpers';

const SLO_MS = {
  read: 1000,    // GETs simples: < 1s
  summary: 2000, // GETs com agregação: < 2s
} as const;

async function timed(fn: () => Promise<{ statusCode: number }>): Promise<{ ms: number; statusCode: number }> {
  const start = performance.now();
  const result = await fn();
  return { ms: performance.now() - start, statusCode: result.statusCode };
}

describe('QUALITY: Performance Efficiency (ISO 25010)', () => {
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

  it('GET /api/v1/customers responde abaixo do SLO de leitura', async () => {
    const { ms, statusCode } = await timed(() =>
      app.inject({ method: 'GET', url: '/api/v1/customers', cookies: managerCookies() }),
    );
    assert.equal(statusCode, 200);
    assert.ok(ms < SLO_MS.read, `customers list demorou ${ms.toFixed(0)}ms (SLO ${SLO_MS.read}ms)`);
  });

  it('GET /api/v1/parts responde abaixo do SLO de leitura', async () => {
    const { ms, statusCode } = await timed(() =>
      app.inject({ method: 'GET', url: '/api/v1/parts', cookies: managerCookies() }),
    );
    assert.equal(statusCode, 200);
    assert.ok(ms < SLO_MS.read, `parts list demorou ${ms.toFixed(0)}ms`);
  });

  it('GET /api/v1/service-orders/summary responde abaixo do SLO de agregação', async () => {
    const { ms, statusCode } = await timed(() =>
      app.inject({
        method: 'GET',
        url: '/api/v1/service-orders/summary?from=2020-01-01&to=2099-12-31',
        cookies: managerCookies(),
      }),
    );
    assert.equal(statusCode, 200);
    assert.ok(ms < SLO_MS.summary, `summary demorou ${ms.toFixed(0)}ms (SLO ${SLO_MS.summary}ms)`);
  });

  it('GET /health responde de forma quase instantânea (smoke health-check)', async () => {
    const { ms, statusCode } = await timed(() => app.inject({ method: 'GET', url: '/health' }));
    assert.equal(statusCode, 200);
    assert.ok(ms < 500, `health demorou ${ms.toFixed(0)}ms`);
  });

  it('listagens permanecem dentro do SLO em chamadas consecutivas (sem regressão de cache)', async () => {
    const runs: number[] = [];
    for (let i = 0; i < 3; i++) {
      const { ms } = await timed(() =>
        app.inject({ method: 'GET', url: '/api/v1/parts', cookies: managerCookies() }),
      );
      runs.push(ms);
    }
    const avg = runs.reduce((a, b) => a + b, 0) / runs.length;
    assert.ok(avg < SLO_MS.read, `media de 3 chamadas = ${avg.toFixed(0)}ms`);
  });
});
