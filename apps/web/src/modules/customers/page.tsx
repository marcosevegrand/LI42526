import { customerSchema } from '@gengis-khan/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { useState } from 'react';
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

type ApiCustomer = z.infer<typeof customerSchema>;

type Customer = {
  id: string;
  name: string;
  nif: string;
  type: 'personal' | 'business';
  email: string;
  phone: string;
  orders: number;
  status: 'ativo' | 'inativo';
};

const col = createColumnHelper<Customer>();

async function fetchCustomers(): Promise<ApiCustomer[]> {
  const response = await apiFetch<unknown>('/customers?limit=100');
  return z.array(customerSchema).parse(response);
}

function toCustomerRow(customer: ApiCustomer): Customer {
  return {
    id: customer.nif,
    name: customer.customerType === 'business' ? customer.legalName ?? customer.fullName : customer.fullName,
    nif: customer.nif,
    type: customer.customerType,
    email: customer.email,
    phone: customer.phone,
    orders: 0,
    status: customer.isArchived ? 'inativo' : 'ativo',
  };
}

const emptyForm = {
  nif: '',
  customerType: 'personal' as 'personal' | 'business',
  fullName: '',
  legalName: '',
  email: '',
  phone: '',
  address: '',
  creditLimit: '',
  paymentTerms: '',
};

export function CustomersPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewCustomer, setViewCustomer] = useState<ApiCustomer | null>(null);
  const [editCustomer, setEditCustomer] = useState<ApiCustomer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const customersQuery = useQuery({
    queryKey: ['customers', 'list'],
    queryFn: fetchCustomers,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
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
          creditLimit: data.customerType === 'business' ? data.creditLimit : undefined,
          paymentTerms: data.customerType === 'business' ? data.paymentTerms : undefined,
        }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
      setCreateOpen(false);
      setForm(emptyForm);
      setFormError('');
    },
    onError: (err) => {
      setFormError(err instanceof ApiError ? err.message : 'Erro ao criar cliente.');
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      await apiFetch(`/customers/${data.nif}`, {
        method: 'PATCH',
        body: JSON.stringify({
          customerType: data.customerType,
          fullName: data.fullName,
          legalName: data.customerType === 'business' ? data.legalName : undefined,
          email: data.email,
          phone: data.phone,
          address: data.address || undefined,
          creditLimit: data.customerType === 'business' ? data.creditLimit : undefined,
          paymentTerms: data.customerType === 'business' ? data.paymentTerms : undefined,
        }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
      setEditCustomer(null);
      setFormError('');
    },
    onError: (err) => {
      setFormError(err instanceof ApiError ? err.message : 'Erro ao editar cliente.');
    },
  });

  const openCreate = () => {
    setForm(emptyForm);
    setFormError('');
    setCreateOpen(true);
  };

  const openEdit = (customer: Customer) => {
    const api = customersQuery.data?.find((c) => c.nif === customer.nif);
    if (!api) return;
    setForm({
      nif: api.nif,
      customerType: api.customerType,
      fullName: api.fullName,
      legalName: api.legalName ?? '',
      email: api.email,
      phone: api.phone,
      address: api.address ?? '',
      creditLimit: api.creditLimit ?? '',
      paymentTerms: api.paymentTerms ?? '',
    });
    setFormError('');
    setEditCustomer(api);
  };

  const openView = (customer: Customer) => {
    const api = customersQuery.data?.find((c) => c.nif === customer.nif);
    if (api) setViewCustomer(api);
  };

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const customers = (customersQuery.data ?? []).map(toCustomerRow);
  const errorMessage = customersQuery.error instanceof ApiError
    ? customersQuery.error.message
    : 'Nao foi possivel carregar os clientes.';

  const columns = [
    col.accessor('name', {
      header: 'Nome',
      cell: (info) => (
        <span className="font-semibold text-on-surface">{info.getValue()}</span>
      ),
    }),
    col.accessor('nif', {
      header: 'NIF',
      cell: (info) => (
        <span className="font-mono text-xs">{info.getValue()}</span>
      ),
    }),
    col.accessor('type', {
      header: 'Tipo',
      cell: (info) => (
        <span className="text-on-surface-variant">
          {info.getValue() === 'business' ? 'Empresarial' : 'Particular'}
        </span>
      ),
    }),
    col.accessor('email', {
      header: 'Email',
      cell: (info) => (
        <span className="text-sm text-on-surface-variant">{info.getValue()}</span>
      ),
    }),
    col.accessor('phone', {
      header: 'Telefone',
      cell: (info) => (
        <span className="font-mono text-xs">{info.getValue()}</span>
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
        <div className="flex gap-1">
          <button
            onClick={() => openView(info.row.original)}
            className="rounded-md p-1.5 text-on-surface-variant transition hover:bg-surface-highest hover:text-on-surface"
          >
            <Icon name="visibility" size={16} />
          </button>
          <button
            onClick={() => openEdit(info.row.original)}
            className="rounded-md p-1.5 text-on-surface-variant transition hover:bg-surface-highest hover:text-on-surface"
          >
            <Icon name="edit" size={16} />
          </button>
        </div>
      ),
    }),
  ];

  const customerForm = (
    <div className="space-y-4">
      {formError && <p className="text-sm text-error">{formError}</p>}
      {!editCustomer && (
        <Input label="NIF" value={form.nif} onChange={(e) => updateField('nif', e.target.value)} />
      )}
      <Select
        label="Tipo"
        value={form.customerType}
        onChange={(e) => updateField('customerType', e.target.value)}
        options={[
          { value: 'personal', label: 'Particular' },
          { value: 'business', label: 'Empresarial' },
        ]}
      />
      <Input label="Nome Completo" value={form.fullName} onChange={(e) => updateField('fullName', e.target.value)} />
      {form.customerType === 'business' && (
        <Input label="Nome Legal" value={form.legalName} onChange={(e) => updateField('legalName', e.target.value)} />
      )}
      <Input label="Email" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
      <Input label="Telefone" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
      <Input label="Morada" value={form.address} onChange={(e) => updateField('address', e.target.value)} />
      {form.customerType === 'business' && (
        <>
          <Input label="Limite de Credito" value={form.creditLimit} onChange={(e) => updateField('creditLimit', e.target.value)} />
          <Input label="Termos de Pagamento" value={form.paymentTerms} onChange={(e) => updateField('paymentTerms', e.target.value)} />
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Clientes"
        title="Gestao de Clientes"
        subtitle="Listagem, detalhe por NIF, historico tecnico e dados de credito."
        actions={
          <Button icon={<Icon name="person_add" size={18} />} onClick={openCreate}>
            Novo Cliente
          </Button>
        }
      />

      {customersQuery.isError ? (
        <div className="glass-card rounded-xl p-6">
          <p className="text-sm text-on-surface-variant">{errorMessage}</p>
          <Button className="mt-4" variant="outline" onClick={() => { void customersQuery.refetch(); }}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <DataTable
          data={customers}
          columns={columns}
          searchPlaceholder={customersQuery.isPending ? 'A carregar clientes...' : 'Pesquisar por nome, NIF ou email...'}
        />
      )}

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Novo Cliente">
        {customerForm}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'A criar...' : 'Criar Cliente'}
          </Button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal open={!!viewCustomer} onClose={() => setViewCustomer(null)} title="Detalhe do Cliente">
        {viewCustomer && (
          <div className="space-y-3">
            <DetailRow label="NIF" value={viewCustomer.nif} />
            <DetailRow label="Tipo" value={viewCustomer.customerType === 'business' ? 'Empresarial' : 'Particular'} />
            <DetailRow label="Nome" value={viewCustomer.fullName} />
            {viewCustomer.legalName && <DetailRow label="Nome Legal" value={viewCustomer.legalName} />}
            <DetailRow label="Email" value={viewCustomer.email} />
            <DetailRow label="Telefone" value={viewCustomer.phone} />
            {viewCustomer.address && <DetailRow label="Morada" value={viewCustomer.address} />}
            {viewCustomer.creditLimit && <DetailRow label="Limite de Credito" value={`€${viewCustomer.creditLimit}`} />}
            {viewCustomer.paymentTerms && <DetailRow label="Termos de Pagamento" value={viewCustomer.paymentTerms} />}
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editCustomer} onClose={() => setEditCustomer(null)} title="Editar Cliente">
        {customerForm}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setEditCustomer(null)}>Cancelar</Button>
          <Button onClick={() => editMutation.mutate(form)} disabled={editMutation.isPending}>
            {editMutation.isPending ? 'A guardar...' : 'Guardar'}
          </Button>
        </div>
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
