import { z } from 'zod';

import { paymentStatuses } from '../common/enums';
import { moneySchema } from '../common/primitives';

export const invoiceIssueSchema = z.object({
  serviceOrderId: z.string().min(1),
  paymentMethod: z.string().min(1),
  note: z.string().optional(),
});

export const invoicePaymentSchema = z.object({
  paymentMethod: z.string().min(1),
  paymentStatus: z.enum(paymentStatuses),
  paidAt: z.string().datetime().optional(),
  note: z.string().optional(),
});

export const invoiceSummarySchema = z.object({
  id: z.string(),
  invoiceNumber: z.string(),
  subtotal: moneySchema,
  vatAmount: moneySchema,
  total: moneySchema,
  paymentStatus: z.enum(paymentStatuses),
});
