import { appError } from '../../shared/auth/session';
import { CustomersRepository } from './customers.repository';

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

type UpdateCustomerInput = Partial<Omit<CreateCustomerInput, 'nif'>>;

export class CustomersService {
  constructor(private readonly repository = new CustomersRepository()) {}

  async list(input: ListCustomersInput) {
    const customers = await this.repository.list(input);
    return customers.map((customer: unknown) => this.toDto(customer));
  }

  async getByNif(nif: string) {
    const customer = await this.repository.findByNif(nif);
    if (!customer) {
      throw appError(404, 'not_found', 'Customer not found');
    }

    return this.toDto(customer);
  }

  async create(input: CreateCustomerInput) {
    const existing = await this.repository.findByNif(input.nif);
    if (existing) {
      throw appError(409, 'customer_already_exists', 'Customer NIF already exists');
    }

    const customer = await this.repository.create({
      ...input,
      creditLimit: input.creditLimit,
    });

    return this.toDto(customer);
  }

  async update(nif: string, input: UpdateCustomerInput) {
    const existing = await this.repository.findByNif(nif);
    if (!existing) {
      throw appError(404, 'not_found', 'Customer not found');
    }

    const nextCustomerType = input.customerType ?? existing.customerType;
    const nextLegalName = input.legalName ?? existing.legalName;
    const nextCreditLimit = input.creditLimit ?? this.formatMoney(existing.creditLimit);
    const nextPaymentTerms = input.paymentTerms ?? existing.paymentTerms;

    if (nextCustomerType === 'business') {
      if (!nextLegalName || !nextCreditLimit || !nextPaymentTerms) {
        throw appError(
          400,
          'validation_error',
          'Business customers require legalName, creditLimit and paymentTerms',
        );
      }
    }

    const updated = await this.repository.updateByNif(nif, input);
    return this.toDto(updated);
  }

  async getHistory(nif: string) {
    const existing = await this.repository.findByNif(nif);
    if (!existing) {
      throw appError(404, 'not_found', 'Customer not found');
    }

    const history = await this.repository.listServiceOrderHistoryByCustomerNif(nif);
    return history.map((entry: unknown) => {
      const source = entry as {
        id: string;
        serviceOrderNumber: number;
        status: string;
        reportedProblem: string;
        scooterSerialNumber: string;
        createdAt: Date;
        completedAt: Date | null;
        deliveredAt: Date | null;
        invoice: {
          id: string;
          invoiceNumber: number;
          total: unknown;
          paymentStatus: string;
        } | null;
      };

      return {
        id: source.id,
        serviceOrderNumber: source.serviceOrderNumber,
        status: source.status,
        reportedProblem: source.reportedProblem,
        scooterSerialNumber: source.scooterSerialNumber,
        createdAt: source.createdAt.toISOString(),
        completedAt: source.completedAt?.toISOString(),
        deliveredAt: source.deliveredAt?.toISOString(),
        invoice: source.invoice
          ? {
              id: source.invoice.id,
              invoiceNumber: source.invoice.invoiceNumber,
              total: this.formatMoney(source.invoice.total),
              paymentStatus: source.invoice.paymentStatus,
            }
          : undefined,
      };
    });
  }

  private toDto(customer: unknown) {
    const source = customer as {
      nif: string;
      customerType: 'personal' | 'business';
      fullName: string;
      legalName: string | null;
      email: string;
      phone: string;
      address: string | null;
      creditLimit: unknown;
      paymentTerms: string | null;
      isArchived: boolean;
      createdAt: Date;
      updatedAt: Date;
    };

    return {
      nif: source.nif,
      customerType: source.customerType,
      fullName: source.fullName,
      legalName: source.legalName ?? undefined,
      email: source.email,
      phone: source.phone,
      address: source.address ?? undefined,
      creditLimit: this.formatMoney(source.creditLimit),
      paymentTerms: source.paymentTerms ?? undefined,
      isArchived: source.isArchived,
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString(),
    };
  }

  private formatMoney(value: unknown): string | undefined {
    if (value == null) {
      return undefined;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number') {
      return value.toFixed(2);
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      'toFixed' in value &&
      typeof (value as { toFixed?: unknown }).toFixed === 'function'
    ) {
      return (value as { toFixed: (scale: number) => string }).toFixed(2);
    }

    return String(value);
  }
}