import { z } from 'zod';

import { serviceOrderStatuses } from '../common/enums';
import { isoDateSchema, moneySchema, nifSchema } from '../common/primitives';

export const diagnosisSchema = z.object({
  technicalFindings: z.string().min(1),
  recommendedActions: z.string().min(1),
  estimatedLaborHours: moneySchema,
  notes: z.string().optional(),
});

export const budgetSchema = z.object({
  estimatedLaborAmount: moneySchema,
  estimatedPartsAmount: moneySchema,
  estimatedVatAmount: moneySchema,
  estimatedTotal: moneySchema,
  notes: z.string().optional(),
});

export const createServiceOrderSchema = z.object({
  customerNif: nifSchema,
  scooterSerialNumber: z.string().min(1),
  reportedProblem: z.string().min(1),
  estimatedCompletionDate: isoDateSchema.optional(),
});

export const serviceOrderStatusTransitionSchema = z.object({
  toStatus: z.enum(serviceOrderStatuses),
  note: z.string().optional(),
});
