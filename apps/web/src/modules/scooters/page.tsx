import { customerSchema, scooterSchema } from '@gengis-khan/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { ApiError, apiFetch } from '@/lib/api/http-client';

type ApiScooter = z.infer<typeof scooterSchema>;
type ApiCustomer = z.infer<typeof customerSchema>;

type Scooter = {
  id: string;
  serialNumber: string;
  model: string;
  brand: string;
  client: string;
  clientNif: string;
  conditionNotes: string;
  status: 'ativo' | 'inativo';
};

const col = createColumnHelper<Scooter>();

async function fetchScooters(): Promise<ApiScooter[]> {
  const response = await apiFetch<unknown>('/scooters?limit=100');
  return z.array(scooterSchema).parse(response);
}

async function fetchCustomersLookup(): Promise<ApiCustomer[]> {
  const response = await apiFetch<unknown>('/customers?limit=100');
  return z.array(customerSchema).parse(response);
}

const emptyForm = {
  serialNumber: '',
  brand: '',
  model: '',
  conditionNotes: '',
  customerNif: '',
};

export function ScootersPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewScooter, setViewScooter] = useState<Scooter | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const scootersQuery = useQuery({
    queryKey: ['scooters', 'list'],
    queryFn: fetchScooters,
  });

  const customersQuery = useQuery({
    queryKey: ['customers', 'list'],
    queryFn: fetchCustomersLookup,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      await apiFetch('/scooters', {
        method: 'POST',
        body: JSON.stringify({
          serialNumber: data.serialNumber,
          brand: data.brand,
          model: data.model,
          conditionNotes: data.conditionNotes || undefined,
          customerNif: data.customerNif,
        }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['scooters'] });
      setCreateOpen(false);
      setForm(emptyForm);
      setFormError('');
    },
    onError: (err) => {
      setFormError(err instanceof ApiError ? err.message : 'Erro ao registar trotinete.');
    },
  });

  const isPending = scootersQuery.isPending || customersQuery.isPending;
  const queryError = scootersQuery.error ?? customersQuery.error;
  const errorMessage = queryError instanceof ApiError
    ? queryError.message
    : 'Nao foi possivel carregar as trotinetes.';

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

  const scooters = useMemo(
    () => (scootersQuery.data ?? []).map((scooter): Scooter => ({
      id: scooter.serialNumber,
      serialNumber: scooter.serialNumber,
      model: scooter.model,
      brand: scooter.brand,
      client: customerNameByNif.get(scooter.customerNif) ?? scooter.customerNif,
      clientNif: scooter.customerNif,
      conditionNotes: scooter.conditionNotes ?? '',
      status: scooter.isArchived ? 'inativo' : 'ativo',
    })),
    [scootersQuery.data, customerNameByNif],
  );

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const columns = [
    col.accessor('serialNumber', {
      header: 'N. Serie',
      cell: (info) => (
        <span className="font-mono text-xs font-semibold text-primary">{info.getValue()}</span>
      ),
    }),
    col.accessor('brand', { header: 'Marca' }),
    col.accessor('model', { header: 'Modelo' }),
    col.accessor('client', {
      header: 'Proprietario',
      cell: (info) => (
        <span className="text-on-surface">{info.getValue()}</span>
      ),
    }),
    col.accessor('status', {
      header: 'Estado',
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    col.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <button
          onClick={() => setViewScooter(info.row.original)}
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
        eyebrow="Trotinetes"
        title="Registo de Equipamentos"
        subtitle="Registo, pesquisa por numero de serie e historico tecnico."
        actions={
          <Button
            icon={<Icon name="add" size={18} />}
            onClick={() => { setForm(emptyForm); setFormError(''); setCreateOpen(true); }}
          >
            Registar Trotinete
          </Button>
        }
      />

      {queryError ? (
        <div className="glass-card rounded-xl p-6">
          <p className="text-sm text-on-surface-variant">{errorMessage}</p>
          <Button className="mt-4" variant="outline" onClick={() => { void scootersQuery.refetch(); void customersQuery.refetch(); }}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <DataTable
          data={scooters}
          columns={columns}
          searchPlaceholder={isPending ? 'A carregar trotinetes...' : 'Pesquisar por numero de serie, marca ou proprietario...'}
        />
      )}

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Registar Trotinete">
        <div className="space-y-4">
          {formError && <p className="text-sm text-error">{formError}</p>}
          <Input label="Numero de Serie" value={form.serialNumber} onChange={(e) => updateField('serialNumber', e.target.value)} />
          <Input label="Marca" value={form.brand} onChange={(e) => updateField('brand', e.target.value)} />
          <Input label="Modelo" value={form.model} onChange={(e) => updateField('model', e.target.value)} />
          <Select label="Proprietario" value={form.customerNif} onChange={(e) => updateField('customerNif', e.target.value)} options={customerOptions} />
          <Input label="Notas de Condicao" value={form.conditionNotes} onChange={(e) => updateField('conditionNotes', e.target.value)} />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'A registar...' : 'Registar'}
          </Button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal open={!!viewScooter} onClose={() => setViewScooter(null)} title="Detalhe da Trotinete">
        {viewScooter && (
          <div className="space-y-3">
            <DetailRow label="N. Serie" value={viewScooter.serialNumber} />
            <DetailRow label="Marca" value={viewScooter.brand} />
            <DetailRow label="Modelo" value={viewScooter.model} />
            <DetailRow label="Proprietario" value={viewScooter.client} />
            <DetailRow label="NIF" value={viewScooter.clientNif} />
            {viewScooter.conditionNotes && <DetailRow label="Notas" value={viewScooter.conditionNotes} />}
            <DetailRow label="Estado" value={viewScooter.status === 'ativo' ? 'Ativo' : 'Inativo'} />
          </div>
        )}
      </Modal>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <p className="text-xs uppercase tracking-wider text-on-surface-variant">{label}</p>
      <p className="text-sm font-medium text-on-surface">{value}</p>
    </div>
  );
}
