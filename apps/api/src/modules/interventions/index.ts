import {
  interventionPartAssociationSchema,
  interventionSchema,
  timerStates,
} from '@gengis-khan/contracts';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { appError, requireRole } from '../../shared/auth/session';
import { buildIdempotencyFingerprint, claimIdempotencyKey } from '../../shared/idempotency/http';
import { InterventionsService } from './interventions.service';

const interventionsService = new InterventionsService();

const timerUpdateSchema = z.object({
  timerState: z.enum(timerStates),
});

const updateInterventionSchema = z
  .object({
    description: z.string().min(1).optional(),
    mechanicUserId: z.string().min(1).optional(),
    notes: z.string().optional(),
  })
  .refine((value) => value.description !== undefined || value.mechanicUserId !== undefined || value.notes !== undefined, {
    message: 'At least one field must be provided',
  });

export const interventionsModule: FastifyPluginAsync = async (app) => {
  app.get('/api/v1/service-orders/:serviceOrderId/interventions', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    const serviceOrderId = (request.params as { serviceOrderId?: string }).serviceOrderId;
    if (!serviceOrderId) {
      throw appError(400, 'validation_error', 'serviceOrderId is required');
    }

    const interventions = await interventionsService.listByServiceOrderId(serviceOrderId);
    return interventions.map((intervention: unknown) => interventionSchema.parse(intervention));
  });

  app.post('/api/v1/service-orders/:serviceOrderId/interventions', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    if (!request.sessionUser) {
      throw appError(401, 'unauthorized', 'Authentication required');
    }

    const serviceOrderId = (request.params as { serviceOrderId?: string }).serviceOrderId;
    if (!serviceOrderId) {
      throw appError(400, 'validation_error', 'serviceOrderId is required');
    }

    const parsed = interventionSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    const intervention = await interventionsService.create(
      {
        ...parsed.data,
        serviceOrderId,
      },
      request.sessionUser,
    );

    return interventionSchema.parse(intervention);
  });

  app.patch('/api/v1/interventions/:id/timer', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    const id = (request.params as { id?: string }).id;
    if (!id) {
      throw appError(400, 'validation_error', 'id is required');
    }

    const parsed = timerUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    const updated = await interventionsService.updateTimer({
      id,
      timerState: parsed.data.timerState,
    });

    return interventionSchema.parse(updated);
  });

  app.get('/api/v1/interventions/:id', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    const id = (request.params as { id?: string }).id;
    if (!id) {
      throw appError(400, 'validation_error', 'id is required');
    }

    const intervention = await interventionsService.getById(id);
    return interventionSchema.parse(intervention);
  });

  app.patch('/api/v1/interventions/:id', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    if (!request.sessionUser) {
      throw appError(401, 'unauthorized', 'Authentication required');
    }

    const id = (request.params as { id?: string }).id;
    if (!id) {
      throw appError(400, 'validation_error', 'id is required');
    }

    const parsed = updateInterventionSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    const updated = await interventionsService.update(id, parsed.data, request.sessionUser);
    return interventionSchema.parse(updated);
  });

  app.post('/api/v1/interventions/:id/timer/start', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    const id = (request.params as { id?: string }).id;
    if (!id) {
      throw appError(400, 'validation_error', 'id is required');
    }

    const updated = await interventionsService.timerStart(id);
    return interventionSchema.parse(updated);
  });

  app.post('/api/v1/interventions/:id/timer/pause', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    const id = (request.params as { id?: string }).id;
    if (!id) {
      throw appError(400, 'validation_error', 'id is required');
    }

    const updated = await interventionsService.timerPause(id);
    return interventionSchema.parse(updated);
  });

  app.post('/api/v1/interventions/:id/timer/stop', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    const id = (request.params as { id?: string }).id;
    if (!id) {
      throw appError(400, 'validation_error', 'id is required');
    }

    const updated = await interventionsService.timerStop(id);
    return interventionSchema.parse(updated);
  });

  app.post('/api/v1/interventions/:id/parts', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    const interventionId = (request.params as { id?: string }).id;
    if (!interventionId) {
      throw appError(400, 'validation_error', 'id is required');
    }

    const parsed = interventionPartAssociationSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    const idempotency = claimIdempotencyKey({
      request,
      required: true,
      fingerprint: buildIdempotencyFingerprint({
        route: 'POST /api/v1/interventions/:id/parts',
        params: { interventionId },
        body: parsed.data,
      }),
    });

    try {
      const attached = await interventionsService.attachPart({
        interventionId,
        ...parsed.data,
      });

      return interventionPartAssociationSchema.parse(attached);
    } catch (error) {
      idempotency.rollback();
      throw error;
    }
  });

  app.get('/api/v1/interventions/:id/parts', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    const interventionId = (request.params as { id?: string }).id;
    if (!interventionId) {
      throw appError(400, 'validation_error', 'id is required');
    }

    const parts = await interventionsService.listParts(interventionId);
    return parts.map((part: unknown) => interventionPartAssociationSchema.parse(part));
  });
};
