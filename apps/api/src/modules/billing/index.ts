import { invoiceIssueSchema, invoicePaymentSchema, invoiceSummarySchema } from '@gengis-khan/contracts';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { appError, requireRole } from '../../shared/auth/session';
import { buildIdempotencyFingerprint, claimIdempotencyKey } from '../../shared/idempotency/http';
import { BillingService } from './billing.service';

const billingService = new BillingService();

const invoiceIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const billingModule: FastifyPluginAsync = async (app) => {
  app.get('/api/v1/invoices', async (request) => {
    await requireRole(['manager'])(request);

    const invoices = await billingService.listInvoices();
    return invoices.map((invoice: unknown) => invoiceSummarySchema.parse(invoice));
  });

  app.post('/api/v1/invoices', async (request) => {
    await requireRole(['manager'])(request);

    const parsed = invoiceIssueSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    const idempotency = claimIdempotencyKey({
      request,
      required: true,
      fingerprint: buildIdempotencyFingerprint({
        route: 'POST /api/v1/invoices',
        body: parsed.data,
      }),
    });

    try {
      const invoice = await billingService.issueInvoice(parsed.data);
      return invoiceSummarySchema.parse(invoice);
    } catch (error) {
      idempotency.rollback();
      throw error;
    }
  });

  app.post('/api/v1/invoices/issue', async (request) => {
    await requireRole(['manager'])(request);

    const parsed = invoiceIssueSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    const invoice = await billingService.issueInvoice(parsed.data);
    return invoiceSummarySchema.parse(invoice);
  });

  app.get('/api/v1/invoices/pending-business', async (request) => {
    await requireRole(['manager'])(request);

    const invoices = await billingService.listPendingBusinessInvoices();
    return invoices.map((invoice: unknown) => invoiceSummarySchema.parse(invoice));
  });

  app.get('/api/v1/invoices/:id', async (request) => {
    await requireRole(['manager'])(request);

    const parsed = invoiceIdParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid params');
    }

    const invoice = await billingService.getInvoiceById(parsed.data.id);
    return invoiceSummarySchema.parse(invoice);
  });

  app.get('/api/v1/invoices/:id/pdf', async (request, reply) => {
    await requireRole(['manager'])(request);

    const parsed = invoiceIdParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid params');
    }

    const invoice = await billingService.getInvoiceById(parsed.data.id);
    const content = [
      'Invoice preview',
      `Invoice Number: ${invoice.invoiceNumber}`,
      `Subtotal: ${invoice.subtotal}`,
      `VAT: ${invoice.vatAmount}`,
      `Total: ${invoice.total}`,
      `Payment Status: ${invoice.paymentStatus}`,
    ].join('\n');

    reply.header('content-type', 'application/pdf');
    return Buffer.from(content, 'utf-8');
  });

  app.post('/api/v1/invoices/:id/payments', async (request) => {
    await requireRole(['manager'])(request);

    const parsedId = invoiceIdParamsSchema.safeParse(request.params);
    if (!parsedId.success) {
      throw appError(400, 'validation_error', parsedId.error.issues[0]?.message ?? 'Invalid params');
    }

    const parsed = invoicePaymentSchema.omit({ paymentStatus: true }).safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    const idempotency = claimIdempotencyKey({
      request,
      required: true,
      fingerprint: buildIdempotencyFingerprint({
        route: 'POST /api/v1/invoices/:id/payments',
        params: parsedId.data,
        body: parsed.data,
      }),
    });

    try {
      const invoice = await billingService.registerPayment({
        id: parsedId.data.id,
        paymentMethod: parsed.data.paymentMethod,
        paidAt: parsed.data.paidAt,
        note: parsed.data.note,
      });

      return invoiceSummarySchema.parse(invoice);
    } catch (error) {
      idempotency.rollback();
      throw error;
    }
  });

  app.patch('/api/v1/invoices/:id/payment', async (request) => {
    await requireRole(['manager'])(request);

    const parsedId = invoiceIdParamsSchema.safeParse(request.params);
    if (!parsedId.success) {
      throw appError(400, 'validation_error', parsedId.error.issues[0]?.message ?? 'Invalid params');
    }

    const parsed = invoicePaymentSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    const invoice = await billingService.updatePayment({
      id: parsedId.data.id,
      ...parsed.data,
    });

    return invoiceSummarySchema.parse(invoice);
  });

};
