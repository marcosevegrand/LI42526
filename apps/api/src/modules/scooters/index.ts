import { scooterSchema } from '@gengis-khan/contracts';
import { z } from 'zod';
import type { FastifyPluginAsync } from 'fastify';

import { appError, requireRole } from '../../shared/auth/session';
import { ScootersService } from './scooters.service';

const scootersService = new ScootersService();

const scootersListQuerySchema = z.object({
  serialNumber: z.string().min(1).optional(),
  customerNif: z.string().regex(/^\d{9}$/).optional(),
  isArchived: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const updateScooterSchema = scooterSchema.omit({ serialNumber: true }).partial();

export const scootersModule: FastifyPluginAsync = async (app) => {
  app.get('/api/v1/scooters', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    const parsed = scootersListQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid query');
    }

    const scooters = await scootersService.list(parsed.data);
    return scooters.map((scooter: unknown) => scooterSchema.parse(scooter));
  });

  app.get('/api/v1/scooters/:serialNumber', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    const serialNumber = (request.params as { serialNumber?: string }).serialNumber;
    if (!serialNumber) {
      throw appError(400, 'validation_error', 'serialNumber is required');
    }

    const scooter = await scootersService.getBySerialNumber(serialNumber);
    return scooterSchema.parse(scooter);
  });

  app.post('/api/v1/scooters', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    const parsed = scooterSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    const scooter = await scootersService.create(parsed.data);
    return scooterSchema.parse(scooter);
  });

  app.patch('/api/v1/scooters/:serialNumber', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    const serialNumber = (request.params as { serialNumber?: string }).serialNumber;
    if (!serialNumber) {
      throw appError(400, 'validation_error', 'serialNumber is required');
    }

    const parsed = updateScooterSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    const scooter = await scootersService.update(serialNumber, parsed.data);
    return scooterSchema.parse(scooter);
  });

  app.get('/api/v1/scooters/:serialNumber/repairs', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    const serialNumber = (request.params as { serialNumber?: string }).serialNumber;
    if (!serialNumber) {
      throw appError(400, 'validation_error', 'serialNumber is required');
    }

    return scootersService.getRepairs(serialNumber);
  });
};
