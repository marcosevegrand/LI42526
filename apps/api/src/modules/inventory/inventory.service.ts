import { appError } from '../../shared/auth/session';
import { InventoryRepository } from './inventory.repository';

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

export class InventoryService {
  constructor(private readonly repository = new InventoryRepository()) {}

  async list(input: ListPartsInput) {
    const parts = await this.repository.list(input);

    const filtered = input.lowStock
      ? parts.filter((part: unknown) => {
          const source = part as { currentStock: number; minimumStock: number };
          return source.currentStock <= source.minimumStock;
        })
      : parts;

    return filtered.map((part: unknown) => this.toDto(part));
  }

  async getByReference(partReference: string) {
    const part = await this.repository.findByReference(partReference);
    if (!part) {
      throw appError(404, 'not_found', 'Part not found');
    }

    return this.toDto(part);
  }

  async create(input: CreatePartInput) {
    const existing = await this.repository.findByReference(input.partReference);
    if (existing) {
      throw appError(409, 'part_already_exists', 'partReference already exists');
    }

    const supplierExists = await this.repository.supplierExists(input.supplierId);
    if (!supplierExists) {
      throw appError(400, 'invalid_supplier', 'supplierId does not exist');
    }

    const part = await this.repository.create(input);
    return this.toDto(part);
  }

  async update(partReference: string, input: Partial<Omit<CreatePartInput, 'partReference'>>) {
    const existing = await this.repository.findByReference(partReference);
    if (!existing) {
      throw appError(404, 'not_found', 'Part not found');
    }

    if (input.supplierId) {
      const supplierExists = await this.repository.supplierExists(input.supplierId);
      if (!supplierExists) {
        throw appError(400, 'invalid_supplier', 'supplierId does not exist');
      }
    }

    const part = await this.repository.updateByReference(partReference, input);
    return this.toDto(part);
  }

  async listLowStock(limit = 50) {
    const parts = await this.repository.listLowStock(limit);
    return parts
      .filter((part: unknown) => {
        const source = part as { currentStock: number; minimumStock: number };
        return source.currentStock <= source.minimumStock;
      })
      .map((part: unknown) => this.toDto(part));
  }

  async listStockMovements(input: {
    partReference?: string;
    from?: string;
    to?: string;
    limit: number;
  }) {
    const movements = await this.repository.listStockMovements({
      partReference: input.partReference,
      from: input.from ? new Date(`${input.from}T00:00:00.000Z`) : undefined,
      to: input.to ? new Date(`${input.to}T23:59:59.999Z`) : undefined,
      limit: input.limit,
    });

    return movements.map((movement: unknown) => {
      const source = movement as {
        id: string;
        partReference: string;
        movementType: 'in' | 'out' | 'adjustment';
        origin: string;
        quantityDelta: number;
        balanceAfter: number;
        note: string | null;
        createdAt: Date;
      };

      return {
        id: source.id,
        partReference: source.partReference,
        movementType: source.movementType,
        origin: source.origin,
        quantityDelta: source.quantityDelta,
        balanceAfter: source.balanceAfter,
        note: source.note ?? undefined,
        createdAt: source.createdAt.toISOString(),
      };
    });
  }

  async adjustStock(input: {
    partReference: string;
    quantityDelta: number;
    note?: string;
  }) {
    try {
      const part = await this.repository.adjustStock({
        partReference: input.partReference,
        quantityDelta: input.quantityDelta,
        origin: 'manual_adjustment',
        note: input.note,
      });

      if (!part) {
        throw appError(404, 'not_found', 'Part not found');
      }

      return this.toDto(part);
    } catch (error) {
      if (error instanceof Error && error.message === 'negative_stock') {
        throw appError(409, 'invalid_stock_adjustment', 'Stock cannot become negative');
      }

      throw error;
    }
  }

  private toDto(part: unknown) {
    const source = part as {
      partReference: string;
      description: string;
      supplierId: string;
      costPrice: { toFixed: (digits: number) => string } | string | number;
      salePrice: { toFixed: (digits: number) => string } | string | number;
      currentStock: number;
      minimumStock: number;
      isArchived: boolean;
    };

    return {
      partReference: source.partReference,
      description: source.description,
      supplierId: source.supplierId,
      costPrice: this.formatMoney(source.costPrice),
      salePrice: this.formatMoney(source.salePrice),
      currentStock: source.currentStock,
      minimumStock: source.minimumStock,
      isArchived: source.isArchived,
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
}