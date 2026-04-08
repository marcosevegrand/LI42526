import { serviceOrderStatuses } from '@gengis-khan/contracts';

import { appError } from '../../shared/auth/session';
import type { SessionUser } from '../../shared/auth/session';
import { ServiceOrdersRepository } from './service-orders.repository';

type CreateServiceOrderInput = {
  customerNif: string;
  scooterSerialNumber: string;
  reportedProblem: string;
  estimatedCompletionDate?: string;
};

type ListServiceOrdersInput = {
  status?: string;
  customerNif?: string;
  scooterSerialNumber?: string;
  limit: number;
};

type UpdateServiceOrderInput = {
  reportedProblem?: string;
  estimatedCompletionDate?: string;
};

const validTransitions: Record<string, string[]> = {
  received: ['in-diagnosis'],
  'in-diagnosis': ['awaiting-customer-approval', 'awaiting-parts', 'in-repair'],
  'awaiting-customer-approval': ['in-repair', 'awaiting-parts'],
  'awaiting-parts': ['in-repair'],
  'in-repair': ['completed', 'awaiting-parts'],
  completed: ['delivered'],
  delivered: [],
};

export class ServiceOrdersService {
  constructor(private readonly repository = new ServiceOrdersRepository()) {}

  async create(input: CreateServiceOrderInput, sessionUser: SessionUser) {
    const customerExists = await this.repository.customerExists(input.customerNif);
    if (!customerExists) {
      throw appError(400, 'invalid_customer', 'customerNif does not exist');
    }

    const scooterMatchesCustomer = await this.repository.scooterExistsForCustomer({
      scooterSerialNumber: input.scooterSerialNumber,
      customerNif: input.customerNif,
    });
    if (!scooterMatchesCustomer) {
      throw appError(
        400,
        'invalid_scooter',
        'scooterSerialNumber does not exist for the provided customerNif',
      );
    }

    const serviceOrder = await this.repository.create({
      customerNif: input.customerNif,
      scooterSerialNumber: input.scooterSerialNumber,
      reportedProblem: input.reportedProblem,
      estimatedCompletionDate: input.estimatedCompletionDate
        ? new Date(`${input.estimatedCompletionDate}T00:00:00.000Z`)
        : undefined,
      createdByUserId: sessionUser.id,
    });

    return this.toDto(serviceOrder);
  }

  async list(input: ListServiceOrdersInput) {
    const serviceOrders = await this.repository.list(input);
    return serviceOrders.map((serviceOrder: unknown) => this.toDto(serviceOrder));
  }

  async getById(id: string) {
    const serviceOrder = await this.repository.findById(id);
    if (!serviceOrder) {
      throw appError(404, 'not_found', 'Service order not found');
    }

    return this.toDto(serviceOrder);
  }

  async update(id: string, input: UpdateServiceOrderInput, sessionUser: SessionUser) {
    const serviceOrder = await this.repository.findById(id);
    if (!serviceOrder) {
      throw appError(404, 'not_found', 'Service order not found');
    }

    const updated = await this.repository.updateById(
      id,
      {
        reportedProblem: input.reportedProblem,
        estimatedCompletionDate: input.estimatedCompletionDate
          ? new Date(`${input.estimatedCompletionDate}T00:00:00.000Z`)
          : undefined,
      },
      sessionUser.id,
    );

    return this.toDto(updated);
  }

  async updateDiagnosis(
    id: string,
    diagnosis: {
      technicalFindings: string;
      recommendedActions: string;
      estimatedLaborHours: string;
      notes?: string;
    },
    sessionUser: SessionUser,
  ) {
    const serviceOrder = await this.repository.findById(id);
    if (!serviceOrder) {
      throw appError(404, 'not_found', 'Service order not found');
    }

    const updated = await this.repository.updateDiagnosis(id, diagnosis, sessionUser.id);
    return this.toDto(updated);
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
    sessionUser: SessionUser,
  ) {
    const serviceOrder = await this.repository.findById(id);
    if (!serviceOrder) {
      throw appError(404, 'not_found', 'Service order not found');
    }

    const updated = await this.repository.updateBudget(id, budget, sessionUser.id);
    return this.toDto(updated);
  }

  async recordBudgetApproval(
    id: string,
    input: {
      approved: boolean;
      note?: string;
    },
    sessionUser: SessionUser,
  ) {
    const serviceOrder = await this.repository.findById(id);
    if (!serviceOrder) {
      throw appError(404, 'not_found', 'Service order not found');
    }

    const updated = await this.repository.recordBudgetApproval(id, {
      approved: input.approved,
      note: input.note,
      changedByUserId: sessionUser.id,
    });

    return this.toDto(updated);
  }

  async getHistory(id: string) {
    const serviceOrder = await this.repository.findById(id);
    if (!serviceOrder) {
      throw appError(404, 'not_found', 'Service order not found');
    }

    const history = await this.repository.listHistory(id);
    return history.map((entry: unknown) => {
      const source = entry as {
        id: string;
        action: string;
        note: string | null;
        fromStatus: string | null;
        toStatus: string | null;
        changedByUserId: string | null;
        createdAt: Date;
      };

      return {
        id: source.id,
        action: source.action,
        note: source.note ?? undefined,
        fromStatus: source.fromStatus ?? undefined,
        toStatus: source.toStatus ?? undefined,
        changedByUserId: source.changedByUserId ?? undefined,
        createdAt: source.createdAt.toISOString(),
      };
    });
  }

  async getSummary(input: { from: string; to: string }) {
    const from = new Date(`${input.from}T00:00:00.000Z`);
    const to = new Date(`${input.to}T23:59:59.999Z`);

    const summary = await this.repository.getSummary(from, to);
    return {
      period: input,
      total: summary.total,
      byStatus: summary.byStatus.map((item: unknown) => {
        const source = item as {
          status: string;
          _count: {
            status: number;
          };
        };

        return {
          status: source.status,
          count: source._count.status,
        };
      }),
    };
  }

  async transitionStatus(input: {
    id: string;
    toStatus: (typeof serviceOrderStatuses)[number];
    sessionUser: SessionUser;
  }) {
    const serviceOrder = await this.repository.findById(input.id);
    if (!serviceOrder) {
      throw appError(404, 'not_found', 'Service order not found');
    }

    const allowedTargets = validTransitions[serviceOrder.status] ?? [];
    if (!allowedTargets.includes(input.toStatus)) {
      throw appError(
        409,
        'invalid_status_transition',
        `Cannot transition from ${serviceOrder.status} to ${input.toStatus}`,
      );
    }

    if (input.toStatus === 'delivered' && input.sessionUser.role !== 'manager') {
      throw appError(403, 'forbidden', 'Only manager can confirm delivered state');
    }

    const updated = await this.repository.updateStatus(input.id, input.toStatus, {
      changedByUserId: input.sessionUser.id,
    });
    return this.toDto(updated);
  }

  private toDto(serviceOrder: unknown) {
    const source = serviceOrder as {
      id: string;
      serviceOrderNumber: number;
      customerNif: string;
      scooterSerialNumber: string;
      reportedProblem: string;
      status: string;
      estimatedCompletionDate: Date | null;
      completedAt: Date | null;
      deliveredAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    };

    return {
      id: source.id,
      serviceOrderNumber: source.serviceOrderNumber,
      customerNif: source.customerNif,
      scooterSerialNumber: source.scooterSerialNumber,
      reportedProblem: source.reportedProblem,
      status: source.status,
      estimatedCompletionDate: source.estimatedCompletionDate
        ? source.estimatedCompletionDate.toISOString().slice(0, 10)
        : undefined,
      completedAt: source.completedAt?.toISOString(),
      deliveredAt: source.deliveredAt?.toISOString(),
      diagnosis: (source as { diagnosis?: unknown }).diagnosis,
      budget: (source as { budget?: unknown }).budget,
      budgetApproved: (source as { budgetApproved?: boolean | null }).budgetApproved ?? undefined,
      budgetApprovalNote:
        (source as { budgetApprovalNote?: string | null }).budgetApprovalNote ?? undefined,
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString(),
    };
  }
}