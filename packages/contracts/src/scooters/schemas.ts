import { z } from 'zod';

import { nifSchema } from '../common/primitives';

export const scooterSchema = z.object({
  serialNumber: z.string().min(1),
  brand: z.string().min(1),
  model: z.string().min(1),
  conditionNotes: z.string().optional(),
  customerNif: nifSchema,
  isArchived: z.boolean().default(false),
});
