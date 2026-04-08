import { getPrismaClient } from '../../shared/db/prisma';

type CreateInterventionInput = {
  serviceOrderId: string;
  description: string;
  mechanicUserId: string;
  notes?: string;
  elapsedSeconds: number;
  timerState: 'idle' | 'running' | 'paused' | 'stopped';
};

export class InterventionsRepository {
  async listByServiceOrderId(serviceOrderId: string) {
    return getPrismaClient().intervention.findMany({
      where: { serviceOrderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(input: CreateInterventionInput) {
    return getPrismaClient().intervention.create({
      data: input,
    });
  }

  async findById(id: string) {
    return getPrismaClient().intervention.findUnique({
      where: { id },
    });
  }

  async serviceOrderExists(serviceOrderId: string) {
    const serviceOrder = await getPrismaClient().serviceOrder.findUnique({
      where: { id: serviceOrderId },
      select: { id: true },
    });
    return Boolean(serviceOrder);
  }

  async updateTimer(id: string, timerState: 'idle' | 'running' | 'paused' | 'stopped') {
    return getPrismaClient().intervention.update({
      where: { id },
      data: { timerState },
    });
  }

  async updateTimerState(input: {
    id: string;
    timerState: 'idle' | 'running' | 'paused' | 'stopped';
    elapsedSeconds?: number;
    timerStartedAt?: Date | null;
  }) {
    return getPrismaClient().intervention.update({
      where: { id: input.id },
      data: {
        timerState: input.timerState,
        elapsedSeconds: input.elapsedSeconds,
        timerStartedAt: input.timerStartedAt,
      },
    });
  }

  async updateIntervention(
    id: string,
    input: {
      description?: string;
      mechanicUserId?: string;
      notes?: string;
    },
  ) {
    return getPrismaClient().intervention.update({
      where: { id },
      data: input,
    });
  }

  async partExists(partReference: string) {
    const part = await getPrismaClient().part.findUnique({
      where: { partReference },
      select: { partReference: true, currentStock: true },
    });
    return part;
  }

  async attachPart(input: {
    interventionId: string;
    partReference: string;
    quantity: number;
    note?: string;
  }) {
    return getPrismaClient().$transaction(async (tx: any) => {
      const part = await tx.part.findUnique({
        where: { partReference: input.partReference },
      });

      if (!part) {
        return null;
      }

      if (part.currentStock < input.quantity) {
        throw new Error('insufficient_stock');
      }

      const interventionPart = await tx.interventionPart.create({
        data: input,
      });

      await tx.part.update({
        where: { partReference: input.partReference },
        data: {
          currentStock: {
            decrement: input.quantity,
          },
        },
      });

      return interventionPart;
    });
  }

  async listPartsByIntervention(interventionId: string) {
    return getPrismaClient().interventionPart.findMany({
      where: { interventionId },
      orderBy: { id: 'asc' },
    });
  }
}