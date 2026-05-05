import { customerSchema, serviceOrderStatuses } from '@gengis-khan/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const emptyCustomerForm = {
  nif: '',
  customerType: 'personal' as 'personal' | 'business',
  fullName: '',
  legalName: '',
  email: '',
  phone: '',
  address: '',
};

const emptyScooterForm = {
  serialNumber: '',
  brand: '',
  model: '',
  customerNif: '',
  conditionNotes: '',
};

export function ServiceOrdersPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm);
  const [customerError, setCustomerError] = useState('');
  const [scooterOpen, setScooterOpen] = useState(false);
  const [scooterForm, setScooterForm] = useState(emptyScooterForm);
  const [scooterError, setScooterError] = useState('');

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
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setCreateOpen(false);
      setForm(emptyForm);
      setFormError('');
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : '';
      if (message.includes('scooterSerialNumber does not exist')) {
        setScooterForm({
          serialNumber: form.scooterSerialNumber,
          brand: '',
          model: '',
          customerNif: form.customerNif,
          conditionNotes: '',
        });
        setScooterError('');
        setScooterOpen(true);
        setFormError('');
        return;
      }
      setFormError(err instanceof ApiError ? err.message : 'Erro ao criar ordem.');
    },
  });

  const createScooterMutation = useMutation({
    mutationFn: async (data: typeof emptyScooterForm) => {
      await apiFetch('/scooters', {
        method: 'POST',
        body: JSON.stringify({
          serialNumber: data.serialNumber,
          brand: data.brand,
          model: data.model,
          customerNif: data.customerNif,
          conditionNotes: data.conditionNotes || undefined,
        }),
      });
    },
    onSuccess: () => {
      setScooterOpen(false);
      setScooterError('');
      // retry the original service order creation
      createMutation.mutate(form);
    },
    onError: (err) => {
      setScooterError(err instanceof ApiError ? err.message : 'Erro ao registar trotinete.');
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: typeof emptyCustomerForm) => {
      await apiFetch('/customers', {
        method: 'POST',
        body: JSON.stringify({
          nif: data.nif,
          customerType: data.customerType,
          fullName: data.fullName,
          legalName: data.customerType === 'business' ? data.legalName : undefined,
          email: data.email,
          phone: data.phone,
          address: data.address || undefined,
        }),
      });
      return data.nif;
    },
    onSuccess: (newNif) => {
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
      setForm((prev) => ({ ...prev, customerNif: newNif }));
      setCustomerOpen(false);
      setCustomerForm(emptyCustomerForm);
      setCustomerError('');
    },
    onError: (err) => {
      setCustomerError(err instanceof ApiError ? err.message : 'Erro ao criar cliente.');
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
          onClick={() => navigate(`/service-orders/${info.row.original.id}`)}
          className="rounded-md p-1.5 text-on-surface-variant transition hover:bg-surface-highest hover:text-on-surface"
          title="Abrir ordem"
        >
          <Icon name="open_in_new" size={16} />
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
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="block text-xs font-medium uppercase tracking-wider text-on-surface-variant">Cliente</span>
              <button
                type="button"
                onClick={() => { setCustomerForm(emptyCustomerForm); setCustomerError(''); setCustomerOpen(true); }}
                className="flex items-center gap-1 text-xs font-medium text-primary transition hover:text-primary/80"
              >
                <Icon name="add" size={14} />
                Novo Cliente
              </button>
            </div>
            <Select value={form.customerNif} onChange={(e) => updateField('customerNif', e.target.value)} options={customerOptions} />
          </div>
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

      {/* Inline Scooter Create Modal — triggered when serial doesn't exist for customer */}
      <Modal open={scooterOpen} onClose={() => setScooterOpen(false)} title="Registar Nova Trotinete">
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">
            A trotinete com numero de serie <span className="font-mono font-semibold text-on-surface">{scooterForm.serialNumber}</span> nao esta associada a este cliente. Preencha os dados para a registar e continuar.
          </p>
          {scooterError && <p className="text-sm text-error">{scooterError}</p>}
          <Input label="Numero de Serie" value={scooterForm.serialNumber} onChange={(e) => setScooterForm((p) => ({ ...p, serialNumber: e.target.value }))} />
          <Input label="Marca" value={scooterForm.brand} onChange={(e) => setScooterForm((p) => ({ ...p, brand: e.target.value }))} />
          <Input label="Modelo" value={scooterForm.model} onChange={(e) => setScooterForm((p) => ({ ...p, model: e.target.value }))} />
          <Input label="Notas de Condicao (opcional)" value={scooterForm.conditionNotes} onChange={(e) => setScooterForm((p) => ({ ...p, conditionNotes: e.target.value }))} />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setScooterOpen(false)}>Cancelar</Button>
          <Button
            onClick={() => createScooterMutation.mutate(scooterForm)}
            disabled={createScooterMutation.isPending || createMutation.isPending || !scooterForm.brand.trim() || !scooterForm.model.trim()}
          >
            {createScooterMutation.isPending || createMutation.isPending ? 'A registar...' : 'Registar e Criar Ordem'}
          </Button>
        </div>
      </Modal>

      {/* Inline Customer Create Modal */}
      <Modal open={customerOpen} onClose={() => setCustomerOpen(false)} title="Novo Cliente">
        <div className="space-y-4">
          {customerError && <p className="text-sm text-error">{customerError}</p>}
          <Input label="NIF" value={customerForm.nif} onChange={(e) => setCustomerForm((p) => ({ ...p, nif: e.target.value }))} />
          <Select
            label="Tipo"
            value={customerForm.customerType}
            onChange={(e) => setCustomerForm((p) => ({ ...p, customerType: e.target.value as 'personal' | 'business' }))}
            options={[
              { value: 'personal', label: 'Particular' },
              { value: 'business', label: 'Empresarial' },
            ]}
          />
          <Input label="Nome Completo" value={customerForm.fullName} onChange={(e) => setCustomerForm((p) => ({ ...p, fullName: e.target.value }))} />
          {customerForm.customerType === 'business' && (
            <Input label="Nome Legal" value={customerForm.legalName} onChange={(e) => setCustomerForm((p) => ({ ...p, legalName: e.target.value }))} />
          )}
          <Input label="Email" type="email" value={customerForm.email} onChange={(e) => setCustomerForm((p) => ({ ...p, email: e.target.value }))} />
          <Input label="Telefone" value={customerForm.phone} onChange={(e) => setCustomerForm((p) => ({ ...p, phone: e.target.value }))} />
          <Input label="Morada" value={customerForm.address} onChange={(e) => setCustomerForm((p) => ({ ...p, address: e.target.value }))} />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setCustomerOpen(false)}>Cancelar</Button>
          <Button onClick={() => createCustomerMutation.mutate(customerForm)} disabled={createCustomerMutation.isPending}>
            {createCustomerMutation.isPending ? 'A criar...' : 'Criar Cliente'}
          </Button>
        </div>
      </Modal>

    </div>
  );
}
