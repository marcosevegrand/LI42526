import { invoiceIssueSchema, invoicePaymentSchema, invoiceSummarySchema } from '@gengis-khan/contracts';
import type { FastifyPluginAsync } from 'fastify';
import PDFDocument from 'pdfkit';
import { z } from 'zod';

import { appError, requireRole } from '../../shared/auth/session';
import { buildIdempotencyFingerprint, claimIdempotencyKey } from '../../shared/idempotency/http';
import { BillingService } from './billing.service';

async function buildInvoicePdf(invoice: {
  invoiceNumber: string;
  subtotal: string;
  vatAmount: string;
  total: string;
  paymentStatus: string;
}): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(22).font('Helvetica-Bold').text('Gengis Khan — Atelier de Engenharia', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#666').text('Fatura emitida automaticamente pelo sistema de gestao da oficina.');
    doc.moveDown(1.2);

    doc.fillColor('#000').fontSize(16).font('Helvetica-Bold').text(`Fatura ${invoice.invoiceNumber}`);
    doc.moveDown(0.5);

    const status = invoice.paymentStatus.toUpperCase();
    doc.fontSize(11).font('Helvetica').fillColor('#444').text(`Estado de pagamento: ${status}`);
    doc.moveDown(1.5);

    // Totals table
    const left = 50;
    const right = 545;
    const drawRow = (label: string, value: string, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(12).fillColor('#000');
      const y = doc.y;
      doc.text(label, left, y);
      doc.text(`EUR ${value}`, left, y, { align: 'right', width: right - left });
      doc.moveDown(0.6);
    };

    drawRow('Subtotal', invoice.subtotal);
    drawRow('IVA', invoice.vatAmount);
    doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor('#ccc').stroke();
    doc.moveDown(0.4);
    drawRow('Total', invoice.total, true);

    doc.moveDown(2);
    doc.fontSize(9).fillColor('#999').text(`Documento gerado em ${new Date().toLocaleString('pt-PT')}`, { align: 'center' });

    doc.end();
  });
}

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
    const pdf = await buildInvoicePdf(invoice);

    reply.header('content-type', 'application/pdf');
    reply.header('content-disposition', `inline; filename="${invoice.invoiceNumber}.pdf"`);
    return reply.send(pdf);
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
