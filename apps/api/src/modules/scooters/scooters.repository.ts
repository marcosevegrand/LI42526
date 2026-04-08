import { getPrismaClient } from '../../shared/db/prisma';

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

export class ScootersRepository {
  async list(input: ListScootersInput) {
    return getPrismaClient().scooter.findMany({
      where: {
        serialNumber: input.serialNumber,
        customerNif: input.customerNif,
        isArchived: input.isArchived,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: input.limit,
    });
  }

  async findBySerialNumber(serialNumber: string) {
    return getPrismaClient().scooter.findUnique({
      where: { serialNumber },
    });
  }

  async customerExists(customerNif: string): Promise<boolean> {
    const customer = await getPrismaClient().customer.findUnique({
      where: { nif: customerNif },
      select: { nif: true },
    });
    return Boolean(customer);
  }

  async create(input: CreateScooterInput) {
    return getPrismaClient().scooter.create({
      data: input,
    });
  }

  async updateBySerialNumber(
    serialNumber: string,
    input: Partial<Omit<CreateScooterInput, 'serialNumber'>>,
  ) {
    return getPrismaClient().scooter.update({
      where: { serialNumber },
      data: input,
    });
  }

  async listRepairsBySerialNumber(serialNumber: string) {
    return getPrismaClient().serviceOrder.findMany({
      where: { scooterSerialNumber: serialNumber },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        serviceOrderNumber: true,
        customerNif: true,
        status: true,
        reportedProblem: true,
        createdAt: true,
        completedAt: true,
        deliveredAt: true,
      },
    });
  }
}