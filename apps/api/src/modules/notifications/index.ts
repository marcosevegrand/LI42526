import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { appError, requireRole } from '../../shared/auth/session';
import { buildIdempotencyFingerprint, claimIdempotencyKey } from '../../shared/idempotency/http';
import { NotificationsService } from './notifications.service';

const notificationTypeSchema = z.enum([
  'reception_confirmation',
  'budget_request',
  'repair_completed',
  'awaiting_parts_delay',
]);

const notificationPayloadSchema = z.object({
  type: notificationTypeSchema,
  recipientEmail: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  triggerSource: z.string().optional(),
});

const updateTemplateSchema = z.object({
  subjectTemplate: z.string().min(1),
  bodyTemplate: z.string().min(1),
});

const notificationsService = new NotificationsService();

export const notificationsModule: FastifyPluginAsync = async (app) => {
  app.get('/api/v1/notifications', async (request) => {
    await requireRole(['manager'])(request);
    return notificationsService.list();
  });

  app.post('/api/v1/notifications', async (request) => {
    await requireRole(['manager'])(request);

    const parsed = notificationPayloadSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    const idempotency = claimIdempotencyKey({
      request,
      required: false,
      fingerprint: buildIdempotencyFingerprint({
        route: 'POST /api/v1/notifications',
        body: parsed.data,
      }),
    });

    try {
      return notificationsService.send(parsed.data);
    } catch (error) {
      idempotency.rollback();
      throw error;
    }
  });

  app.post('/api/v1/notifications/send', async (request) => {
    await requireRole(['manager'])(request);

    const parsed = notificationPayloadSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    const idempotency = claimIdempotencyKey({
      request,
      required: false,
      fingerprint: buildIdempotencyFingerprint({
        route: 'POST /api/v1/notifications/send',
        body: parsed.data,
      }),
    });

    try {
      return notificationsService.send(parsed.data);
    } catch (error) {
      idempotency.rollback();
      throw error;
    }
  });

  app.get('/api/v1/notification-templates', async (request) => {
    await requireRole(['manager'])(request);
    return notificationsService.listTemplates();
  });

  app.patch('/api/v1/notification-templates/:templateId', async (request) => {
    await requireRole(['manager'])(request);

    const templateId = (request.params as { templateId?: string }).templateId;
    if (!templateId) {
      throw appError(400, 'validation_error', 'templateId is required');
    }

    const parsed = updateTemplateSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    return notificationsService.updateTemplate({
      id: templateId,
      subjectTemplate: parsed.data.subjectTemplate,
      bodyTemplate: parsed.data.bodyTemplate,
    });
  });
};
