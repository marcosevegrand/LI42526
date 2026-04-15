import { partSchema } from '@gengis-khan/contracts';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { z } from 'zod';

import { DataTable } from '@/components/ui/data-table';
import { GlassCard } from '@/components/ui/glass-card';
import { Icon } from '@/components/ui/icon';
import { KPICard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs } from '@/components/ui/tabs';
import { ApiError, apiFetch } from '@/lib/api/http-client';

type ApiPart = z.infer<typeof partSchema>;

const stockMovementSchema = z.object({
  id: z.string(),
  partReference: z.string(),
  movementType: z.enum(['in', 'out', 'adjustment']),
  origin: z.string(),
  quantityDelta: z.number(),
  balanceAfter: z.number(),
  note: z.string().optional(),
  createdAt: z.string(),
});

type StockMovement = z.infer<typeof stockMovementSchema>;

type InventoryItem = {
  id: string;
  reference: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  minimum: number;
  unitPrice: number;
  status: 'critico' | 'limiar' | 'estavel';
};

function toInventoryItem(part: ApiPart): InventoryItem {
  const status: InventoryItem['status'] =
    part.currentStock <= 0 || part.currentStock < part.minimumStock * 0.5
      ? 'critico'
      : part.currentStock < part.minimumStock
        ? 'limiar'
        : 'estavel';

  return {
    id: part.partReference,
    reference: part.partReference,
    name: part.description,
    category: '-',
    stock: part.currentStock,
    unit: 'un',
    minimum: part.minimumStock,
    unitPrice: parseFloat(part.salePrice),
    status,
  };
}

const col = createColumnHelper<InventoryItem>();

const columns = [
  col.accessor('reference', {
    header: 'Referencia',
    cell: (info) => (
      <span className="font-mono text-xs font-semibold text-primary">{info.getValue()}</span>
    ),
  }),
  col.accessor('name', { header: 'Peca' }),
  col.accessor('stock', {
    header: 'Stock',
    cell: (info) => (
      <span className="font-semibold">{info.getValue()}</span>
    ),
  }),
  col.accessor('minimum', { header: 'Minimo' }),
  col.accessor('unitPrice', {
    header: 'Preco Unit.',
    cell: (info) => `€${info.getValue().toFixed(2)}`,
  }),
  col.accessor('status', {
    header: 'Estado',
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
];

const movementCol = createColumnHelper<StockMovement>();

const movementColumns = [
  movementCol.accessor('createdAt', {
    header: 'Data',
    cell: (info) => {
      const date = new Date(info.getValue());
      return <span className="text-xs">{date.toLocaleString('pt-PT')}</span>;
    },
  }),
  movementCol.accessor('partReference', {
    header: 'Referencia',
    cell: (info) => (
      <span className="font-mono text-xs font-semibold text-primary">{info.getValue()}</span>
    ),
  }),
  movementCol.accessor('movementType', {
    header: 'Tipo',
    cell: (info) => {
      const labels: Record<string, string> = { in: 'Entrada', out: 'Saida', adjustment: 'Ajuste' };
      return <span className="text-sm">{labels[info.getValue()] ?? info.getValue()}</span>;
    },
  }),
  movementCol.accessor('quantityDelta', {
    header: 'Quantidade',
    cell: (info) => {
      const val = info.getValue();
      return (
        <span className={`font-semibold ${val > 0 ? 'text-tertiary' : 'text-error'}`}>
          {val > 0 ? `+${val}` : val}
        </span>
      );
    },
  }),
  movementCol.accessor('balanceAfter', {
    header: 'Saldo',
    cell: (info) => <span className="font-semibold">{info.getValue()}</span>,
  }),
  movementCol.accessor('origin', { header: 'Origem' }),
];

async function fetchParts(): Promise<ApiPart[]> {
  const response = await apiFetch<unknown>('/parts?limit=100');
  return z.array(partSchema).parse(response);
}

async function fetchLowStock(): Promise<ApiPart[]> {
  const response = await apiFetch<unknown>('/parts/low-stock?limit=50');
  return z.array(partSchema).parse(response);
}

async function fetchStockMovements(): Promise<StockMovement[]> {
  const response = await apiFetch<unknown>('/stock-movements?limit=100');
  return z.array(stockMovementSchema).parse(response);
}

const tabs = [
  { id: 'inventario', label: 'Inventario' },
  { id: 'movimentos', label: 'Movimentos' },
];

export function InventoryPage() {
  const [activeTab, setActiveTab] = useState('inventario');

  const partsQuery = useQuery({
    queryKey: ['parts', 'list'],
    queryFn: fetchParts,
  });

  const lowStockQuery = useQuery({
    queryKey: ['parts', 'low-stock'],
    queryFn: fetchLowStock,
  });

  const movementsQuery = useQuery({
    queryKey: ['stock-movements'],
    queryFn: fetchStockMovements,
    enabled: activeTab === 'movimentos',
  });

  const inventoryItems = useMemo(
    () => (partsQuery.data ?? []).map(toInventoryItem),
    [partsQuery.data],
  );

  const kpis = useMemo(() => {
    const parts = partsQuery.data ?? [];
    const lowStock = lowStockQuery.data ?? [];
    const totalUnits = parts.reduce((sum, p) => sum + p.currentStock, 0);
    const totalValue = parts.reduce((sum, p) => sum + p.currentStock * parseFloat(p.salePrice), 0);

    return [
      { label: 'Total Unidades', value: totalUnits.toLocaleString('pt-PT'), icon: 'inventory_2' },
      { label: 'Itens Criticos', value: String(lowStock.length), icon: 'warning' },
      { label: 'Valor Total', value: `€${totalValue.toLocaleString('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, icon: 'euro' },
    ];
  }, [partsQuery.data, lowStockQuery.data]);

  const queryError = partsQuery.error ?? lowStockQuery.error;
  const errorMessage = queryError instanceof ApiError
    ? queryError.message
    : 'Nao foi possivel carregar o inventario.';

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Stock e Pecas"
        title="Catalogo e Movimentos de Stock"
        subtitle="Listagem de pecas, alertas de stock baixo e historico de movimentos auditaveis."
      />

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      {queryError ? (
        <div className="glass-card rounded-xl p-6">
          <p className="text-sm text-on-surface-variant">{errorMessage}</p>
          <button
            className="mt-4 rounded-lg bg-surface-high px-4 py-2 text-sm font-medium text-on-surface-variant transition hover:text-on-surface"
            onClick={() => {
              void partsQuery.refetch();
              void lowStockQuery.refetch();
            }}
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          {activeTab === 'inventario' && (
            <DataTable
              data={inventoryItems}
              columns={columns}
              searchPlaceholder={partsQuery.isPending ? 'A carregar pecas...' : 'Pesquisar por referencia ou peca...'}
            />
          )}

          {activeTab === 'movimentos' && (
            movementsQuery.isPending ? (
              <GlassCard className="rounded-xl p-8 text-center text-sm text-on-surface-variant">
                A carregar movimentos de stock...
              </GlassCard>
            ) : movementsQuery.error ? (
              <GlassCard className="rounded-xl p-8 text-center text-sm text-on-surface-variant">
                Erro ao carregar movimentos.
              </GlassCard>
            ) : (movementsQuery.data ?? []).length === 0 ? (
              <GlassCard className="rounded-xl p-8 text-center text-sm text-on-surface-variant">
                Sem movimentos de stock registados.
              </GlassCard>
            ) : (
              <DataTable
                data={movementsQuery.data ?? []}
                columns={movementColumns}
                searchPlaceholder="Pesquisar movimentos..."
              />
            )
          )}
        </>
      )}
    </div>
  );
}
