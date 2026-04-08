import { getPrismaClient } from '../../shared/db/prisma';

export class BillingRepository {
  async listInvoices() {
    return getPrismaClient().invoice.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findInvoiceById(id: string) {
    return getPrismaClient().invoice.findUnique({
      where: { id },
    });
  }

  async findServiceOrderById(id: string) {
    return getPrismaClient().serviceOrder.findUnique({
      where: { id },
      include: {
        interventions: {
          include: {
            parts: {
              include: {
                part: true,
              },
            },
          },
        },
      },
    });
  }

  async findInvoiceByServiceOrderId(serviceOrderId: string) {
    return getPrismaClient().invoice.findFirst({
      where: { serviceOrderId },
    });
  }

  async findConfiguration() {
    return getPrismaClient().financialConfiguration.findUnique({
      where: { id: 'default' },
    });
  }

  async createInvoice(input: {
    serviceOrderId: string;
    paymentMethod: string;
    subtotal: string;
    vatAmount: string;
    total: string;
    note?: string;
  }) {
    return getPrismaClient().invoice.create({
      data: {
        serviceOrderId: input.serviceOrderId,
        paymentMethod: input.paymentMethod,
        subtotal: input.subtotal,
        vatAmount: input.vatAmount,
        total: input.total,
        note: input.note,
      },
    });
  }

  async updateInvoicePayment(input: {
    id: string;
    paymentMethod: string;
    paymentStatus: 'pending' | 'paid' | 'overdue';
    paidAt?: Date;
    note?: string;
  }) {
    return getPrismaClient().invoice.update({
      where: { id: input.id },
      data: {
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentStatus,
        paidAt: input.paidAt,
        note: input.note,
      },
    });
  }

  async listPendingBusinessInvoices() {
    return getPrismaClient().invoice.findMany({
      where: {
        paymentStatus: {
          in: ['pending', 'overdue'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}