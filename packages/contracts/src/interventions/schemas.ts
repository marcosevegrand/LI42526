import { z } from 'zod';

import { timerStates } from '../common/enums';

export const interventionSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1),
  mechanicUserId: z.string().min(1),
  notes: z.string().optional(),
  elapsedSeconds: z.number().int().nonnegative().default(0),
  timerState: z.enum(timerStates).default('idle'),
  timerStartedAt: z.string().datetime().optional(),
});

export const interventionPartAssociationSchema = z.object({
  partReference: z.string().min(1),
  quantity: z.number().int().positive(),
  note: z.string().optional(),
});
