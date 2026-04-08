import { getPrismaClient } from '../../shared/db/prisma';

type CreateNotificationInput = {
  type: 'reception_confirmation' | 'budget_request' | 'repair_completed' | 'awaiting_parts_delay';
  recipientEmail: string;
  subject: string;
  body: string;
  deliveryStatus: string;
  triggerSource?: string;
};

export class NotificationsRepository {
  async list() {
    return getPrismaClient().notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async create(input: CreateNotificationInput) {
    return getPrismaClient().notification.create({
      data: input,
    });
  }

  async listTemplates() {
    return getPrismaClient().notificationTemplate.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async upsertTemplate(input: {
    id: string;
    subjectTemplate: string;
    bodyTemplate: string;
  }) {
    return getPrismaClient().notificationTemplate.update({
      where: { id: input.id },
      data: {
        subjectTemplate: input.subjectTemplate,
        bodyTemplate: input.bodyTemplate,
      },
    });
  }

  async ensureDefaultTemplates() {
    const existing = await this.listTemplates();
    if (existing.length > 0) {
      return existing;
    }

    const defaults = [
      {
        key: 'reception_confirmation',
        subjectTemplate: 'Confirmacao de rececao da scooter',
        bodyTemplate: 'A sua scooter foi rececionada na oficina.',
      },
      {
        key: 'budget_request',
        subjectTemplate: 'Orcamento disponivel para aprovacao',
        bodyTemplate: 'O orcamento da reparacao esta pronto para aprovacao.',
      },
      {
        key: 'repair_completed',
        subjectTemplate: 'Reparacao concluida',
        bodyTemplate: 'A reparacao da sua scooter foi concluida.',
      },
      {
        key: 'awaiting_parts_delay',
        subjectTemplate: 'A aguardar pecas',
        bodyTemplate: 'A intervencao esta em espera devido a indisponibilidade de pecas.',
      },
    ];

    await getPrismaClient().notificationTemplate.createMany({
      data: defaults,
      skipDuplicates: true,
    });

    return this.listTemplates();
  }
}