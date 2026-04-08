import { appError } from '../../shared/auth/session';
import { SuppliersProcurementRepository } from './suppliers-procurement.repository';

type CreateSupplierInput = {
  name: string;
  email: string;
  phone: string;
  paymentTerms: string;
};

type CreatePurchaseOrderInput = {
  supplierId: string;
  items: Array<{
    partReference: string;
    quantity: number;
  }>;
};

export class SuppliersProcurementService {
  constructor(private readonly repository = new SuppliersProcurementRepository()) {}

  async listSuppliers() {
    const suppliers = await this.repository.listSuppliers();
    return suppliers.map((supplier: unknown) => this.toSupplierDto(supplier));
  }

  async createSupplier(input: CreateSupplierInput) {
    const supplier = await this.repository.createSupplier(input);
    return this.toSupplierDto(supplier);
  }

  async getSupplierById(id: string) {
    const supplier = await this.repository.findSupplierById(id);
    if (!supplier) {
      throw appError(404, 'not_found', 'Supplier not found');
    }

    return this.toSupplierDto(supplier);
  }

  async updateSupplier(id: string, input: Partial<CreateSupplierInput>) {
    await this.getSupplierById(id);
    const supplier = await this.repository.updateSupplier(id, input);
    return this.toSupplierDto(supplier);
  }

  async listPurchaseOrders() {
    const purchaseOrders = await this.repository.listPurchaseOrders();
    return purchaseOrders.map((purchaseOrder: unknown) => this.toPurchaseOrderDto(purchaseOrder));
  }

  async createPurchaseOrder(input: CreatePurchaseOrderInput) {
    const supplier = await this.repository.findSupplierById(input.supplierId);
    if (!supplier) {
      throw appError(400, 'invalid_supplier', 'supplierId does not exist');
    }

    const partReferences = input.items.map((item) => item.partReference);
    const allPartsExist = await this.repository.partsExist(partReferences);
    if (!allPartsExist) {
      throw appError(400, 'invalid_part_reference', 'One or more partReference values do not exist');
    }

    const purchaseOrder = await this.repository.createPurchaseOrder(input);
    return this.toPurchaseOrderDto(purchaseOrder);
  }

  async getPurchaseOrderById(id: string) {
    const purchaseOrder = await this.repository.findPurchaseOrderById(id);
    if (!purchaseOrder) {
      throw appError(404, 'not_found', 'Purchase order not found');
    }

    return this.toPurchaseOrderDto(purchaseOrder);
  }

  async updatePurchaseOrder(
    id: string,
    input: {
      status?: 'requested' | 'received';
      deliveredAt?: string;
    },
  ) {
    await this.getPurchaseOrderById(id);

    const purchaseOrder = await this.repository.updatePurchaseOrder(id, {
      status: input.status,
      deliveredAt: input.deliveredAt ? new Date(`${input.deliveredAt}T00:00:00.000Z`) : undefined,
    });

    return this.toPurchaseOrderDto(purchaseOrder);
  }

  async receivePurchaseOrder(id: string) {
    const purchaseOrder = await this.repository.findPurchaseOrderById(id);
    if (!purchaseOrder) {
      throw appError(404, 'not_found', 'Purchase order not found');
    }

    if (purchaseOrder.status === 'received') {
      throw appError(409, 'already_received', 'Purchase order already received');
    }

    const received = await this.repository.receivePurchaseOrder(id);
    if (!received) {
      throw appError(404, 'not_found', 'Purchase order not found');
    }

    return this.toPurchaseOrderDto(received);
  }

  async generateFromLowStock() {
    const [suppliers, parts] = await Promise.all([
      this.repository.listSuppliers(),
      this.repository.listLowStockParts(200),
    ]);

    const lowStockParts = parts.filter((part: unknown) => {
      const source = part as {
        currentStock: number;
        minimumStock: number;
      };
      return source.currentStock < source.minimumStock;
    }) as Array<{
      partReference: string;
      supplierId: string;
      currentStock: number;
      minimumStock: number;
    }>;

    if (lowStockParts.length === 0) {
      return [];
    }

    const supplierMap = new Map<string, Array<{ partReference: string; quantity: number }>>();
    for (const part of lowStockParts) {
      const quantity = Math.max(part.minimumStock - part.currentStock, 1);
      const existing = supplierMap.get(part.supplierId) ?? [];
      existing.push({ partReference: part.partReference, quantity });
      supplierMap.set(part.supplierId, existing);
    }

    const validSupplierIds = new Set(suppliers.map((supplier: unknown) => (supplier as { id: string }).id));
    const created: Array<unknown> = [];

    for (const [supplierId, items] of supplierMap) {
      if (!validSupplierIds.has(supplierId)) {
        continue;
      }

      const purchaseOrder = await this.repository.createPurchaseOrder({
        supplierId,
        items,
      });

      created.push(this.toPurchaseOrderDto(purchaseOrder));
    }

    return created;
  }

  private toSupplierDto(supplier: unknown) {
    const source = supplier as {
      id: string;
      name: string;
      email: string;
      phone: string;
      paymentTerms: string;
    };

    return {
      id: source.id,
      name: source.name,
      email: source.email,
      phone: source.phone,
      paymentTerms: source.paymentTerms,
    };
  }

  private toPurchaseOrderDto(purchaseOrder: unknown) {
    const source = purchaseOrder as {
      id: string;
      supplierId: string;
      items: Array<{
        partReference: string;
        quantity: number;
      }>;
    };

    return {
      id: source.id,
      supplierId: source.supplierId,
      items: source.items.map((item) => ({
        partReference: item.partReference,
        quantity: item.quantity,
      })),
    };
  }
}