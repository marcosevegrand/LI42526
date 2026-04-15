import type { Prisma } from '@prisma/client';

import { getPrismaClient } from '../../shared/db/prisma';

type TransactionClient = Prisma.TransactionClient;

type ListPartsInput = {
  page: number;
  limit: number;
  partReference?: string;
  description?: string;
  supplierId?: string;
  lowStock?: boolean;
};

type CreatePartInput = {
  partReference: string;
  description: string;
  supplierId: string;
  costPrice: string;
  salePrice: string;
  currentStock: number;
  minimumStock: number;
  isArchived: boolean;
};

export class InventoryRepository {
  async list(input: ListPartsInput) {
    return getPrismaClient().part.findMany({
      where: {
        partReference: input.partReference,
        supplierId: input.supplierId,
        description: input.description
          ? {
              contains: input.description,
              mode: 'insensitive',
            }
          : undefined,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    });
  }

  async findByReference(partReference: string) {
    return getPrismaClient().part.findUnique({
      where: { partReference },
    });
  }

  async supplierExists(supplierId: string) {
    const supplier = await getPrismaClient().supplier.findUnique({
      where: { id: supplierId },
      select: { id: true },
    });
    return Boolean(supplier);
  }

  async create(input: CreatePartInput) {
    return getPrismaClient().part.create({
      data: input,
    });
  }

  async updateByReference(
    partReference: string,
    input: Partial<Omit<CreatePartInput, 'partReference'>>,
  ) {
    return getPrismaClient().part.update({
      where: { partReference },
      data: input,
    });
  }

  async listLowStock(limit: number) {
    return getPrismaClient().part.findMany({
      where: {
        isArchived: false,
      },
      orderBy: {
        currentStock: 'asc',
      },
      take: limit,
    });
  }

  async listStockMovements(input: {
    partReference?: string;
    from?: Date;
    to?: Date;
    limit: number;
  }) {
    return getPrismaClient().stockMovement.findMany({
      where: {
        partReference: input.partReference,
        createdAt:
          input.from || input.to
            ? {
                gte: input.from,
                lte: input.to,
              }
            : undefined,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: input.limit,
    });
  }

  async adjustStock(input: {
    partReference: string;
    quantityDelta: number;
    origin: string;
    note?: string;
  }) {
    return getPrismaClient().$transaction(async (tx: TransactionClient) => {
      const part = await tx.part.findUnique({
        where: { partReference: input.partReference },
      });

      if (!part) {
        return null;
      }

      const balanceAfter = part.currentStock + input.quantityDelta;
      if (balanceAfter < 0) {
        throw new Error('negative_stock');
      }

      const updatedPart = await tx.part.update({
        where: { partReference: input.partReference },
        data: {
          currentStock: balanceAfter,
        },
      });

      await tx.stockMovement.create({
        data: {
          partReference: input.partReference,
          movementType:
            input.quantityDelta > 0 ? 'in' : input.quantityDelta < 0 ? 'out' : 'adjustment',
          origin: input.origin,
          quantityDelta: input.quantityDelta,
          balanceAfter,
          note: input.note,
        },
      });

      return updatedPart;
    });
  }
}
