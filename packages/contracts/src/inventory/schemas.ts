import { z } from 'zod';

import { moneySchema, paginationSchema } from '../common/primitives';

export const partSchema = z.object({
  partReference: z.string().min(1),
  description: z.string().min(1),
  supplierId: z.string().min(1),
  costPrice: moneySchema,
  salePrice: moneySchema,
  currentStock: z.number().int().nonnegative(),
  minimumStock: z.number().int().nonnegative(),
  isArchived: z.boolean().default(false),
});

export const listPartsQuerySchema = paginationSchema.extend({
  partReference: z.string().optional(),
  description: z.string().optional(),
  supplierId: z.string().optional(),
  lowStock: z.coerce.boolean().optional(),
});
