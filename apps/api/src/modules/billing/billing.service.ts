import { appError } from '../../shared/auth/session';
import { BillingRepository } from './billing.repository';

export class BillingService {
  constructor(private readonly repository = new BillingRepository()) {}

  async listInvoices() {
    const invoices = await this.repository.listInvoices();
    return invoices.map((invoice: unknown) => this.toSummaryDto(invoice));
  }

  async issueInvoice(input: { serviceOrderId: string; paymentMethod: string; note?: string }) {
    const serviceOrder = await this.repository.findServiceOrderById(input.serviceOrderId);
    if (!serviceOrder) {
      throw appError(404, 'not_found', 'Service order not found');
    }

    if (serviceOrder.status !== 'completed' && serviceOrder.status !== 'delivered') {
      throw appError(409, 'service_order_not_billable', 'Service order must be completed before invoicing');
    }

    const existingInvoice = await this.repository.findInvoiceByServiceOrderId(input.serviceOrderId);
    if (existingInvoice) {
      throw appError(409, 'invoice_already_exists', 'Service order already has an invoice');
    }

    const config = await this.repository.findConfiguration();
    const hourlyLaborRate = this.toNumber(config?.hourlyLaborRate ?? '0.00');
    const vatRate = this.toNumber(config?.vatRate ?? '0.00');

    const laborSeconds = serviceOrder.interventions.reduce(
      (acc, intervention) => acc + intervention.elapsedSeconds,
      0,
    );
    const laborAmount = (laborSeconds / 3600) * hourlyLaborRate;

    const partsAmount = serviceOrder.interventions.reduce((interventionAcc, intervention) => {
      const interventionPartsAmount = intervention.parts.reduce((partAcc, association) => {
        return partAcc + association.quantity * this.toNumber(association.part.salePrice);
      }, 0);
      return interventionAcc + interventionPartsAmount;
    }, 0);

    const subtotal = laborAmount + partsAmount;
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;

    const created = await this.repository.createInvoice({
      serviceOrderId: input.serviceOrderId,
      paymentMethod: input.paymentMethod,
      subtotal: subtotal.toFixed(2),
      vatAmount: vatAmount.toFixed(2),
      total: total.toFixed(2),
      note: input.note,
    });

    return this.toSummaryDto(created);
  }

  async getInvoiceById(id: string) {
    const invoice = await this.repository.findInvoiceById(id);
    if (!invoice) {
      throw appError(404, 'not_found', 'Invoice not found');
    }

    return this.toSummaryDto(invoice);
  }

  async updatePayment(input: {
    id: string;
    paymentMethod: string;
    paymentStatus: 'pending' | 'paid' | 'overdue';
    paidAt?: string;
    note?: string;
  }) {
    const invoice = await this.repository.findInvoiceById(input.id);
    if (!invoice) {
      throw appError(404, 'not_found', 'Invoice not found');
    }

    const updated = await this.repository.updateInvoicePayment({
      id: input.id,
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentStatus,
      paidAt: input.paidAt ? new Date(input.paidAt) : undefined,
      note: input.note,
    });

    return this.toSummaryDto(updated);
  }

  async registerPayment(input: {
    id: string;
    paymentMethod: string;
    paidAt?: string;
    note?: string;
  }) {
    return this.updatePayment({
      id: input.id,
      paymentMethod: input.paymentMethod,
      paymentStatus: 'paid',
      paidAt: input.paidAt,
      note: input.note,
    });
  }

  async listPendingBusinessInvoices() {
    const invoices = await this.repository.listPendingBusinessInvoices();
    return invoices.map((invoice: unknown) => this.toSummaryDto(invoice));
  }

  private toSummaryDto(invoice: unknown) {
    const source = invoice as {
      id: string;
      invoiceNumber: number;
      subtotal: { toFixed: (digits: number) => string } | string | number;
      vatAmount: { toFixed: (digits: number) => string } | string | number;
      total: { toFixed: (digits: number) => string } | string | number;
      paymentStatus: 'pending' | 'paid' | 'overdue';
    };

    return {
      id: source.id,
      invoiceNumber: `INV-${String(source.invoiceNumber).padStart(6, '0')}`,
      subtotal: this.formatMoney(source.subtotal),
      vatAmount: this.formatMoney(source.vatAmount),
      total: this.formatMoney(source.total),
      paymentStatus: source.paymentStatus,
    };
  }

  private formatMoney(value: { toFixed: (digits: number) => string } | string | number) {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return value.toFixed(2);
  }

  private toNumber(value: { toString: () => string } | string | number) {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      return Number(value);
    }
    return Number(value.toString());
  }
}
