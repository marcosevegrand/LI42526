import { customerSchema, serviceOrderStatuses } from '@gengis-khan/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { KPICard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { ApiError, apiFetch } from '@/lib/api/http-client';

type ApiCustomer = z.infer<typeof customerSchema>;

const serviceOrderSchema = z.object({
  id: z.string(),
  serviceOrderNumber: z.number(),
  customerNif: z.string(),
  scooterSerialNumber: z.string(),
  reportedProblem: z.string(),
  status: z.enum(serviceOrderStatuses),
  createdAt: z.string(),
});

const serviceOrderSummarySchema = z.object({
  period: z.object({ from: z.string(), to: z.string() }),
  total: z.number(),
  byStatus: z.array(z.object({ status: z.enum(serviceOrderStatuses), count: z.number() })),
});

type ApiServiceOrder = z.infer<typeof serviceOrderSchema>;
type ApiServiceOrderSummary = z.infer<typeof serviceOrderSummarySchema>;

type ServiceOrder = {
  id: string;
  reference: string;
  client: string;
  clientNif: string;
  scooter: string;
  description: string;
  status: (typeof serviceOrderStatuses)[number];
  createdAt: string;
};

const col = createColumnHelper<ServiceOrder>();

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-PT');
}

function readSummaryCount(summary: ApiServiceOrderSummary | undefined, status: (typeof serviceOrderStatuses)[number]): number {
  return summary?.byStatus.find((e) => e.status === status)?.count ?? 0;
}

async function fetchServiceOrders(): Promise<ApiServiceOrder[]> {
  const response = await apiFetch<unknown>('/service-orders?limit=100');
  return z.array(serviceOrderSchema).parse(response);
}

async function fetchServiceOrderSummary(): Promise<ApiServiceOrderSummary> {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - 30);
  const response = await apiFetch<unknown>(`/service-orders/summary?from=${formatIsoDate(from)}&to=${formatIsoDate(to)}`);
  return serviceOrderSummarySchema.parse(response);
}

async function fetchCustomersLookup(): Promise<ApiCustomer[]> {
  const response = await apiFetch<unknown>('/customers?limit=100');
  return z.array(customerSchema).parse(response);
}

const emptyForm = {
  customerNif: '',
  scooterSerialNumber: '',
  reportedProblem: '',
  estimatedCompletionDate: '',
};

export function ServiceOrdersPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState<ServiceOrder | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [statusError, setStatusError] = useState('');

  const serviceOrdersQuery = useQuery({ queryKey: ['service-orders', 'list'], queryFn: fetchServiceOrders });
  const summaryQuery = useQuery({ queryKey: ['service-orders', 'summary', 'last-30-days'], queryFn: fetchServiceOrderSummary });
  const customersQuery = useQuery({ queryKey: ['customers', 'list'], queryFn: fetchCustomersLookup });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      await apiFetch('/service-orders', {
        method: 'POST',
        body: JSON.stringify({
          customerNif: data.customerNif,
          scooterSerialNumber: data.scooterSerialNumber,
          reportedProblem: data.reportedProblem,
          estimatedCompletionDate: data.estimatedCompletionDate || undefined,
        }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      setCreateOpen(false);
      setForm(emptyForm);
      setFormError('');
    },
    onError: (err) => {
      setFormError(err instanceof ApiError ? err.message : 'Erro ao criar ordem.');
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, toStatus }: { id: string; toStatus: string }) => {
      await apiFetch(`/service-orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ toStatus }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      setViewOrder(null);
      setStatusError('');
    },
    onError: (err) => {
      setStatusError(err instanceof ApiError ? err.message : 'Erro ao mudar estado.');
    },
  });

  const queryError = serviceOrdersQuery.error ?? summaryQuery.error ?? customersQuery.error;
  const errorMessage = queryError instanceof ApiError ? queryError.message : 'Nao foi possivel carregar as ordens de servico.';

  const customerNameByNif = useMemo(
    () => new Map((customersQuery.data ?? []).map((c) => [c.nif, c.fullName])),
    [customersQuery.data],
  );

  const customerOptions = useMemo(
    () => [
      { value: '', label: 'Selecionar cliente...' },
      ...(customersQuery.data ?? []).map((c) => ({ value: c.nif, label: `${c.fullName} (${c.nif})` })),
    ],
    [customersQuery.data],
  );

  const serviceOrders = useMemo(
    () => (serviceOrdersQuery.data ?? []).map((so): ServiceOrder => ({
      id: so.id,
      reference: `OS-${String(so.serviceOrderNumber).padStart(4, '0')}`,
      client: customerNameByNif.get(so.customerNif) ?? so.customerNif,
      clientNif: so.customerNif,
      scooter: so.scooterSerialNumber,
      description: so.reportedProblem,
      status: so.status,
      createdAt: formatDisplayDate(so.createdAt),
    })),
    [serviceOrdersQuery.data, customerNameByNif],
  );

  const orderKPIs = useMemo(() => [
    { label: 'Total Ordens (30d)', value: summaryQuery.data?.total ?? 0, icon: 'assignment' },
    { label: 'Em Reparacao', value: readSummaryCount(summaryQuery.data, 'in-repair'), icon: 'build' },
    { label: 'Em Diagnostico', value: readSummaryCount(summaryQuery.data, 'in-diagnosis'), icon: 'troubleshoot' },
    { label: 'Concluidas', value: readSummaryCount(summaryQuery.data, 'completed'), icon: 'check_circle' },
  ], [summaryQuery.data]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const columns = [
    col.accessor('reference', {
      header: 'Referencia',
      cell: (info) => <span className="font-semibold text-primary">{info.getValue()}</span>,
    }),
    col.accessor('client', { header: 'Cliente' }),
    col.accessor('description', {
      header: 'Descricao',
      cell: (info) => <span className="max-w-[280px] truncate block">{info.getValue()}</span>,
    }),
    col.accessor('status', {
      header: 'Estado',
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    col.accessor('createdAt', { header: 'Data' }),
    col.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <button
          onClick={() => setViewOrder(info.row.original)}
          className="rounded-md p-1.5 text-on-surface-variant transition hover:bg-surface-highest hover:text-on-surface"
        >
          <Icon name="visibility" size={16} />
        </button>
      ),
    }),
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Ordens de Servico"
        title="Fluxo Principal da Oficina"
        subtitle="Gestao de ordens de servico, transicoes de estado e historico cronologico."
        actions={
          <Button icon={<Icon name="add" size={18} />} onClick={() => { setForm(emptyForm); setFormError(''); setCreateOpen(true); }}>
            Nova Ordem
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {orderKPIs.map((kpi) => <KPICard key={kpi.label} {...kpi} />)}
      </div>

      {queryError ? (
        <div className="glass-card rounded-xl p-6">
          <p className="text-sm text-on-surface-variant">{errorMessage}</p>
          <Button className="mt-4" variant="outline" onClick={() => { void serviceOrdersQuery.refetch(); void summaryQuery.refetch(); void customersQuery.refetch(); }}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <DataTable
          data={serviceOrders}
          columns={columns}
          searchPlaceholder={serviceOrdersQuery.isPending ? 'A carregar ordens de servico...' : 'Pesquisar ordens por referencia, cliente ou descricao...'}
        />
      )}

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nova Ordem de Servico">
        <div className="space-y-4">
          {formError && <p className="text-sm text-error">{formError}</p>}
          <Select label="Cliente" value={form.customerNif} onChange={(e) => updateField('customerNif', e.target.value)} options={customerOptions} />
          <Input label="N. Serie da Trotinete" value={form.scooterSerialNumber} onChange={(e) => updateField('scooterSerialNumber', e.target.value)} />
          <Input label="Problema Reportado" value={form.reportedProblem} onChange={(e) => updateField('reportedProblem', e.target.value)} />
          <Input label="Data Estimada de Conclusao" type="date" value={form.estimatedCompletionDate} onChange={(e) => updateField('estimatedCompletionDate', e.target.value)} />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'A criar...' : 'Criar Ordem'}
          </Button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal open={!!viewOrder} onClose={() => { setViewOrder(null); setStatusError(''); }} title="Detalhe da Ordem de Servico">
        {viewOrder && (
          <div className="space-y-3">
            {statusError && <p className="text-sm text-error">{statusError}</p>}
            <DetailRow label="Referencia" value={viewOrder.reference} />
            <DetailRow label="Cliente" value={viewOrder.client} />
            <DetailRow label="NIF" value={viewOrder.clientNif} />
            <DetailRow label="Trotinete" value={viewOrder.scooter} />
            <DetailRow label="Problema" value={viewOrder.description} />
            <div className="flex justify-between items-center">
              <p className="text-xs uppercase tracking-wider text-on-surface-variant">Estado</p>
              <StatusBadge status={viewOrder.status} />
            </div>
            <DetailRow label="Data" value={viewOrder.createdAt} />

            <div className="border-t border-outline-variant/15 pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Mudar Estado</p>
              <div className="flex flex-wrap gap-2">
                {nextStatuses(viewOrder.status).map((next) => (
                  <Button
                    key={next.value}
                    size="sm"
                    variant="outline"
                    onClick={() => statusMutation.mutate({ id: viewOrder.id, toStatus: next.value })}
                    disabled={statusMutation.isPending}
                  >
                    {next.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

const statusTransitions: Record<string, { value: string; label: string }[]> = {
  'received': [{ value: 'in-diagnosis', label: 'Iniciar Diagnostico' }],
  'in-diagnosis': [
    { value: 'awaiting-customer-approval', label: 'Pedir Aprovacao' },
    { value: 'in-repair', label: 'Iniciar Reparacao' },
  ],
  'awaiting-customer-approval': [
    { value: 'in-repair', label: 'Iniciar Reparacao' },
    { value: 'awaiting-parts', label: 'Aguardar Pecas' },
  ],
  'awaiting-parts': [{ value: 'in-repair', label: 'Iniciar Reparacao' }],
  'in-repair': [{ value: 'completed', label: 'Concluir' }],
  'completed': [{ value: 'delivered', label: 'Entregar' }],
};

function nextStatuses(current: string): { value: string; label: string }[] {
  return statusTransitions[current] ?? [];
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <p className="text-xs uppercase tracking-wider text-on-surface-variant">{label}</p>
      <p className="text-sm font-medium text-on-surface">{value}</p>
    </div>
  );
}
