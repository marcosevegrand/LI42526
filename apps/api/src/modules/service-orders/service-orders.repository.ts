import { getPrismaClient } from '../../shared/db/prisma';

type CreateServiceOrderInput = {
  customerNif: string;
  scooterSerialNumber: string;
  reportedProblem: string;
  estimatedCompletionDate?: Date;
  createdByUserId: string;
};

type ListServiceOrdersInput = {
  status?: string;
  customerNif?: string;
  scooterSerialNumber?: string;
  limit: number;
};

export class ServiceOrdersRepository {
  async create(input: CreateServiceOrderInput) {
    return getPrismaClient().$transaction(async (tx: any) => {
      const created = await tx.serviceOrder.create({
        data: {
          customerNif: input.customerNif,
          scooterSerialNumber: input.scooterSerialNumber,
          reportedProblem: input.reportedProblem,
          estimatedCompletionDate: input.estimatedCompletionDate,
          createdByUserId: input.createdByUserId,
        },
      });

      await tx.serviceOrderHistoryEntry.create({
        data: {
          serviceOrderId: created.id,
          action: 'created',
          toStatus: created.status,
          changedByUserId: input.createdByUserId,
        },
      });

      return created;
    });
  }

  async list(input: ListServiceOrdersInput) {
    return getPrismaClient().serviceOrder.findMany({
      where: {
        status: input.status,
        customerNif: input.customerNif,
        scooterSerialNumber: input.scooterSerialNumber,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: input.limit,
    });
  }

  async findById(id: string) {
    return getPrismaClient().serviceOrder.findUnique({
      where: { id },
    });
  }

  async updateById(
    id: string,
    input: {
      reportedProblem?: string;
      estimatedCompletionDate?: Date;
    },
    changedByUserId?: string,
  ) {
    return getPrismaClient().$transaction(async (tx: any) => {
      const updated = await tx.serviceOrder.update({
        where: { id },
        data: {
          reportedProblem: input.reportedProblem,
          estimatedCompletionDate: input.estimatedCompletionDate,
        },
      });

      await tx.serviceOrderHistoryEntry.create({
        data: {
          serviceOrderId: id,
          action: 'updated',
          note: 'General fields updated',
          changedByUserId,
        },
      });

      return updated;
    });
  }

  async updateStatus(
    id: string,
    status: string,
    input?: {
      changedByUserId?: string;
      note?: string;
    },
  ) {
    const now = new Date();

    return getPrismaClient().$transaction(async (tx: any) => {
      const previous = await tx.serviceOrder.findUnique({
        where: { id },
        select: { status: true },
      });

      const updated = await tx.serviceOrder.update({
        where: { id },
        data: {
          status,
          completedAt: status === 'completed' ? now : undefined,
          deliveredAt: status === 'delivered' ? now : undefined,
        },
      });

      await tx.serviceOrderHistoryEntry.create({
        data: {
          serviceOrderId: id,
          action: 'status_transition',
          fromStatus: previous?.status,
          toStatus: status,
          note: input?.note,
          changedByUserId: input?.changedByUserId,
        },
      });

      return updated;
    });
  }

  async updateDiagnosis(
    id: string,
    diagnosis: {
      technicalFindings: string;
      recommendedActions: string;
      estimatedLaborHours: string;
      notes?: string;
    },
    changedByUserId?: string,
  ) {
    return getPrismaClient().$transaction(async (tx: any) => {
      const updated = await tx.serviceOrder.update({
        where: { id },
        data: {
          diagnosis,
        },
      });

      await tx.serviceOrderHistoryEntry.create({
        data: {
          serviceOrderId: id,
          action: 'diagnosis_updated',
          changedByUserId,
        },
      });

      return updated;
    });
  }

  async updateBudget(
    id: string,
    budget: {
      estimatedLaborAmount: string;
      estimatedPartsAmount: string;
      estimatedVatAmount: string;
      estimatedTotal: string;
      notes?: string;
    },
    changedByUserId?: string,
  ) {
    return getPrismaClient().$transaction(async (tx: any) => {
      const updated = await tx.serviceOrder.update({
        where: { id },
        data: {
          budget,
          status: 'awaiting-customer-approval',
        },
      });

      await tx.serviceOrderHistoryEntry.create({
        data: {
          serviceOrderId: id,
          action: 'budget_updated',
          toStatus: 'awaiting-customer-approval',
          changedByUserId,
        },
      });

      return updated;
    });
  }

  async recordBudgetApproval(
    id: string,
    input: {
      approved: boolean;
      note?: string;
      changedByUserId?: string;
    },
  ) {
    return getPrismaClient().$transaction(async (tx: any) => {
      const updated = await tx.serviceOrder.update({
        where: { id },
        data: {
          budgetApproved: input.approved,
          budgetApprovalNote: input.note,
          budgetApprovedAt: new Date(),
          status: input.approved ? 'in-repair' : 'awaiting-customer-approval',
        },
      });

      await tx.serviceOrderHistoryEntry.create({
        data: {
          serviceOrderId: id,
          action: 'budget_approval_recorded',
          toStatus: updated.status,
          note: input.note,
          changedByUserId: input.changedByUserId,
        },
      });

      return updated;
    });
  }

  async listHistory(serviceOrderId: string) {
    return getPrismaClient().serviceOrderHistoryEntry.findMany({
      where: { serviceOrderId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getSummary(from: Date, to: Date) {
    const [total, byStatus] = await Promise.all([
      getPrismaClient().serviceOrder.count({
        where: {
          createdAt: {
            gte: from,
            lte: to,
          },
        },
      }),
      getPrismaClient().serviceOrder.groupBy({
        by: ['status'],
        where: {
          createdAt: {
            gte: from,
            lte: to,
          },
        },
        _count: {
          status: true,
        },
      }),
    ]);

    return {
      total,
      byStatus,
    };
  }

  async customerExists(customerNif: string): Promise<boolean> {
    const customer = await getPrismaClient().customer.findUnique({
      where: { nif: customerNif },
      select: { nif: true },
    });
    return Boolean(customer);
  }

  async scooterExistsForCustomer(input: {
    scooterSerialNumber: string;
    customerNif: string;
  }): Promise<boolean> {
    const scooter = await getPrismaClient().scooter.findFirst({
      where: {
        serialNumber: input.scooterSerialNumber,
        customerNif: input.customerNif,
      },
      select: { serialNumber: true },
    });
    return Boolean(scooter);
  }
}