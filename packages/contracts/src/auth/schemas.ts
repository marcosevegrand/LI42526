import { z } from 'zod';

import { userRoles } from '../common/enums';

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const userSessionSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string().email(),
  role: z.enum(userRoles),
});

export const loginResponseSchema = z.object({
  user: userSessionSchema,
});
