import { z } from 'zod';

export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  traceId: z.string(),
  validationErrors: z.record(z.array(z.string())).optional(),
  details: z.unknown().optional(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
