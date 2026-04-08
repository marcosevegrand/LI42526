import type { FastifyRequest } from 'fastify';

import { appError } from '../auth/session';
import {
  forgetIdempotencyRecord,
  getIdempotencyRecord,
  rememberIdempotencyRecord,
} from './store';

export function buildIdempotencyFingerprint(payload: unknown) {
  return JSON.stringify(payload ?? null);
}

export function claimIdempotencyKey(input: {
  request: FastifyRequest;
  required: boolean;
  fingerprint: string;
}) {
  const keyHeader = input.request.headers['idempotency-key'];
  const key = Array.isArray(keyHeader) ? keyHeader[0] : keyHeader;

  if (!key) {
    if (input.required) {
      throw appError(400, 'validation_error', 'Idempotency-Key header is required');
    }

    return {
      key: null,
      rollback: () => {
        return;
      },
    };
  }

  const existing = getIdempotencyRecord(key);
  if (existing) {
    if (existing.fingerprint !== input.fingerprint) {
      throw appError(409, 'idempotency_conflict', 'Idempotency-Key already used with a different request');
    }

    throw appError(409, 'idempotency_replay', 'Duplicate request blocked by idempotency policy');
  }

  rememberIdempotencyRecord({
    key,
    fingerprint: input.fingerprint,
    createdAt: new Date().toISOString(),
  });

  return {
    key,
    rollback: () => {
      forgetIdempotencyRecord(key);
    },
  };
}