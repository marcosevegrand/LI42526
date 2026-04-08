import { getPrismaClient } from '../../shared/db/prisma';

type ListCustomersInput = {
  page: number;
  limit: number;
  nif?: string;
  fullName?: string;
  email?: string;
  customerType?: 'personal' | 'business';
  isArchived?: boolean;
};

type CreateCustomerInput = {
  nif: string;
  customerType: 'personal' | 'business';
  fullName: string;
  legalName?: string;
  email: string;
  phone: string;
  address?: string;
  creditLimit?: string;
  paymentTerms?: string;
  isArchived: boolean;
};

export class CustomersRepository {
  async list(input: ListCustomersInput) {
    return getPrismaClient().customer.findMany({
      where: {
        nif: input.nif,
        customerType: input.customerType,
        isArchived: input.isArchived,
        fullName: input.fullName
          ? {
              contains: input.fullName,
              mode: 'insensitive',
            }
          : undefined,
        email: input.email,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    });
  }

  async findByNif(nif: string) {
    return getPrismaClient().customer.findUnique({
      where: { nif },
    });
  }

  async create(input: CreateCustomerInput) {
    return getPrismaClient().customer.create({
      data: input,
    });
  }

  async updateByNif(
    nif: string,
    input: Partial<
      Omit<CreateCustomerInput, 'nif'> & {
        customerType: 'personal' | 'business';
      }
    >,
  ) {
    return getPrismaClient().customer.update({
      where: { nif },
      data: input,
    });
  }

  async listServiceOrderHistoryByCustomerNif(nif: string) {
    return getPrismaClient().serviceOrder.findMany({
      where: { customerNif: nif },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        serviceOrderNumber: true,
        status: true,
        reportedProblem: true,
        createdAt: true,
        completedAt: true,
        deliveredAt: true,
        scooterSerialNumber: true,
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            paymentStatus: true,
          },
        },
      },
    });
  }
}