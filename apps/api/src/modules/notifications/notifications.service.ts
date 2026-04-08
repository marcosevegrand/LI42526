import { loadEnv } from '../../env';
import { createMailer } from '../../shared/email/mailer';
import { NotificationsRepository } from './notifications.repository';

type SendNotificationInput = {
  type: 'reception_confirmation' | 'budget_request' | 'repair_completed' | 'awaiting_parts_delay';
  recipientEmail: string;
  subject: string;
  body: string;
  triggerSource?: string;
};

export class NotificationsService {
  constructor(private readonly repository = new NotificationsRepository()) {}

  async list() {
    const notifications = await this.repository.list();
    return notifications.map((notification: unknown) => this.toDto(notification));
  }

  async send(input: SendNotificationInput) {
    let status = 'sent';

    try {
      const env = loadEnv();
      await createMailer().sendMail({
        from: env.MAIL_FROM,
        to: input.recipientEmail,
        subject: input.subject,
        text: input.body,
      });
    } catch {
      status = 'failed';
    }

    const notification = await this.repository.create({
      ...input,
      deliveryStatus: status,
    });

    return this.toDto(notification);
  }

  async listTemplates() {
    const templates = await this.repository.ensureDefaultTemplates();
    return templates.map((template: unknown) => {
      const source = template as {
        id: string;
        key: string;
        subjectTemplate: string;
        bodyTemplate: string;
        updatedAt: Date;
      };

      return {
        id: source.id,
        key: source.key,
        subjectTemplate: source.subjectTemplate,
        bodyTemplate: source.bodyTemplate,
        updatedAt: source.updatedAt.toISOString(),
      };
    });
  }

  async updateTemplate(input: {
    id: string;
    subjectTemplate: string;
    bodyTemplate: string;
  }) {
    const updated = await this.repository.upsertTemplate(input);
    const source = updated as {
      id: string;
      key: string;
      subjectTemplate: string;
      bodyTemplate: string;
      updatedAt: Date;
    };

    return {
      id: source.id,
      key: source.key,
      subjectTemplate: source.subjectTemplate,
      bodyTemplate: source.bodyTemplate,
      updatedAt: source.updatedAt.toISOString(),
    };
  }

  private toDto(notification: unknown) {
    const source = notification as {
      id: string;
      type: 'reception_confirmation' | 'budget_request' | 'repair_completed' | 'awaiting_parts_delay';
      recipientEmail: string;
      subject: string;
      body: string;
      deliveryStatus: string;
      triggerSource: string | null;
      createdAt: Date;
    };

    return {
      id: source.id,
      type: source.type,
      recipientEmail: source.recipientEmail,
      subject: source.subject,
      body: source.body,
      deliveryStatus: source.deliveryStatus,
      triggerSource: source.triggerSource ?? undefined,
      createdAt: source.createdAt.toISOString(),
    };
  }
}