import { appError } from '../../shared/auth/session';
import { ScootersRepository } from './scooters.repository';

type ListScootersInput = {
  serialNumber?: string;
  customerNif?: string;
  isArchived?: boolean;
  limit: number;
};

type CreateScooterInput = {
  serialNumber: string;
  brand: string;
  model: string;
  conditionNotes?: string;
  customerNif: string;
  isArchived: boolean;
};

type UpdateScooterInput = Partial<Omit<CreateScooterInput, 'serialNumber'>>;

export class ScootersService {
  constructor(private readonly repository = new ScootersRepository()) {}

  async list(input: ListScootersInput) {
    const scooters = await this.repository.list(input);
    return scooters.map((scooter: unknown) => this.toDto(scooter));
  }

  async getBySerialNumber(serialNumber: string) {
    const scooter = await this.repository.findBySerialNumber(serialNumber);
    if (!scooter) {
      throw appError(404, 'not_found', 'Scooter not found');
    }

    return this.toDto(scooter);
  }

  async create(input: CreateScooterInput) {
    const existing = await this.repository.findBySerialNumber(input.serialNumber);
    if (existing) {
      throw appError(409, 'scooter_already_exists', 'Scooter serial number already exists');
    }

    const customerExists = await this.repository.customerExists(input.customerNif);
    if (!customerExists) {
      throw appError(400, 'invalid_customer', 'customerNif does not exist');
    }

    const scooter = await this.repository.create(input);
    return this.toDto(scooter);
  }

  async update(serialNumber: string, input: UpdateScooterInput) {
    const existing = await this.repository.findBySerialNumber(serialNumber);
    if (!existing) {
      throw appError(404, 'not_found', 'Scooter not found');
    }

    if (input.customerNif) {
      const customerExists = await this.repository.customerExists(input.customerNif);
      if (!customerExists) {
        throw appError(400, 'invalid_customer', 'customerNif does not exist');
      }
    }

    const updated = await this.repository.updateBySerialNumber(serialNumber, input);
    return this.toDto(updated);
  }

  async getRepairs(serialNumber: string) {
    const existing = await this.repository.findBySerialNumber(serialNumber);
    if (!existing) {
      throw appError(404, 'not_found', 'Scooter not found');
    }

    const repairs = await this.repository.listRepairsBySerialNumber(serialNumber);
    return repairs.map((repair: unknown) => {
      const source = repair as {
        id: string;
        serviceOrderNumber: number;
        customerNif: string;
        status: string;
        reportedProblem: string;
        createdAt: Date;
        completedAt: Date | null;
        deliveredAt: Date | null;
      };

      return {
        id: source.id,
        serviceOrderNumber: source.serviceOrderNumber,
        customerNif: source.customerNif,
        status: source.status,
        reportedProblem: source.reportedProblem,
        createdAt: source.createdAt.toISOString(),
        completedAt: source.completedAt?.toISOString(),
        deliveredAt: source.deliveredAt?.toISOString(),
      };
    });
  }

  private toDto(scooter: unknown) {
    const source = scooter as {
      serialNumber: string;
      brand: string;
      model: string;
      conditionNotes: string | null;
      customerNif: string;
      isArchived: boolean;
    };

    return {
      serialNumber: source.serialNumber,
      brand: source.brand,
      model: source.model,
      conditionNotes: source.conditionNotes ?? undefined,
      customerNif: source.customerNif,
      isArchived: source.isArchived,
    };
  }
}