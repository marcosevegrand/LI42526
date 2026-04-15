import { invoiceSummarySchema } from '@gengis-khan/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { KPICard } from '@/components/ui/kpi-card';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { ApiError, apiFetch } from '@/lib/api/http-client';

type ApiInvoice = z.infer<typeof invoiceSummarySchema>;

type Invoice = {
  id: string;
  number: string;
  total: number;
  vat: number;
  subtotal: number;
  status: 'pago' | 'pendente' | 'vencido';
  paymentStatus: string;
};

const statusMap: Record<string, Invoice['status']> = {
  paid: 'pago',
  pending: 'pendente',
  overdue: 'vencido',
};

function toInvoiceRow(invoice: ApiInvoice): Invoice {
  return {
    id: invoice.id,
    number: invoice.invoiceNumber,
    total: parseFloat(invoice.total),
    vat: parseFloat(invoice.vatAmount),
    subtotal: parseFloat(invoice.subtotal),
    status: statusMap[invoice.paymentStatus] ?? 'pendente',
    paymentStatus: invoice.paymentStatus,
  };
}

type FilterStatus = 'all' | 'pago' | 'pendente' | 'vencido';

async function fetchInvoices(): Promise<ApiInvoice[]> {
  const response = await apiFetch<unknown>('/invoices');
  return z.array(invoiceSummarySchema).parse(response);
}

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

function downloadPdf(invoiceId: string) {
  window.open(`${apiBaseUrl}/invoices/${invoiceId}/pdf`, '_blank');
}

export function BillingPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [form, setForm] = useState({ serviceOrderId: '', paymentMethod: '', note: '' });
  const [formError, setFormError] = useState('');

  const invoicesQuery = useQuery({ queryKey: ['invoices', 'list'], queryFn: fetchInvoices });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      await apiFetch('/invoices', {
        method: 'POST',
        headers: { 'Idempotency-Key': `inv-${data.serviceOrderId}-${Date.now()}` },
        body: JSON.stringify({
          serviceOrderId: data.serviceOrderId,
          paymentMethod: data.paymentMethod,
          note: data.note || undefined,
        }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setCreateOpen(false);
      setForm({ serviceOrderId: '', paymentMethod: '', note: '' });
      setFormError('');
    },
    onError: (err) => {
      setFormError(err instanceof ApiError ? err.message : 'Erro ao emitir fatura.');
    },
  });

  const allInvoices = useMemo(() => (invoicesQuery.data ?? []).map(toInvoiceRow), [invoicesQuery.data]);
  const filteredInvoices = filter === 'all' ? allInvoices : allInvoices.filter((inv) => inv.status === filter);

  const kpis = useMemo(() => {
    const pending = allInvoices.filter((i) => i.status === 'pendente').reduce((sum, i) => sum + i.total, 0);
    const total = allInvoices.reduce((sum, i) => sum + i.total, 0);
    const overdue = allInvoices.filter((i) => i.status === 'vencido').reduce((sum, i) => sum + i.total, 0);
    return [
      { label: 'Pendente', value: `€${pending.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`, icon: 'hourglass_top' },
      { label: 'Faturacao Total', value: `€${total.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`, icon: 'trending_up' },
      { label: 'Em Atraso', value: `€${overdue.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`, icon: 'warning' },
    ];
  }, [allInvoices]);

  const filters: { id: FilterStatus; label: string }[] = [
    { id: 'all', label: 'Todas' },
    { id: 'pago', label: 'Pagas' },
    { id: 'pendente', label: 'Pendentes' },
    { id: 'vencido', label: 'Vencidas' },
  ];

  const col = createColumnHelper<Invoice>();
  const columns = [
    col.accessor('number', {
      header: 'Fatura',
      cell: (info) => <span className="font-semibold text-primary">{info.getValue()}</span>,
    }),
    col.accessor('subtotal', {
      header: 'Subtotal',
      cell: (info) => <span className="text-on-surface-variant">€{info.getValue().toFixed(2)}</span>,
    }),
    col.accessor('vat', {
      header: 'IVA',
      cell: (info) => <span className="text-on-surface-variant">€{info.getValue().toFixed(2)}</span>,
    }),
    col.accessor('total', {
      header: 'Total',
      cell: (info) => <span className="font-semibold">€{info.getValue().toFixed(2)}</span>,
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
            onClick={() => downloadPdf(info.row.original.id)}
            className="rounded-md p-1.5 text-on-surface-variant transition hover:bg-surface-highest hover:text-on-surface"
          >
            <Icon name="picture_as_pdf" size={16} />
          </button>
          <button
            onClick={() => setViewInvoice(info.row.original)}
            className="rounded-md p-1.5 text-on-surface-variant transition hover:bg-surface-highest hover:text-on-surface"
          >
            <Icon name="visibility" size={16} />
          </button>
        </div>
      ),
    }),
  ];

  const queryError = invoicesQuery.error;
  const errorMessage = queryError instanceof ApiError ? queryError.message : 'Nao foi possivel carregar as faturas.';

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Faturacao"
        title="Faturas e Pagamentos"
        subtitle="Emissao, consulta e estados de pagamento."
        actions={
          <Button icon={<Icon name="add" size={18} />} onClick={() => { setForm({ serviceOrderId: '', paymentMethod: '', note: '' }); setFormError(''); setCreateOpen(true); }}>
            Emitir Fatura
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpis.map((kpi) => <KPICard key={kpi.label} {...kpi} />)}
      </div>

      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              filter === f.id ? 'bg-surface-high text-primary' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {queryError ? (
        <div className="glass-card rounded-xl p-6">
          <p className="text-sm text-on-surface-variant">{errorMessage}</p>
          <Button className="mt-4" variant="outline" onClick={() => { void invoicesQuery.refetch(); }}>Tentar novamente</Button>
        </div>
      ) : (
        <DataTable data={filteredInvoices} columns={columns} searchPlaceholder={invoicesQuery.isPending ? 'A carregar faturas...' : 'Pesquisar faturas por numero...'} />
      )}

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Emitir Fatura">
        <div className="space-y-4">
          {formError && <p className="text-sm text-error">{formError}</p>}
          <Input label="ID da Ordem de Servico" value={form.serviceOrderId} onChange={(e) => setForm((p) => ({ ...p, serviceOrderId: e.target.value }))} />
          <Input label="Metodo de Pagamento" value={form.paymentMethod} onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))} />
          <Input label="Nota (opcional)" value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'A emitir...' : 'Emitir Fatura'}
          </Button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal open={!!viewInvoice} onClose={() => setViewInvoice(null)} title="Detalhe da Fatura">
        {viewInvoice && (
          <div className="space-y-3">
            <DetailRow label="Numero" value={viewInvoice.number} />
            <DetailRow label="Subtotal" value={`€${viewInvoice.subtotal.toFixed(2)}`} />
            <DetailRow label="IVA" value={`€${viewInvoice.vat.toFixed(2)}`} />
            <DetailRow label="Total" value={`€${viewInvoice.total.toFixed(2)}`} />
            <div className="flex justify-between items-center">
              <p className="text-xs uppercase tracking-wider text-on-surface-variant">Estado</p>
              <StatusBadge status={viewInvoice.status} />
            </div>
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
