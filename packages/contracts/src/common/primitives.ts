import { z } from 'zod';

export const nifSchema = z
  .string()
  .regex(/^\d{9}$/, 'NIF must contain exactly 9 digits');

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const moneySchema = z
  .string()
  .regex(/^\d+(\.\d{2})$/, 'Money values must use two decimal places');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
