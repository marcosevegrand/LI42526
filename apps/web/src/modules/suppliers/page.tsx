import { partSchema, supplierSchema } from '@gengis-khan/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { GlassCard } from '@/components/ui/glass-card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { KPICard } from '@/components/ui/kpi-card';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { ApiError, apiFetch } from '@/lib/api/http-client';

type ApiSupplier = z.infer<typeof supplierSchema>;
type ApiPart = z.infer<typeof partSchema>;

const purchaseOrderResponseSchema = z.object({
  id: z.string().optional(),
  supplierId: z.string(),
  status: z.enum(['requested', 'received']).optional(),
  items: z.array(z.object({ partReference: z.string(), quantity: z.number() })),
});

type ApiPurchaseOrder = z.infer<typeof purchaseOrderResponseSchema>;

type Supplier = {
  id: string;
  name: string;
  email: string;
  contact: string;
  paymentTerms: string;
  status: 'ativo';
};

function toSupplierRow(supplier: ApiSupplier): Supplier {
  return {
    id: supplier.id ?? '',
    name: supplier.name,
    email: supplier.email,
    contact: supplier.phone,
    paymentTerms: supplier.paymentTerms,
    status: 'ativo',
  };
}

async function fetchSuppliers(): Promise<ApiSupplier[]> {
  const response = await apiFetch<unknown>('/suppliers');
  return z.array(supplierSchema).parse(response);
}

async function fetchPurchaseOrders(): Promise<ApiPurchaseOrder[]> {
  const response = await apiFetch<unknown>('/purchase-orders');
  return z.array(purchaseOrderResponseSchema).parse(response);
}

async function fetchParts(): Promise<ApiPart[]> {
  const response = await apiFetch<unknown>('/parts?limit=100');
  return z.array(partSchema).parse(response);
}

export function SuppliersPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ supplierId: '', partReference: '', quantity: '1' });
  const [formError, setFormError] = useState('');

  const suppliersQuery = useQuery({ queryKey: ['suppliers', 'list'], queryFn: fetchSuppliers });
  const purchaseOrdersQuery = useQuery({ queryKey: ['purchase-orders', 'list'], queryFn: fetchPurchaseOrders });
  const partsQuery = useQuery({ queryKey: ['parts', 'list'], queryFn: fetchParts, enabled: createOpen });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      await apiFetch('/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({
          supplierId: data.supplierId,
          items: [{ partReference: data.partReference, quantity: parseInt(data.quantity, 10) || 1 }],
        }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setCreateOpen(false);
      setForm({ supplierId: '', partReference: '', quantity: '1' });
      setFormError('');
    },
    onError: (err) => {
      setFormError(err instanceof ApiError ? err.message : 'Erro ao criar encomenda.');
    },
  });

  const suppliers = useMemo(() => (suppliersQuery.data ?? []).map(toSupplierRow), [suppliersQuery.data]);
  const purchaseOrders = purchaseOrdersQuery.data ?? [];

  const supplierNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of suppliersQuery.data ?? []) {
      if (s.id) map.set(s.id, s.name);
    }
    return map;
  }, [suppliersQuery.data]);

  const supplierOptions = useMemo(
    () => [
      { value: '', label: 'Selecionar fornecedor...' },
      ...(suppliersQuery.data ?? []).filter((s) => s.id).map((s) => ({ value: s.id!, label: s.name })),
    ],
    [suppliersQuery.data],
  );

  const partOptions = useMemo(
    () => [
      { value: '', label: 'Selecionar peca...' },
      ...(partsQuery.data ?? []).map((p) => ({ value: p.partReference, label: `${p.partReference} — ${p.description}` })),
    ],
    [partsQuery.data],
  );

  const kpis = useMemo(() => {
    const requested = purchaseOrders.filter((po) => !po.status || po.status === 'requested').length;
    const received = purchaseOrders.filter((po) => po.status === 'received').length;
    return [
      { label: 'Em Transito', value: String(requested), icon: 'local_shipping' },
      { label: 'Recebidas', value: String(received), icon: 'check_circle' },
      { label: 'Total Fornecedores', value: String(suppliers.length), icon: 'groups' },
    ];
  }, [purchaseOrders, suppliers]);

  const recentOrders = useMemo(() => purchaseOrders.slice(0, 5), [purchaseOrders]);

  const queryError = suppliersQuery.error ?? purchaseOrdersQuery.error;
  const errorMessage = queryError instanceof ApiError ? queryError.message : 'Nao foi possivel carregar os fornecedores.';

  const col = createColumnHelper<Supplier>();
  const columns = [
    col.accessor('name', {
      header: 'Parceiro',
      cell: (info) => <span className="font-semibold text-on-surface">{info.getValue()}</span>,
    }),
    col.accessor('email', {
      header: 'Email',
      cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
    }),
    col.accessor('contact', {
      header: 'Contacto',
      cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
    }),
    col.accessor('paymentTerms', { header: 'Termos Pgto.' }),
    col.accessor('status', {
      header: 'Estado',
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    col.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <button
          onClick={() => setViewSupplier(info.row.original)}
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
        eyebrow="Fornecedores"
        title="Compras e Rececao de Encomendas"
        subtitle="Gestao de fornecedores, encomendas de compra e rececao com atualizacao de stock."
        actions={
          <Button icon={<Icon name="add" size={18} />} onClick={() => { setForm({ supplierId: '', partReference: '', quantity: '1' }); setFormError(''); setCreateOpen(true); }}>
            Nova Encomenda
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpis.map((kpi) => <KPICard key={kpi.label} {...kpi} />)}
      </div>

      {queryError ? (
        <div className="glass-card rounded-xl p-6">
          <p className="text-sm text-on-surface-variant">{errorMessage}</p>
          <Button className="mt-4" variant="outline" onClick={() => { void suppliersQuery.refetch(); void purchaseOrdersQuery.refetch(); }}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <>
          <DataTable data={suppliers} columns={columns} searchPlaceholder={suppliersQuery.isPending ? 'A carregar fornecedores...' : 'Pesquisar fornecedores...'} />

          <GlassCard className="p-5">
            <p className="mb-4 font-headline text-lg font-semibold text-on-surface">Encomendas Recentes</p>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Sem encomendas registadas.</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between rounded-lg bg-surface-low/60 px-4 py-3">
                    <div className="flex items-center gap-4">
                      <Icon name="package_2" size={20} className="text-on-surface-variant" />
                      <div>
                        <p className="text-sm font-semibold text-on-surface">
                          PO-{order.id?.slice(0, 4)} — {supplierNameById.get(order.supplierId) ?? order.supplierId}
                        </p>
                        <p className="text-xs text-on-surface-variant">{order.items.length} itens</p>
                      </div>
                    </div>
                    <StatusBadge status={order.status === 'received' ? 'received' : 'requested'} />
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </>
      )}

      {/* Create Purchase Order Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nova Encomenda de Compra">
        <div className="space-y-4">
          {formError && <p className="text-sm text-error">{formError}</p>}
          <Select label="Fornecedor" value={form.supplierId} onChange={(e) => setForm((p) => ({ ...p, supplierId: e.target.value }))} options={supplierOptions} />
          <Select label="Peca" value={form.partReference} onChange={(e) => setForm((p) => ({ ...p, partReference: e.target.value }))} options={partOptions} />
          <Input label="Quantidade" type="number" min="1" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'A criar...' : 'Criar Encomenda'}
          </Button>
        </div>
      </Modal>

      {/* View Supplier Modal */}
      <Modal open={!!viewSupplier} onClose={() => setViewSupplier(null)} title="Detalhe do Fornecedor">
        {viewSupplier && (
          <div className="space-y-3">
            <DetailRow label="Nome" value={viewSupplier.name} />
            <DetailRow label="Email" value={viewSupplier.email} />
            <DetailRow label="Contacto" value={viewSupplier.contact} />
            <DetailRow label="Termos de Pagamento" value={viewSupplier.paymentTerms} />
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
