import { financialParametersSchema } from '@gengis-khan/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { ApiError, apiFetch } from '@/lib/api/http-client';

type FinancialParameters = z.infer<typeof financialParametersSchema>;

async function fetchFinancialParameters(): Promise<FinancialParameters> {
  const response = await apiFetch<unknown>('/config/financial-parameters');
  return financialParametersSchema.parse(response);
}

async function updateFinancialParameters(data: FinancialParameters): Promise<FinancialParameters> {
  const response = await apiFetch<unknown>('/config/financial-parameters', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return financialParametersSchema.parse(response);
}

const users = [
  { name: 'Carlos Mendes', role: 'Mecanico', email: 'carlos@gengiskhan.pt', status: 'ativo' as const },
  { name: 'Pedro Santos', role: 'Mecanico', email: 'pedro@gengiskhan.pt', status: 'ativo' as const },
  { name: 'Ana Costa', role: 'Mecanico', email: 'ana@gengiskhan.pt', status: 'ativo' as const },
  { name: 'Rui Ferreira', role: 'Gestor', email: 'rui@gengiskhan.pt', status: 'ativo' as const },
  { name: 'Sofia Martins', role: 'Mecanico', email: 'sofia@gengiskhan.pt', status: 'inativo' as const },
];

export function SettingsPage() {
  const queryClient = useQueryClient();

  const financialQuery = useQuery({
    queryKey: ['config', 'financial-parameters'],
    queryFn: fetchFinancialParameters,
  });

  const [vatRate, setVatRate] = useState<string>('');
  const [hourlyRate, setHourlyRate] = useState<string>('');
  const [hasEdited, setHasEdited] = useState(false);

  const displayVat = hasEdited ? vatRate : (financialQuery.data?.vatRate ?? '');
  const displayHourly = hasEdited ? hourlyRate : (financialQuery.data?.hourlyLaborRate ?? '');

  const saveMutation = useMutation({
    mutationFn: updateFinancialParameters,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['config', 'financial-parameters'] });
      setHasEdited(false);
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      vatRate: displayVat,
      hourlyLaborRate: displayHourly,
    });
  };

  const errorMessage = financialQuery.error instanceof ApiError
    ? financialQuery.error.message
    : saveMutation.error instanceof ApiError
      ? saveMutation.error.message
      : null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Configuracao"
        title="Definicoes do Sistema"
        subtitle="Parametros globais da oficina, faturacao e gestao de utilizadores."
      />

      {errorMessage && (
        <div className="glass-card rounded-xl p-4">
          <p className="text-sm text-error">{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Workshop Profile */}
        <GlassCard className="p-5">
          <p className="mb-5 font-headline text-lg font-semibold text-on-surface">
            Perfil da Oficina
          </p>
          <div className="space-y-5">
            <Input label="Nome Comercial" defaultValue="Oficinas Gengis Khan" />
            <Input label="NIF" defaultValue="512 345 678" />
            <Input label="Morada" defaultValue="Rua da Engenharia, 42 — 4700 Braga" />
            <Input label="Telefone" defaultValue="+351 253 123 456" />
            <Input label="Email" defaultValue="geral@gengiskhan.pt" />
          </div>
        </GlassCard>

        {/* Billing Settings */}
        <GlassCard className="p-5">
          <p className="mb-5 font-headline text-lg font-semibold text-on-surface">
            Parametros de Faturacao
          </p>
          <div className="space-y-5">
            <Input
              label="Taxa de IVA (%)"
              type="number"
              value={displayVat}
              onChange={(e) => {
                setVatRate(e.target.value);
                setHasEdited(true);
              }}
              disabled={financialQuery.isPending}
            />
            <Input
              label="Custo Horario (€)"
              type="number"
              value={displayHourly}
              onChange={(e) => {
                setHourlyRate(e.target.value);
                setHasEdited(true);
              }}
              disabled={financialQuery.isPending}
            />
            <Input label="Moeda" defaultValue="EUR" disabled />
            <Input label="Prefixo de Fatura" defaultValue="FT-" disabled />
            <Input label="Proximo Numero" type="number" defaultValue="1253" disabled />
          </div>
          {hasEdited && (
            <div className="mt-4 flex justify-end">
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'A guardar...' : 'Guardar'}
              </Button>
            </div>
          )}
        </GlassCard>
      </div>

      {/* User Management */}
      <GlassCard className="p-5">
        <div className="mb-5 flex items-center justify-between">
          <p className="font-headline text-lg font-semibold text-on-surface">
            Gestao de Utilizadores
          </p>
          <button className="flex items-center gap-2 rounded-lg bg-surface-high px-3 py-2 text-sm font-medium text-on-surface-variant transition hover:text-on-surface">
            <Icon name="person_add" size={18} />
            Adicionar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Nome</th>
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Funcao</th>
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Email</th>
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Estado</th>
                <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.email} className="border-t border-outline-variant/10">
                  <td className="py-3 text-sm font-medium text-on-surface">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-high text-xs font-semibold text-on-surface-variant">
                        {user.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      {user.name}
                    </div>
                  </td>
                  <td className="py-3 text-sm text-on-surface-variant">{user.role}</td>
                  <td className="py-3 text-sm font-mono text-on-surface-variant">{user.email}</td>
                  <td className="py-3"><StatusBadge status={user.status} /></td>
                  <td className="py-3 text-right">
                    <button className="rounded-md p-1.5 text-on-surface-variant transition hover:bg-surface-highest hover:text-on-surface">
                      <Icon name="edit" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* System Status */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-tertiary animate-pulse" />
            <p className="text-sm text-on-surface-variant">
              Servidor operacional — ultimo backup: 10 Abr 2026, 03:00
            </p>
          </div>
          <p className="text-xs text-on-surface-variant/60">v1.0.0</p>
        </div>
      </GlassCard>
    </div>
  );
}
