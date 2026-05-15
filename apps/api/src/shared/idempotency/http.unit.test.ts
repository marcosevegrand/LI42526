/**
 * Unit tests — idempotency helpers
 *
 * Layer: UNIT (no Fastify boot, no DB)
 * Scope: claimIdempotencyKey + buildIdempotencyFingerprint.
 *
 * Coverage targets: regra de negócio que protege POSTs sensíveis
 * (criação de fatura, registo de pagamento, ajuste de stock) contra
 * duplo-clique e retransmissões.
 * ISO/IEC 25010: Reliability — Recoverability/Fault tolerance.
 */
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import type { FastifyRequest } from 'fastify';

import { buildIdempotencyFingerprint, claimIdempotencyKey } from './http';
import { forgetIdempotencyRecord } from './store';

function makeRequest(headers: Record<string, string | undefined> = {}): FastifyRequest {
  return { headers } as unknown as FastifyRequest;
}

describe('buildIdempotencyFingerprint', () => {
  it('serializa payload de forma estável', () => {
    const a = buildIdempotencyFingerprint({ a: 1, b: 2 });
    const b = buildIdempotencyFingerprint({ a: 1, b: 2 });
    assert.equal(a, b);
  });

  it('produz strings distintas para payloads diferentes', () => {
    const a = buildIdempotencyFingerprint({ a: 1 });
    const b = buildIdempotencyFingerprint({ a: 2 });
    assert.notEqual(a, b);
  });

  it('aceita null e undefined sem rebentar', () => {
    assert.equal(buildIdempotencyFingerprint(null), 'null');
    assert.equal(buildIdempotencyFingerprint(undefined), 'null');
  });
});

describe('claimIdempotencyKey', () => {
  let lastKey: string | null = null;

  afterEach(() => {
    if (lastKey) forgetIdempotencyRecord(lastKey);
    lastKey = null;
  });

  it('rejeita pedido sem header quando obrigatório', () => {
    assert.throws(
      () => claimIdempotencyKey({ request: makeRequest(), required: true, fingerprint: 'fp' }),
      (e: Error & { statusCode?: number }) => e.statusCode === 400,
    );
  });

  it('permite pedido sem header quando opcional', () => {
    const result = claimIdempotencyKey({
      request: makeRequest(),
      required: false,
      fingerprint: 'fp',
    });
    assert.equal(result.key, null);
    assert.equal(typeof result.rollback, 'function');
  });

  it('regista nova chave e devolve rollback funcional', () => {
    lastKey = 'unit-test-key-1';
    const result = claimIdempotencyKey({
      request: makeRequest({ 'idempotency-key': lastKey }),
      required: true,
      fingerprint: 'fp-a',
    });
    assert.equal(result.key, lastKey);
  });

  it('rejeita replay com mesma chave e mesmo fingerprint', () => {
    lastKey = 'unit-test-key-2';
    claimIdempotencyKey({
      request: makeRequest({ 'idempotency-key': lastKey }),
      required: true,
      fingerprint: 'fp-x',
    });

    assert.throws(
      () =>
        claimIdempotencyKey({
          request: makeRequest({ 'idempotency-key': lastKey as string }),
          required: true,
          fingerprint: 'fp-x',
        }),
      (e: Error & { error?: string; statusCode?: number }) =>
        e.statusCode === 409 && e.error === 'idempotency_replay',
    );
  });

  it('rejeita reutilização de chave com fingerprint diferente', () => {
    lastKey = 'unit-test-key-3';
    claimIdempotencyKey({
      request: makeRequest({ 'idempotency-key': lastKey }),
      required: true,
      fingerprint: 'fp-original',
    });

    assert.throws(
      () =>
        claimIdempotencyKey({
          request: makeRequest({ 'idempotency-key': lastKey as string }),
          required: true,
          fingerprint: 'fp-different',
        }),
      (e: Error & { error?: string; statusCode?: number }) =>
        e.statusCode === 409 && e.error === 'idempotency_conflict',
    );
  });
});
