import { loginRequestSchema, loginResponseSchema, userSessionSchema } from '@gengis-khan/contracts';
import type { z } from 'zod';

import { apiFetch } from '@/lib/api/http-client';

export type SessionUser = z.infer<typeof userSessionSchema>;

type LoginInput = z.input<typeof loginRequestSchema>;

export async function loginWithPassword(input: LoginInput): Promise<SessionUser> {
  const payload = loginRequestSchema.parse(input);

  const response = await apiFetch<unknown>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return loginResponseSchema.parse(response).user;
}

export async function fetchSession(): Promise<SessionUser> {
  const response = await apiFetch<unknown>('/auth/session');
  return loginResponseSchema.parse(response).user;
}

export async function logoutSession(): Promise<void> {
  await apiFetch<void>('/auth/logout', {
    method: 'POST',
  });
}
