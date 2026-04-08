import { reportPeriodSchema } from '@gengis-khan/contracts';
import type { FastifyPluginAsync } from 'fastify';

import { appError, requireRole } from '../../shared/auth/session';
import { getPrismaClient } from '../../shared/db/prisma';

export const reportsModule: FastifyPluginAsync = async (app) => {
  app.get('/api/v1/reports/operations', async (request) => {
    await requireRole(['manager'])(request);

    const parsed = reportPeriodSchema.safeParse(request.query);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid query');
    }

    const from = new Date(`${parsed.data.from}T00:00:00.000Z`);
    const to = new Date(`${parsed.data.to}T23:59:59.999Z`);

    const [serviceOrders, invoices] = await Promise.all([
      getPrismaClient().serviceOrder.count({
        where: {
          createdAt: {
            gte: from,
            lte: to,
          },
        },
      }),
      getPrismaClient().invoice.count({
        where: {
          createdAt: {
            gte: from,
            lte: to,
          },
        },
      }),
    ]);

    return {
      period: parsed.data,
      serviceOrders,
      invoices,
    };
  });

  app.get('/api/v1/reports/billing', async (request) => {
    await requireRole(['manager'])(request);

    const parsed = reportPeriodSchema.safeParse(request.query);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid query');
    }

    const from = new Date(`${parsed.data.from}T00:00:00.000Z`);
    const to = new Date(`${parsed.data.to}T23:59:59.999Z`);

    const totals = await getPrismaClient().invoice.aggregate({
      where: {
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      _sum: {
        subtotal: true,
        vatAmount: true,
        total: true,
      },
    });

    return {
      period: parsed.data,
      subtotal: totals._sum.subtotal?.toString() ?? '0.00',
      vatAmount: totals._sum.vatAmount?.toString() ?? '0.00',
      total: totals._sum.total?.toString() ?? '0.00',
    };
  });

  app.get('/api/v1/reports/costs', async (request) => {
    await requireRole(['manager'])(request);

    const parsed = reportPeriodSchema.safeParse(request.query);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid query');
    }

    const from = new Date(`${parsed.data.from}T00:00:00.000Z`);
    const to = new Date(`${parsed.data.to}T23:59:59.999Z`);

    const stockIn = await getPrismaClient().stockMovement.aggregate({
      where: {
        createdAt: {
          gte: from,
          lte: to,
        },
        movementType: 'in',
      },
      _sum: {
        quantityDelta: true,
      },
    });

    return {
      period: parsed.data,
      totalInboundUnits: stockIn._sum.quantityDelta ?? 0,
    };
  });

  app.get('/api/v1/reports/parts-usage', async (request) => {
    await requireRole(['manager'])(request);

    const parsed = reportPeriodSchema.safeParse(request.query);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid query');
    }

    const from = new Date(`${parsed.data.from}T00:00:00.000Z`);
    const to = new Date(`${parsed.data.to}T23:59:59.999Z`);

    const usage = await getPrismaClient().interventionPart.groupBy({
      by: ['partReference'],
      where: {
        intervention: {
          createdAt: {
            gte: from,
            lte: to,
          },
        },
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 20,
    });

    return {
      period: parsed.data,
      items: usage.map((row: unknown) => {
        const source = row as {
          partReference: string;
          _sum: {
            quantity: number | null;
          };
        };

        return {
          partReference: source.partReference,
          quantity: source._sum.quantity ?? 0,
        };
      }),
    };
  });

  app.get('/api/v1/reports/common-failures', async (request) => {
    await requireRole(['manager'])(request);

    const parsed = reportPeriodSchema.safeParse(request.query);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid query');
    }

    const from = new Date(`${parsed.data.from}T00:00:00.000Z`);
    const to = new Date(`${parsed.data.to}T23:59:59.999Z`);

    const serviceOrders = await getPrismaClient().serviceOrder.findMany({
      where: {
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        reportedProblem: true,
      },
      take: 500,
    });

    const counters = new Map<string, number>();
    for (const item of serviceOrders) {
      const key = item.reportedProblem.trim().toLowerCase();
      counters.set(key, (counters.get(key) ?? 0) + 1);
    }

    const items = [...counters.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([problem, count]) => ({ problem, count }));

    return {
      period: parsed.data,
      items,
    };
  });

  app.get('/api/v1/reports/repair-time', async (request) => {
    await requireRole(['manager'])(request);

    const parsed = reportPeriodSchema.safeParse(request.query);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid query');
    }

    const from = new Date(`${parsed.data.from}T00:00:00.000Z`);
    const to = new Date(`${parsed.data.to}T23:59:59.999Z`);

    const interventions = await getPrismaClient().intervention.findMany({
      where: {
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        elapsedSeconds: true,
      },
    });

    const totalSeconds = interventions.reduce(
      (acc: number, item: { elapsedSeconds: number }) => acc + item.elapsedSeconds,
      0,
    );
    const avgSeconds = interventions.length > 0 ? Math.round(totalSeconds / interventions.length) : 0;

    return {
      period: parsed.data,
      interventions: interventions.length,
      totalSeconds,
      averageSeconds: avgSeconds,
    };
  });

  app.get('/api/v1/reports/mechanic-productivity', async (request) => {
    await requireRole(['manager'])(request);

    const parsed = reportPeriodSchema.safeParse(request.query);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid query');
    }

    const from = new Date(`${parsed.data.from}T00:00:00.000Z`);
    const to = new Date(`${parsed.data.to}T23:59:59.999Z`);

    const productivity = await getPrismaClient().intervention.groupBy({
      by: ['mechanicUserId'],
      where: {
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      _count: {
        id: true,
      },
      _sum: {
        elapsedSeconds: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    return {
      period: parsed.data,
      items: productivity.map((row: unknown) => {
        const source = row as {
          mechanicUserId: string;
          _count: {
            id: number;
          };
          _sum: {
            elapsedSeconds: number | null;
          };
        };

        return {
          mechanicUserId: source.mechanicUserId,
          interventions: source._count.id,
          totalSeconds: source._sum.elapsedSeconds ?? 0,
        };
      }),
    };
  });
};
