import type { Prisma } from '@prisma/client';

import { getPrismaClient } from '../../shared/db/prisma';

type TransactionClient = Prisma.TransactionClient;

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

export class SuppliersProcurementRepository {
  async listSuppliers() {
    return getPrismaClient().supplier.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findSupplierById(id: string) {
    return getPrismaClient().supplier.findUnique({
      where: { id },
    });
  }

  async createSupplier(input: CreateSupplierInput) {
    return getPrismaClient().supplier.create({
      data: input,
    });
  }

  async updateSupplier(id: string, input: Partial<CreateSupplierInput>) {
    return getPrismaClient().supplier.update({
      where: { id },
      data: input,
    });
  }

  async listPurchaseOrders() {
    return getPrismaClient().purchaseOrder.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPurchaseOrder(input: CreatePurchaseOrderInput) {
    return getPrismaClient().purchaseOrder.create({
      data: {
        supplierId: input.supplierId,
        items: {
          create: input.items,
        },
      },
      include: { items: true },
    });
  }

  async partsExist(partReferences: string[]) {
    const count = await getPrismaClient().part.count({
      where: {
        partReference: {
          in: partReferences,
        },
      },
    });

    return count === partReferences.length;
  }

  async findPurchaseOrderById(id: string) {
    return getPrismaClient().purchaseOrder.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });
  }

  async updatePurchaseOrder(
    id: string,
    input: {
      status?: 'requested' | 'received';
      deliveredAt?: Date;
    },
  ) {
    return getPrismaClient().purchaseOrder.update({
      where: { id },
      data: {
        status: input.status,
        deliveredAt: input.deliveredAt,
      },
      include: {
        items: true,
      },
    });
  }

  async receivePurchaseOrder(id: string) {
    return getPrismaClient().$transaction(async (tx: TransactionClient) => {
      const purchaseOrder = await tx.purchaseOrder.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

      if (!purchaseOrder) {
        return null;
      }

      for (const item of purchaseOrder.items) {
        const updatedPart = await tx.part.update({
          where: { partReference: item.partReference },
          data: {
            currentStock: {
              increment: item.quantity,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            partReference: item.partReference,
            movementType: 'in',
            origin: 'purchase_order_receipt',
            quantityDelta: item.quantity,
            balanceAfter: updatedPart.currentStock,
            note: `PO ${purchaseOrder.id}`,
          },
        });
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: {
          status: 'received',
          deliveredAt: new Date(),
        },
        include: {
          items: true,
        },
      });
    });
  }

  async listLowStockParts(limit: number) {
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
}
