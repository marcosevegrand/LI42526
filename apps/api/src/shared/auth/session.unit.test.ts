/**
 * Unit tests — auth/session helpers
 *
 * Layer: UNIT (no Fastify boot, no DB)
 * Scope: pure functions in shared/auth/session.ts
 *
 * Coverage targets: REQ-034 (autenticação), REQ-035 (RBAC manager/mechanic).
 * ISO/IEC 25010 attribute: Security — Authenticity (subatributo).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { appError, requireRole } from './session';

describe('appError', () => {
  // REQ-034
  it('produz objeto Error com statusCode e error code anexados', () => {
    const err = appError(401, 'unauthorized', 'No session');
    assert.ok(err instanceof Error);
    assert.equal(err.message, 'No session');
    assert.equal((err as Error & { statusCode: number }).statusCode, 401);
    assert.equal((err as Error & { error: string }).error, 'unauthorized');
  });

  // REQ-034
  it('preserva mensagens ASCII e mensagens com acentuação', () => {
    const err = appError(400, 'validation_error', 'NIF inválido');
    assert.equal(err.message, 'NIF inválido');
  });
});

describe('requireRole', () => {
  // REQ-034
  it('rejeita pedido sem sessionUser com 401 unauthorized', async () => {
    const enforce = requireRole(['manager']);
    const fakeRequest = { sessionUser: null } as Parameters<typeof enforce>[0];

    await assert.rejects(
      () => enforce(fakeRequest),
      (e: Error & { statusCode?: number; error?: string }) => {
        return e.statusCode === 401 && e.error === 'unauthorized';
      },
    );
  });

  // REQ-035: papel insuficiente
  it('rejeita mechanic em endpoint manager-only com 403 forbidden', async () => {
    const enforce = requireRole(['manager']);
    const fakeRequest = {
      sessionUser: {
        id: 'x',
        fullName: 'X',
        email: 'x@y.z',
        role: 'mechanic' as const,
      },
    } as Parameters<typeof enforce>[0];

    await assert.rejects(
      () => enforce(fakeRequest),
      (e: Error & { statusCode?: number; error?: string }) => {
        return e.statusCode === 403 && e.error === 'forbidden';
      },
    );
  });

  // REQ-035: papel suficiente
  it('aceita manager em endpoint manager-only', async () => {
    const enforce = requireRole(['manager']);
    const fakeRequest = {
      sessionUser: {
        id: 'x',
        fullName: 'X',
        email: 'x@y.z',
        role: 'manager' as const,
      },
    } as Parameters<typeof enforce>[0];

    await assert.doesNotReject(() => enforce(fakeRequest));
  });

  // REQ-035: papel listado entre vários permitidos
  it('aceita qualquer papel listado como permitido', async () => {
    const enforce = requireRole(['manager', 'mechanic']);
    const mechanicRequest = {
      sessionUser: {
        id: 'x',
        fullName: 'X',
        email: 'x@y.z',
        role: 'mechanic' as const,
      },
    } as Parameters<typeof enforce>[0];

    await assert.doesNotReject(() => enforce(mechanicRequest));
  });
});
