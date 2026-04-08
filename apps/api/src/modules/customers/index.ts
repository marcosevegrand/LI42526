import {
  createCustomerSchema,
  customerSchema,
  listCustomersQuerySchema,
  nifSchema,
} from '@gengis-khan/contracts';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { appError, requireRole } from '../../shared/auth/session';
import { CustomersService } from './customers.service';

const customersService = new CustomersService();

const updateCustomerSchema = customerSchema
  .omit({ nif: true, createdAt: true, updatedAt: true })
  .partial()
  .superRefine((customer, context) => {
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

export const customersModule: FastifyPluginAsync = async (app) => {
  app.get('/api/v1/customers', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    const parsed = listCustomersQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid query');
    }

    const customers = await customersService.list(parsed.data);
    return customers.map((customer: unknown) => customerSchema.parse(customer));
  });

  app.get('/api/v1/customers/:nif', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    const parsedNif = nifSchema.safeParse((request.params as { nif?: string }).nif);
    if (!parsedNif.success) {
      throw appError(400, 'validation_error', parsedNif.error.issues[0]?.message ?? 'Invalid NIF');
    }

    const customer = await customersService.getByNif(parsedNif.data);
    return customerSchema.parse(customer);
  });

  app.post('/api/v1/customers', async (request) => {
    await requireRole(['manager'])(request);

    const parsed = createCustomerSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    const customer = await customersService.create(parsed.data);
    return customerSchema.parse(customer);
  });

  app.patch('/api/v1/customers/:nif', async (request) => {
    await requireRole(['manager'])(request);

    const parsedNif = nifSchema.safeParse((request.params as { nif?: string }).nif);
    if (!parsedNif.success) {
      throw appError(400, 'validation_error', parsedNif.error.issues[0]?.message ?? 'Invalid NIF');
    }

    const parsed = updateCustomerSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    const customer = await customersService.update(parsedNif.data, parsed.data);
    return customerSchema.parse(customer);
  });

  app.get('/api/v1/customers/:nif/history', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    const parsedNif = nifSchema.safeParse((request.params as { nif?: string }).nif);
    if (!parsedNif.success) {
      throw appError(400, 'validation_error', parsedNif.error.issues[0]?.message ?? 'Invalid NIF');
    }

    return customersService.getHistory(parsedNif.data);
  });
};
