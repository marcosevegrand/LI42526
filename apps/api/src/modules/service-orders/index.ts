import {
  budgetSchema,
  createServiceOrderSchema,
  diagnosisSchema,
  isoDateSchema,
  serviceOrderStatusTransitionSchema,
  serviceOrderStatuses,
} from '@gengis-khan/contracts';
import { z } from 'zod';
import type { FastifyPluginAsync } from 'fastify';

import { appError, requireRole } from '../../shared/auth/session';
import { ServiceOrdersService } from './service-orders.service';

const serviceOrdersService = new ServiceOrdersService();

const listServiceOrdersQuerySchema = z.object({
  status: z.enum(serviceOrderStatuses).optional(),
  customerNif: z.string().regex(/^\d{9}$/).optional(),
  scooterSerialNumber: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const updateServiceOrderSchema = z
  .object({
    reportedProblem: z.string().min(1).optional(),
    estimatedCompletionDate: isoDateSchema.optional(),
  })
  .refine((value) => value.reportedProblem !== undefined || value.estimatedCompletionDate !== undefined, {
    message: 'At least one field must be provided',
  });

const budgetApprovalSchema = z.object({
  approved: z.boolean(),
  note: z.string().optional(),
});

const summaryQuerySchema = z.object({
  from: isoDateSchema,
  to: isoDateSchema,
});

export const serviceOrdersModule: FastifyPluginAsync = async (app) => {
  app.get('/api/v1/service-orders/summary', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    const parsed = summaryQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid query');
    }

    return serviceOrdersService.getSummary(parsed.data);
  });

  app.get('/api/v1/service-orders', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    const parsed = listServiceOrdersQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid query');
    }

    return serviceOrdersService.list(parsed.data);
  });

  app.get('/api/v1/service-orders/:id', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    const id = (request.params as { id?: string }).id;
    if (!id) {
      throw appError(400, 'validation_error', 'id is required');
    }

    return serviceOrdersService.getById(id);
  });

  app.post('/api/v1/service-orders', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    if (!request.sessionUser) {
      throw appError(401, 'unauthorized', 'Authentication required');
    }

    const parsed = createServiceOrderSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    return serviceOrdersService.create(parsed.data, request.sessionUser);
  });

  app.patch('/api/v1/service-orders/:id/status', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    if (!request.sessionUser) {
      throw appError(401, 'unauthorized', 'Authentication required');
    }

    const id = (request.params as { id?: string }).id;
    if (!id) {
      throw appError(400, 'validation_error', 'id is required');
    }

    const parsed = serviceOrderStatusTransitionSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    return serviceOrdersService.transitionStatus({
      id,
      toStatus: parsed.data.toStatus,
      sessionUser: request.sessionUser,
    });
  });

  app.patch('/api/v1/service-orders/:id', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    if (!request.sessionUser) {
      throw appError(401, 'unauthorized', 'Authentication required');
    }

    const id = (request.params as { id?: string }).id;
    if (!id) {
      throw appError(400, 'validation_error', 'id is required');
    }

    const parsed = updateServiceOrderSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    return serviceOrdersService.update(id, parsed.data, request.sessionUser);
  });

  app.patch('/api/v1/service-orders/:id/diagnosis', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    if (!request.sessionUser) {
      throw appError(401, 'unauthorized', 'Authentication required');
    }

    const id = (request.params as { id?: string }).id;
    if (!id) {
      throw appError(400, 'validation_error', 'id is required');
    }

    const parsed = diagnosisSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    return serviceOrdersService.updateDiagnosis(id, parsed.data, request.sessionUser);
  });

  app.patch('/api/v1/service-orders/:id/budget', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    if (!request.sessionUser) {
      throw appError(401, 'unauthorized', 'Authentication required');
    }

    const id = (request.params as { id?: string }).id;
    if (!id) {
      throw appError(400, 'validation_error', 'id is required');
    }

    const parsed = budgetSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    return serviceOrdersService.updateBudget(id, parsed.data, request.sessionUser);
  });

  app.post('/api/v1/service-orders/:id/budget/approval', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    if (!request.sessionUser) {
      throw appError(401, 'unauthorized', 'Authentication required');
    }

    const id = (request.params as { id?: string }).id;
    if (!id) {
      throw appError(400, 'validation_error', 'id is required');
    }

    const parsed = budgetApprovalSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    return serviceOrdersService.recordBudgetApproval(id, parsed.data, request.sessionUser);
  });

  app.get('/api/v1/service-orders/:id/history', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    const id = (request.params as { id?: string }).id;
    if (!id) {
      throw appError(400, 'validation_error', 'id is required');
    }

    return serviceOrdersService.getHistory(id);
  });
};