import { purchaseOrderSchema, supplierSchema } from '@gengis-khan/contracts';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { appError, requireRole } from '../../shared/auth/session';
import { buildIdempotencyFingerprint, claimIdempotencyKey } from '../../shared/idempotency/http';
import { SuppliersProcurementService } from './suppliers-procurement.service';

const suppliersProcurementService = new SuppliersProcurementService();

const updateSupplierSchema = supplierSchema.omit({ id: true }).partial();
const purchaseOrderIdParamSchema = z.object({
  purchaseOrderId: z.string().min(1),
});
const supplierIdParamSchema = z.object({
  supplierId: z.string().min(1),
});
const updatePurchaseOrderSchema = z.object({
  status: z.enum(['requested', 'received']).optional(),
  deliveredAt: z.string().date().optional(),
});

export const suppliersProcurementModule: FastifyPluginAsync = async (app) => {
  app.get('/api/v1/suppliers', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    const suppliers = await suppliersProcurementService.listSuppliers();
    return suppliers.map((supplier: unknown) => supplierSchema.parse(supplier));
  });

  app.post('/api/v1/suppliers', async (request) => {
    await requireRole(['manager'])(request);

    const parsed = supplierSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    const supplier = await suppliersProcurementService.createSupplier(parsed.data);
    return supplierSchema.parse(supplier);
  });

  app.get('/api/v1/suppliers/:supplierId', async (request) => {
    await requireRole(['manager', 'mechanic'])(request);

    const parsed = supplierIdParamSchema.safeParse(request.params);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid params');
    }

    const supplier = await suppliersProcurementService.getSupplierById(parsed.data.supplierId);
    return supplierSchema.parse(supplier);
  });

  app.patch('/api/v1/suppliers/:supplierId', async (request) => {
    await requireRole(['manager'])(request);

    const parsedId = supplierIdParamSchema.safeParse(request.params);
    if (!parsedId.success) {
      throw appError(400, 'validation_error', parsedId.error.issues[0]?.message ?? 'Invalid params');
    }

    const parsedPayload = updateSupplierSchema.safeParse(request.body);
    if (!parsedPayload.success) {
      throw appError(400, 'validation_error', parsedPayload.error.issues[0]?.message ?? 'Invalid payload');
    }

    const supplier = await suppliersProcurementService.updateSupplier(
      parsedId.data.supplierId,
      parsedPayload.data,
    );
    return supplierSchema.parse(supplier);
  });

  app.get('/api/v1/purchase-orders', async (request) => {
    await requireRole(['manager'])(request);

    const purchaseOrders = await suppliersProcurementService.listPurchaseOrders();
    return purchaseOrders.map((purchaseOrder: unknown) => purchaseOrderSchema.parse(purchaseOrder));
  });

  app.post('/api/v1/purchase-orders', async (request) => {
    await requireRole(['manager'])(request);

    const parsed = purchaseOrderSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    const purchaseOrder = await suppliersProcurementService.createPurchaseOrder(parsed.data);
    return purchaseOrderSchema.parse(purchaseOrder);
  });

  app.post('/api/v1/purchase-orders/generate-from-low-stock', async (request) => {
    await requireRole(['manager'])(request);

    const idempotency = claimIdempotencyKey({
      request,
      required: true,
      fingerprint: buildIdempotencyFingerprint({
        route: 'POST /api/v1/purchase-orders/generate-from-low-stock',
        body: request.body,
      }),
    });

    try {
      const purchaseOrders = await suppliersProcurementService.generateFromLowStock();
      return purchaseOrders.map((purchaseOrder: unknown) => purchaseOrderSchema.parse(purchaseOrder));
    } catch (error) {
      idempotency.rollback();
      throw error;
    }
  });

  app.get('/api/v1/purchase-orders/:purchaseOrderId', async (request) => {
    await requireRole(['manager'])(request);

    const parsed = purchaseOrderIdParamSchema.safeParse(request.params);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid params');
    }

    const purchaseOrder = await suppliersProcurementService.getPurchaseOrderById(
      parsed.data.purchaseOrderId,
    );
    return purchaseOrderSchema.parse(purchaseOrder);
  });

  app.patch('/api/v1/purchase-orders/:purchaseOrderId', async (request) => {
    await requireRole(['manager'])(request);

    const parsedId = purchaseOrderIdParamSchema.safeParse(request.params);
    if (!parsedId.success) {
      throw appError(400, 'validation_error', parsedId.error.issues[0]?.message ?? 'Invalid params');
    }

    const parsedPayload = updatePurchaseOrderSchema.safeParse(request.body);
    if (!parsedPayload.success) {
      throw appError(400, 'validation_error', parsedPayload.error.issues[0]?.message ?? 'Invalid payload');
    }

    const purchaseOrder = await suppliersProcurementService.updatePurchaseOrder(
      parsedId.data.purchaseOrderId,
      parsedPayload.data,
    );
    return purchaseOrderSchema.parse(purchaseOrder);
  });

  app.patch('/api/v1/purchase-orders/:purchaseOrderId/receive', async (request) => {
    await requireRole(['manager'])(request);

    const parsed = purchaseOrderIdParamSchema.safeParse(request.params);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid params');
    }

    const idempotency = claimIdempotencyKey({
      request,
      required: false,
      fingerprint: buildIdempotencyFingerprint({
        route: 'PATCH /api/v1/purchase-orders/:purchaseOrderId/receive',
        params: parsed.data,
        body: request.body,
      }),
    });

    try {
      const purchaseOrder = await suppliersProcurementService.receivePurchaseOrder(
        parsed.data.purchaseOrderId,
      );
      return purchaseOrderSchema.parse(purchaseOrder);
    } catch (error) {
      idempotency.rollback();
      throw error;
    }
  });
};
