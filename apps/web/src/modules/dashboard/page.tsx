import { partSchema, serviceOrderStatuses } from '@gengis-khan/contracts';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Icon } from '@/components/ui/icon';
import { KPICard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/api/http-client';

const serviceOrderSummarySchema = z.object({
  period: z.object({ from: z.string(), to: z.string() }),
  total: z.number(),
  byStatus: z.array(z.object({
    status: z.enum(serviceOrderStatuses),
    count: z.number(),
  })),
});

type ApiServiceOrderSummary = z.infer<typeof serviceOrderSummarySchema>;

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function readSummaryCount(
  summary: ApiServiceOrderSummary | undefined,
  status: (typeof serviceOrderStatuses)[number],
): number {
  return summary?.byStatus.find((e) => e.status === status)?.count ?? 0;
}

async function fetchSummary(): Promise<ApiServiceOrderSummary> {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - 30);
  const response = await apiFetch<unknown>(
    `/service-orders/summary?from=${formatIsoDate(from)}&to=${formatIsoDate(to)}`,
  );
  return serviceOrderSummarySchema.parse(response);
}

async function fetchLowStock() {
  const response = await apiFetch<unknown>('/parts/low-stock?limit=50');
  return z.array(partSchema).parse(response);
}

const operationsSchema = z.object({
  period: z.object({ from: z.string(), to: z.string() }),
  serviceOrders: z.number(),
  invoices: z.number(),
});

const billingReportSchema = z.object({
  period: z.object({ from: z.string(), to: z.string() }),
  subtotal: z.string(),
  vatAmount: z.string(),
  total: z.string(),
});

const repairTimeSchema = z.object({
  period: z.object({ from: z.string(), to: z.string() }),
  interventions: z.number(),
  totalSeconds: z.number(),
  averageSeconds: z.number(),
});

async function fetchOperations() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - 30);
  const response = await apiFetch<unknown>(
    `/reports/operations?from=${formatIsoDate(from)}&to=${formatIsoDate(to)}`,
  );
  return operationsSchema.parse(response);
}

async function fetchBillingReport() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - 30);
  const response = await apiFetch<unknown>(
    `/reports/billing?from=${formatIsoDate(from)}&to=${formatIsoDate(to)}`,
  );
  return billingReportSchema.parse(response);
}

async function fetchRepairTime() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - 30);
  const response = await apiFetch<unknown>(
    `/reports/repair-time?from=${formatIsoDate(from)}&to=${formatIsoDate(to)}`,
  );
  return repairTimeSchema.parse(response);
}

export function DashboardPage() {
  const navigate = useNavigate();

  const summaryQuery = useQuery({
    queryKey: ['service-orders', 'summary', 'dashboard'],
    queryFn: fetchSummary,
  });

  const lowStockQuery = useQuery({
    queryKey: ['parts', 'low-stock', 'dashboard'],
    queryFn: fetchLowStock,
  });

  const operationsQuery = useQuery({
    queryKey: ['reports', 'operations', 'dashboard'],
    queryFn: fetchOperations,
  });

  const billingQuery = useQuery({
    queryKey: ['reports', 'billing', 'dashboard'],
    queryFn: fetchBillingReport,
  });

  const repairTimeQuery = useQuery({
    queryKey: ['reports', 'repair-time', 'dashboard'],
    queryFn: fetchRepairTime,
  });

  const dashboardKPIs = useMemo(() => [
    {
      label: 'Ordens de Servico',
      value: String(summaryQuery.data?.total ?? 0),
      icon: 'assignment',
    },
    {
      label: 'Em Diagnostico',
      value: String(readSummaryCount(summaryQuery.data, 'in-diagnosis')),
      icon: 'troubleshoot',
    },
    {
      label: 'Stock Critico',
      value: String(lowStockQuery.data?.length ?? 0),
      icon: 'warning',
    },
    {
      label: 'Faturas Emitidas',
      value: String(operationsQuery.data?.invoices ?? 0),
      icon: 'account_balance',
    },
  ], [summaryQuery.data, lowStockQuery.data, operationsQuery.data]);

  const summaryMetrics = useMemo(() => {
    const repairData = repairTimeQuery.data;
    const totalHours = repairData ? (repairData.totalSeconds / 3600).toFixed(1) : '0';
    const avgMinutes = repairData ? Math.round(repairData.averageSeconds / 60) : 0;
    const totalRevenue = billingQuery.data ? parseFloat(billingQuery.data.total) : 0;

    return [
      { label: 'Receita (30d)', value: `€${totalRevenue.toLocaleString('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, icon: 'payments' },
      { label: 'Horas de Trabalho', value: `${totalHours}h`, icon: 'schedule' },
      { label: 'Tempo Medio', value: `${avgMinutes}min`, icon: 'speed' },
    ];
  }, [repairTimeQuery.data, billingQuery.data]);

  // Build a simple chart from service order summary by status
  const performanceData = useMemo(() => {
    const summary = summaryQuery.data;
    if (!summary) return [];
    return summary.byStatus.map((entry) => ({
      status: entry.status,
      count: entry.count,
    }));
  }, [summaryQuery.data]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Resumo"
        title="Dashboard Operacional"
        subtitle="Vista geral do atelier — ordens, stock e desempenho diario."
        actions={
          <div className="flex gap-3">
            <Button icon={<Icon name="add" size={18} />} onClick={() => navigate('/service-orders')}>
              Nova Ordem
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardKPIs.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Performance Chart + Summary Metrics */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Status distribution chart */}
        <GlassCard className="col-span-1 p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                Distribuicao de Ordens
              </p>
              <p className="font-headline text-lg font-semibold text-on-surface">
                Por Estado (ultimos 30 dias)
              </p>
            </div>
            <Icon name="show_chart" size={20} className="text-primary/60" />
          </div>
          <div className="h-[220px]">
            {performanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="gradEficiencia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffb4a8" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#ffb4a8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(87,66,62,0.1)" />
                  <XAxis
                    dataKey="status"
                    tick={{ fill: '#dec0bb', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(87,66,62,0.15)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#dec0bb', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(53,53,52,0.95)',
                      border: '1px solid rgba(87,66,62,0.2)',
                      borderRadius: '0.5rem',
                      color: '#e5e2e1',
                      fontSize: '0.8rem',
                    }}
                    labelStyle={{ color: '#dec0bb' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#ffb4a8"
                    strokeWidth={2}
                    fill="url(#gradEficiencia)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-on-surface-variant">
                {summaryQuery.isPending ? 'A carregar...' : 'Sem dados disponíveis.'}
              </div>
            )}
          </div>
        </GlassCard>

        {/* Summary Metrics */}
        <div className="flex flex-col gap-4">
          {summaryMetrics.map((m) => (
            <GlassCard key={m.label} className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-container/30">
                <Icon name={m.icon} size={20} className="text-primary" />
              </div>
              <div>
                <p className="font-headline text-xl font-semibold text-on-surface">{m.value}</p>
                <p className="text-xs text-on-surface-variant">{m.label}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Low Stock Alerts */}
      <GlassCard className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
              Alertas
            </p>
            <p className="font-headline text-lg font-semibold text-on-surface">
              Stock Critico
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')}>
            Ver tudo
          </Button>
        </div>
        {lowStockQuery.isPending ? (
          <p className="text-sm text-on-surface-variant">A carregar...</p>
        ) : (lowStockQuery.data ?? []).length === 0 ? (
          <p className="text-sm text-on-surface-variant">Sem alertas de stock critico.</p>
        ) : (
          <div className="space-y-2">
            {(lowStockQuery.data ?? []).slice(0, 8).map((part) => (
              <div key={part.partReference} className="flex items-center gap-3 rounded-lg bg-surface-low/60 px-4 py-2">
                <Icon name="warning" size={16} className="shrink-0 text-error" />
                <div className="flex-1">
                  <p className="text-sm text-on-surface">
                    <span className="font-mono text-xs font-semibold text-primary">{part.partReference}</span>
                    {' — '}{part.description}
                  </p>
                </div>
                <span className="text-xs font-semibold text-error">
                  {part.currentStock}/{part.minimumStock}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
