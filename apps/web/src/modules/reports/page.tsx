import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { z } from 'zod';

import { GlassCard } from '@/components/ui/glass-card';
import { Icon } from '@/components/ui/icon';
import { KPICard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/api/http-client';

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function periodParams(): string {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - 30);
  return `from=${formatIsoDate(from)}&to=${formatIsoDate(to)}`;
}

const operationsSchema = z.object({
  period: z.object({ from: z.string(), to: z.string() }),
  serviceOrders: z.number(),
  invoices: z.number(),
});

const billingSchema = z.object({
  period: z.object({ from: z.string(), to: z.string() }),
  subtotal: z.string(),
  vatAmount: z.string(),
  total: z.string(),
});

const partsUsageSchema = z.object({
  period: z.object({ from: z.string(), to: z.string() }),
  items: z.array(z.object({
    partReference: z.string(),
    quantity: z.number(),
  })),
});

const repairTimeSchema = z.object({
  period: z.object({ from: z.string(), to: z.string() }),
  interventions: z.number(),
  totalSeconds: z.number(),
  averageSeconds: z.number(),
});

const mechanicProductivitySchema = z.object({
  period: z.object({ from: z.string(), to: z.string() }),
  items: z.array(z.object({
    mechanicUserId: z.string(),
    interventions: z.number(),
    totalSeconds: z.number(),
  })),
});

async function fetchOperations() {
  const r = await apiFetch<unknown>(`/reports/operations?${periodParams()}`);
  return operationsSchema.parse(r);
}

async function fetchBilling() {
  const r = await apiFetch<unknown>(`/reports/billing?${periodParams()}`);
  return billingSchema.parse(r);
}

async function fetchPartsUsage() {
  const r = await apiFetch<unknown>(`/reports/parts-usage?${periodParams()}`);
  return partsUsageSchema.parse(r);
}

async function fetchRepairTime() {
  const r = await apiFetch<unknown>(`/reports/repair-time?${periodParams()}`);
  return repairTimeSchema.parse(r);
}

async function fetchMechanicProductivity() {
  const r = await apiFetch<unknown>(`/reports/mechanic-productivity?${periodParams()}`);
  return mechanicProductivitySchema.parse(r);
}

export function ReportsPage() {
  const operationsQuery = useQuery({ queryKey: ['reports', 'operations'], queryFn: fetchOperations });
  const billingQuery = useQuery({ queryKey: ['reports', 'billing'], queryFn: fetchBilling });
  const partsUsageQuery = useQuery({ queryKey: ['reports', 'parts-usage'], queryFn: fetchPartsUsage });
  const repairTimeQuery = useQuery({ queryKey: ['reports', 'repair-time'], queryFn: fetchRepairTime });
  const mechanicQuery = useQuery({ queryKey: ['reports', 'mechanic-productivity'], queryFn: fetchMechanicProductivity });

  const reportsKPIs = useMemo(() => {
    const totalRevenue = billingQuery.data ? parseFloat(billingQuery.data.total) : 0;
    const completedOrders = operationsQuery.data?.serviceOrders ?? 0;
    const avgTicket = completedOrders > 0 ? totalRevenue / completedOrders : 0;
    const interventionCount = repairTimeQuery.data?.interventions ?? 0;

    return [
      { label: 'Faturacao Total', value: `€${totalRevenue.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`, icon: 'payments' },
      { label: 'Ordens de Servico', value: String(completedOrders), icon: 'check_circle' },
      { label: 'Ticket Medio', value: `€${avgTicket.toFixed(2)}`, icon: 'confirmation_number' },
      { label: 'Intervencoes', value: String(interventionCount), icon: 'build' },
    ];
  }, [billingQuery.data, operationsQuery.data, repairTimeQuery.data]);

  // Order status distribution for pie chart
  const orderStatusData = useMemo(() => [
    { name: 'Ordens', value: operationsQuery.data?.serviceOrders ?? 0, fill: '#cdc990' },
    { name: 'Faturas', value: operationsQuery.data?.invoices ?? 0, fill: '#ffb4a8' },
  ], [operationsQuery.data]);

  const totalOrders = orderStatusData.reduce((sum, d) => sum + d.value, 0);

  // Top parts
  const topParts = useMemo(() => {
    const items = partsUsageQuery.data?.items ?? [];
    return items.slice(0, 5);
  }, [partsUsageQuery.data]);

  const maxConsumed = topParts.length > 0 ? topParts[0].quantity : 1;

  // Mechanic productivity
  const mechanicPerformance = useMemo(() => {
    const items = mechanicQuery.data?.items ?? [];
    return items.map((m) => ({
      name: m.mechanicUserId,
      orders: m.interventions,
      avgTime: m.interventions > 0 ? `${(m.totalSeconds / m.interventions / 60).toFixed(0)}min` : 'N/D',
      totalHours: `${(m.totalSeconds / 3600).toFixed(1)}h`,
    }));
  }, [mechanicQuery.data]);

  // Revenue data for chart — using billing subtotal as single data point
  const revenueData = useMemo(() => {
    if (!billingQuery.data) return [];
    const total = parseFloat(billingQuery.data.total);
    const subtotal = parseFloat(billingQuery.data.subtotal);
    const vat = parseFloat(billingQuery.data.vatAmount);
    return [
      { label: 'Subtotal', receita: subtotal },
      { label: 'IVA', receita: vat },
      { label: 'Total', receita: total },
    ];
  }, [billingQuery.data]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Relatorios"
        title="Relatorios Executivos"
        subtitle="Analitica operacional, metricas de desempenho e indicadores financeiros (ultimos 30 dias)."
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {reportsKPIs.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Revenue Chart */}
        <GlassCard className="col-span-1 p-5 xl:col-span-2">
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
              Faturacao
            </p>
            <p className="font-headline text-lg font-semibold text-on-surface">
              Resumo Financeiro
            </p>
          </div>
          <div className="h-[240px]">
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffb4a8" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#ffb4a8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(87,66,62,0.1)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#dec0bb', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(87,66,62,0.15)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#dec0bb', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `€${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(53,53,52,0.95)',
                      border: '1px solid rgba(87,66,62,0.2)',
                      borderRadius: '0.5rem',
                      color: '#e5e2e1',
                      fontSize: '0.8rem',
                    }}
                    formatter={(value: number) => [`€${value.toFixed(2)}`, 'Valor']}
                  />
                  <Area
                    type="monotone"
                    dataKey="receita"
                    stroke="#ffb4a8"
                    strokeWidth={2}
                    fill="url(#gradReceita)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-on-surface-variant">
                {billingQuery.isPending ? 'A carregar...' : 'Sem dados financeiros.'}
              </div>
            )}
          </div>
        </GlassCard>

        {/* Operations Pie */}
        <GlassCard className="p-5">
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
              Operacoes
            </p>
            <p className="font-headline text-lg font-semibold text-on-surface">
              Distribuicao ({totalOrders})
            </p>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {orderStatusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(53,53,52,0.95)',
                    border: '1px solid rgba(87,66,62,0.2)',
                    borderRadius: '0.5rem',
                    color: '#e5e2e1',
                    fontSize: '0.8rem',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-2">
            {orderStatusData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: d.fill }} />
                  <span className="text-on-surface-variant">{d.name}</span>
                </div>
                <span className="font-semibold text-on-surface">{d.value}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Bottom row: Top Parts + Mechanic Performance */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Top consumed parts */}
        <GlassCard className="p-5">
          <p className="mb-4 font-headline text-lg font-semibold text-on-surface">
            Pecas Mais Consumidas
          </p>
          {partsUsageQuery.isPending ? (
            <p className="text-sm text-on-surface-variant">A carregar...</p>
          ) : topParts.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Sem dados de consumo.</p>
          ) : (
            <div className="space-y-3">
              {topParts.map((part, i) => (
                <div key={part.partReference} className="flex items-center gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-high text-xs font-bold text-on-surface-variant">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-on-surface">{part.partReference}</p>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-surface-low">
                      <div
                        className="h-full rounded-full bg-primary/60"
                        style={{ width: `${(part.quantity / maxConsumed) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-on-surface">{part.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Mechanic Productivity */}
        <GlassCard className="p-5">
          <p className="mb-4 font-headline text-lg font-semibold text-on-surface">
            Produtividade dos Mecanicos
          </p>
          {mechanicQuery.isPending ? (
            <p className="text-sm text-on-surface-variant">A carregar...</p>
          ) : mechanicPerformance.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Sem dados de produtividade.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Mecanico</th>
                    <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Intervencoes</th>
                    <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Tempo Med.</th>
                    <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {mechanicPerformance.map((m) => (
                    <tr key={m.name} className="border-t border-outline-variant/10">
                      <td className="py-3 text-sm font-medium text-on-surface">
                        <div className="flex items-center gap-2">
                          <Icon name="person" size={16} className="text-on-surface-variant" />
                          {m.name}
                        </div>
                      </td>
                      <td className="py-3 text-sm text-on-surface">{m.orders}</td>
                      <td className="py-3 text-sm text-on-surface">{m.avgTime}</td>
                      <td className="py-3 text-sm font-semibold text-tertiary">{m.totalHours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
