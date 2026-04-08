import { listPartsQuerySchema, partSchema } from '@gengis-khan/contracts';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { appError, requireRole } from '../../shared/auth/session';
import { InventoryService } from './inventory.service';

const inventoryService = new InventoryService();

const updatePartSchema = partSchema.omit({ partReference: true }).partial();

const stockMovementQuerySchema = z.object({
  partReference: z.string().min(1).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const stockAdjustmentSchema = z.object({
  quantityDelta: z.number().int(),
  note: z.string().optional(),
});

export const inventoryModule: FastifyPluginAsync = async (app) => {
  app.get('/api/v1/parts', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    const parsed = listPartsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid query');
    }

    const parts = await inventoryService.list(parsed.data);
    return parts.map((part: unknown) => partSchema.parse(part));
  });

  app.post('/api/v1/parts', async (request) => {
    await requireRole(['manager'])(request);

    const parsed = partSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    const part = await inventoryService.create(parsed.data);
    return partSchema.parse(part);
  });

  app.get('/api/v1/parts/low-stock', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    const query = z
      .object({
        limit: z.coerce.number().int().min(1).max(100).default(50),
      })
      .safeParse(request.query);

    if (!query.success) {
      throw appError(400, 'validation_error', query.error.issues[0]?.message ?? 'Invalid query');
    }

    const parts = await inventoryService.listLowStock(query.data.limit);
    return parts.map((part: unknown) => partSchema.parse(part));
  });

  app.get('/api/v1/parts/:partReference', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    const partReference = (request.params as { partReference?: string }).partReference;
    if (!partReference) {
      throw appError(400, 'validation_error', 'partReference is required');
    }

    const part = await inventoryService.getByReference(partReference);
    return partSchema.parse(part);
  });

  app.patch('/api/v1/parts/:partReference', async (request) => {
    await requireRole(['manager'])(request);

    const partReference = (request.params as { partReference?: string }).partReference;
    if (!partReference) {
      throw appError(400, 'validation_error', 'partReference is required');
    }

    const parsed = updatePartSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    const part = await inventoryService.update(partReference, parsed.data);
    return partSchema.parse(part);
  });

  app.get('/api/v1/stock-movements', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    const parsed = stockMovementQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid query');
    }

    return inventoryService.listStockMovements(parsed.data);
  });

  app.post('/api/v1/parts/:partReference/stock-adjustments', async (request) => {
    await requireRole(['manager'])(request);

    const partReference = (request.params as { partReference?: string }).partReference;
    if (!partReference) {
      throw appError(400, 'validation_error', 'partReference is required');
    }

    const parsed = stockAdjustmentSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    const part = await inventoryService.adjustStock({
      partReference,
      quantityDelta: parsed.data.quantityDelta,
      note: parsed.data.note,
    });

    return partSchema.parse(part);
  });
};
