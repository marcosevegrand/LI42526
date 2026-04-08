import { z } from 'zod';

import { customerTypes } from '../common/enums';
import { moneySchema, nifSchema, paginationSchema } from '../common/primitives';

export const customerSchema = z.object({
  nif: nifSchema,
  customerType: z.enum(customerTypes),
  fullName: z.string().min(1),
  legalName: z.string().optional(),
  email: z.string().email(),
  phone: z.string().min(1),
  address: z.string().optional(),
  creditLimit: moneySchema.optional(),
  paymentTerms: z.string().optional(),
  isArchived: z.boolean().default(false),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const createCustomerSchema = customerSchema.superRefine((customer, context) => {
  if (customer.customerType === 'business') {
    if (!customer.legalName) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['legalName'],
        message: 'Business customers require a legalName',
      });
    }
    if (!customer.creditLimit) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['creditLimit'],
        message: 'Business customers require a creditLimit',
      });
    }
    if (!customer.paymentTerms) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paymentTerms'],
        message: 'Business customers require paymentTerms',
      });
    }
  }
});

export const listCustomersQuerySchema = paginationSchema.extend({
  nif: nifSchema.optional(),
  fullName: z.string().optional(),
  email: z.string().email().optional(),
  customerType: z.enum(customerTypes).optional(),
  isArchived: z.coerce.boolean().optional(),
});
