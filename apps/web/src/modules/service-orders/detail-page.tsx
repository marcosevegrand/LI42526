import { customerSchema, interventionPartAssociationSchema, interventionSchema, invoiceSummarySchema, partSchema, serviceOrderStatuses } from '@gengis-khan/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { ApiError, apiFetch } from '@/lib/api/http-client';
import { useSessionStore } from '@/store/session-store';

const serviceOrderDetailSchema = z.object({
  id: z.string(),
  serviceOrderNumber: z.number(),
  customerNif: z.string(),
  scooterSerialNumber: z.string(),
  reportedProblem: z.string(),
  status: z.enum(serviceOrderStatuses),
  estimatedCompletionDate: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  deliveredAt: z.string().nullable().optional(),
  diagnosis: z
    .object({
      technicalFindings: z.string().optional(),
      recommendedActions: z.string().optional(),
      estimatedLaborHours: z.string().optional(),
      notes: z.string().optional(),
    })
    .nullable()
    .optional(),
  createdAt: z.string(),
});

type ApiServiceOrder = z.infer<typeof serviceOrderDetailSchema>;
type ApiIntervention = z.infer<typeof interventionSchema>;
type ApiCustomer = z.infer<typeof customerSchema>;

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

function formatElapsedTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function computeLiveSeconds(intervention: ApiIntervention): number {
  const base = intervention.elapsedSeconds ?? 0;
  if (intervention.timerState !== 'running' || !intervention.timerStartedAt) return base;
  const startedAt = new Date(intervention.timerStartedAt).getTime();
  return base + Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
}

function useLiveTick(interventions: ApiIntervention[]): void {
  const [, setTick] = useState(0);
  const hasRunning = interventions.some((i) => i.timerState === 'running');
  useEffect(() => {
    if (!hasRunning) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [hasRunning]);
}

async function fetchOrder(id: string): Promise<ApiServiceOrder> {
  const response = await apiFetch<unknown>(`/service-orders/${id}`);
  return serviceOrderDetailSchema.parse(response);
}

async function fetchInterventions(id: string): Promise<ApiIntervention[]> {
  const response = await apiFetch<unknown>(`/service-orders/${id}/interventions`);
  return z.array(interventionSchema).parse(response);
}

async function fetchCustomer(nif: string): Promise<ApiCustomer> {
  const response = await apiFetch<unknown>(`/customers/${nif}`);
  return customerSchema.parse(response);
}

type ApiInvoice = z.infer<typeof invoiceSummarySchema>;
type ApiPart = z.infer<typeof partSchema>;
type ApiInterventionPart = z.infer<typeof interventionPartAssociationSchema>;

async function fetchPartsCatalog(): Promise<ApiPart[]> {
  const response = await apiFetch<unknown>('/parts?limit=100');
  return z.array(partSchema).parse(response);
}

async function fetchInterventionParts(interventionId: string): Promise<ApiInterventionPart[]> {
  const response = await apiFetch<unknown>(`/interventions/${interventionId}/parts`);
  return z.array(interventionPartAssociationSchema).parse(response);
}

async function fetchInvoices(): Promise<ApiInvoice[]> {
  const response = await apiFetch<unknown>('/invoices');
  return z.array(invoiceSummarySchema).parse(response);
}

export function ServiceOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useSessionStore((s) => s.user);

  const orderQuery = useQuery({
    queryKey: ['service-orders', 'detail', id],
    queryFn: () => fetchOrder(id!),
    enabled: !!id,
  });

  const interventionsQuery = useQuery({
    queryKey: ['interventions', id],
    queryFn: () => fetchInterventions(id!),
    enabled: !!id,
  });

  const customerQuery = useQuery({
    queryKey: ['customers', 'detail', orderQuery.data?.customerNif],
    queryFn: () => fetchCustomer(orderQuery.data!.customerNif),
    enabled: !!orderQuery.data?.customerNif,
  });

  const invoicesQuery = useQuery({ queryKey: ['invoices', 'list'], queryFn: fetchInvoices });
  const partsCatalogQuery = useQuery({ queryKey: ['parts', 'catalog'], queryFn: fetchPartsCatalog });

  const interventions = interventionsQuery.data ?? [];
  useLiveTick(interventions);

  const order = orderQuery.data;
  const customer = customerQuery.data;

  const [diagnosisForm, setDiagnosisForm] = useState({
    technicalFindings: '',
    recommendedActions: '',
    estimatedLaborHours: '',
    notes: '',
  });
  const [diagnosisError, setDiagnosisError] = useState('');
  const [diagnosisEditing, setDiagnosisEditing] = useState(false);
  const [diagnosisJustSaved, setDiagnosisJustSaved] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [createError, setCreateError] = useState('');
  const [partInterventionId, setPartInterventionId] = useState<string | null>(null);
  const [partForm, setPartForm] = useState({ partReference: '', quantity: '1', note: '' });
  const [partError, setPartError] = useState('');

  const hasSavedDiagnosis = !!(order?.diagnosis?.technicalFindings && order.diagnosis.recommendedActions);

  // sync diagnosis form when order loads, and start in read-only if a diagnosis exists
  useEffect(() => {
    if (order?.diagnosis) {
      setDiagnosisForm({
        technicalFindings: order.diagnosis.technicalFindings ?? '',
        recommendedActions: order.diagnosis.recommendedActions ?? '',
        estimatedLaborHours: order.diagnosis.estimatedLaborHours ?? '',
        notes: order.diagnosis.notes ?? '',
      });
      setDiagnosisEditing(false);
    } else if (order) {
      setDiagnosisEditing(true);
    }
  }, [order?.id]);

  // auto-clear "saved" toast after 2.5s
  useEffect(() => {
    if (!diagnosisJustSaved) return;
    const t = setTimeout(() => setDiagnosisJustSaved(false), 2500);
    return () => clearTimeout(t);
  }, [diagnosisJustSaved]);

  const statusMutation = useMutation({
    mutationFn: async (toStatus: string) => {
      await apiFetch(`/service-orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ toStatus }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setStatusError('');
    },
    onError: (err) => {
      setStatusError(err instanceof ApiError ? err.message : 'Erro ao mudar estado.');
    },
  });

  const diagnosisMutation = useMutation({
    mutationFn: async (data: typeof diagnosisForm) => {
      const hoursNum = parseFloat(data.estimatedLaborHours || '0');
      const formattedHours = (Number.isFinite(hoursNum) ? hoursNum : 0).toFixed(2);
      await apiFetch(`/service-orders/${id}/diagnosis`, {
        method: 'PATCH',
        body: JSON.stringify({
          technicalFindings: data.technicalFindings,
          recommendedActions: data.recommendedActions,
          estimatedLaborHours: formattedHours,
          notes: data.notes || undefined,
        }),
      });
      // Auto-advance from "received" to "in-diagnosis" when the diagnosis is first saved.
      // The technician is clearly diagnosing — the state should reflect that without an extra click.
      if (order?.status === 'received') {
        await apiFetch(`/service-orders/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ toStatus: 'in-diagnosis' }),
        });
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['service-orders', 'detail', id] });
      void queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      setDiagnosisError('');
      setDiagnosisEditing(false);
      setDiagnosisJustSaved(true);
    },
    onError: (err) => {
      setDiagnosisError(err instanceof ApiError ? err.message : 'Erro ao guardar diagnostico.');
    },
  });

  const timerMutation = useMutation({
    mutationFn: async ({ interventionId, action }: { interventionId: string; action: 'start' | 'pause' | 'stop' }) => {
      await apiFetch(`/interventions/${interventionId}/timer/${action}`, { method: 'POST' });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['interventions', id] });
      // Invoice totals depend on labor seconds — keep billing fresh too.
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const createInterventionMutation = useMutation({
    mutationFn: async (description: string) => {
      await apiFetch(`/service-orders/${id}/interventions`, {
        method: 'POST',
        body: JSON.stringify({ description, mechanicUserId: user?.id ?? '' }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['interventions', id] });
      void queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      setCreateOpen(false);
      setNewDescription('');
      setCreateError('');
    },
    onError: (err) => {
      setCreateError(err instanceof ApiError ? err.message : 'Erro ao criar intervencao.');
    },
  });

  const attachPartMutation = useMutation({
    mutationFn: async ({ interventionId, partReference, quantity, note }: { interventionId: string; partReference: string; quantity: number; note?: string }) => {
      await apiFetch(`/interventions/${interventionId}/parts`, {
        method: 'POST',
        headers: { 'Idempotency-Key': `part-${interventionId}-${partReference}-${Date.now()}` },
        body: JSON.stringify({ partReference, quantity, note }),
      });
    },
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['intervention-parts', vars.interventionId] });
      void queryClient.invalidateQueries({ queryKey: ['parts'] });
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setPartInterventionId(null);
      setPartForm({ partReference: '', quantity: '1', note: '' });
      setPartError('');
    },
    onError: (err) => {
      setPartError(err instanceof ApiError ? err.message : 'Erro ao adicionar peca.');
    },
  });

  const partOptions = useMemo(
    () => [
      { value: '', label: 'Selecionar peca...' },
      ...(partsCatalogQuery.data ?? [])
        .filter((p) => !p.isArchived)
        .map((p) => ({
          value: p.partReference,
          label: `${p.partReference} — ${p.description} (stock: ${p.currentStock})`,
        })),
    ],
    [partsCatalogQuery.data],
  );

  const orderInvoice = useMemo(
    () => (invoicesQuery.data ?? []).find((inv) => inv.serviceOrderId === order?.id),
    [invoicesQuery.data, order?.id],
  );
  const isPersonalCustomer = customer?.customerType === 'personal';
  const deliveryBlocked = isPersonalCustomer && orderInvoice?.paymentStatus !== 'paid';

  const transitions = useMemo(() => {
    const base = statusTransitions[order?.status ?? ''] ?? [];
    if (deliveryBlocked) {
      return base.filter((t) => t.value !== 'delivered');
    }
    return base;
  }, [order?.status, deliveryBlocked]);
  const totalSeconds = useMemo(
    () => interventions.reduce((sum, i) => sum + computeLiveSeconds(i), 0),
    [interventions],
  );

  if (orderQuery.isPending) {
    return (
      <GlassCard className="p-8 text-center text-sm text-on-surface-variant">
        A carregar ordem de servico...
      </GlassCard>
    );
  }

  if (orderQuery.isError || !order) {
    const msg = orderQuery.error instanceof ApiError ? orderQuery.error.message : 'Nao foi possivel carregar a ordem.';
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate('/service-orders')}>
          <Icon name="arrow_back" size={18} /> Voltar
        </Button>
        <GlassCard className="p-6">
          <p className="text-sm text-on-surface-variant">{msg}</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Ordem OS-${String(order.serviceOrderNumber).padStart(4, '0')}`}
        title={customer?.fullName ?? order.customerNif}
        subtitle={order.reportedProblem}
        actions={
          <Button variant="outline" icon={<Icon name="arrow_back" size={18} />} onClick={() => navigate('/service-orders')}>
            Voltar
          </Button>
        }
      />

      {/* Top summary strip */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <GlassCard className="p-4">
          <p className="text-xs uppercase tracking-wider text-on-surface-variant">Estado</p>
          <div className="mt-2"><StatusBadge status={order.status} /></div>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-xs uppercase tracking-wider text-on-surface-variant">Trotinete</p>
          <p className="mt-2 font-mono text-sm text-on-surface">{order.scooterSerialNumber}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-xs uppercase tracking-wider text-on-surface-variant">Cliente</p>
          <p className="mt-2 truncate text-sm text-on-surface">{customer?.fullName ?? order.customerNif}</p>
          <p className="text-xs text-on-surface-variant">{order.customerNif}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-xs uppercase tracking-wider text-on-surface-variant">Tempo Total</p>
          <p className={`mt-2 font-mono text-lg font-semibold ${interventions.some((i) => i.timerState === 'running') ? 'text-tertiary' : 'text-primary'}`}>
            {formatElapsedTime(totalSeconds)}
          </p>
        </GlassCard>
      </div>

      {/* Delivery-blocked notice for personal customers */}
      {isPersonalCustomer && order.status === 'completed' && deliveryBlocked && (
        <GlassCard className="border border-tertiary/30 bg-tertiary/5 p-4">
          <div className="flex items-start gap-3">
            <Icon name="info" size={20} className="mt-0.5 shrink-0 text-tertiary" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-on-surface">Entrega bloqueada</p>
              <p className="mt-1 text-xs text-on-surface-variant">
                Este e um cliente particular. Para entregar, e necessario ter uma fatura paga associada a esta ordem.
                {orderInvoice
                  ? ` A fatura existe mas esta marcada como "${orderInvoice.paymentStatus}".`
                  : ' Ainda nao foi emitida nenhuma fatura.'}
              </p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate('/billing')}>
                Ir para Faturacao
              </Button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Status transition bar */}
      {transitions.length > 0 && (
        <GlassCard className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-headline text-sm font-semibold text-on-surface">Proximo passo</p>
              {statusError && <p className="mt-1 text-xs text-error">{statusError}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {transitions.map((next) => (
                <Button
                  key={next.value}
                  size="sm"
                  onClick={() => statusMutation.mutate(next.value)}
                  disabled={statusMutation.isPending}
                >
                  {next.label}
                </Button>
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Diagnosis */}
        <GlassCard className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="font-headline text-lg font-semibold text-on-surface">Diagnostico</p>
              {hasSavedDiagnosis && !diagnosisEditing && (
                <span className="inline-flex items-center gap-1 rounded-full bg-tertiary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-tertiary">
                  <Icon name="check_circle" size={12} /> Guardado
                </span>
              )}
              {diagnosisJustSaved && (
                <span className="text-xs font-medium text-tertiary">Diagnostico guardado.</span>
              )}
            </div>
            {hasSavedDiagnosis && !diagnosisEditing && (
              <Button size="sm" variant="outline" icon={<Icon name="edit" size={14} />} onClick={() => setDiagnosisEditing(true)}>
                Editar
              </Button>
            )}
          </div>

          {diagnosisError && <p className="mb-3 text-sm text-error">{diagnosisError}</p>}

          {hasSavedDiagnosis && !diagnosisEditing ? (
            <div className="space-y-4">
              <DiagnosisRow label="Achados Tecnicos" value={diagnosisForm.technicalFindings} multiline />
              <DiagnosisRow label="Acoes Recomendadas" value={diagnosisForm.recommendedActions} multiline />
              <DiagnosisRow label="Horas Estimadas" value={diagnosisForm.estimatedLaborHours ? `${diagnosisForm.estimatedLaborHours}h` : '—'} />
              {diagnosisForm.notes && <DiagnosisRow label="Notas" value={diagnosisForm.notes} multiline />}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-wider text-on-surface-variant">Achados Tecnicos</label>
                <textarea
                  className="minimalist-input min-h-[80px] resize-y"
                  value={diagnosisForm.technicalFindings}
                  onChange={(e) => setDiagnosisForm((p) => ({ ...p, technicalFindings: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-wider text-on-surface-variant">Acoes Recomendadas</label>
                <textarea
                  className="minimalist-input min-h-[80px] resize-y"
                  value={diagnosisForm.recommendedActions}
                  onChange={(e) => setDiagnosisForm((p) => ({ ...p, recommendedActions: e.target.value }))}
                />
              </div>
              <Input
                label="Horas Estimadas"
                type="number"
                step="0.5"
                value={diagnosisForm.estimatedLaborHours}
                onChange={(e) => setDiagnosisForm((p) => ({ ...p, estimatedLaborHours: e.target.value }))}
              />
              <Input
                label="Notas"
                value={diagnosisForm.notes}
                onChange={(e) => setDiagnosisForm((p) => ({ ...p, notes: e.target.value }))}
              />
              <div className="flex justify-end gap-2">
                {hasSavedDiagnosis && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // restore from saved order
                      if (order?.diagnosis) {
                        setDiagnosisForm({
                          technicalFindings: order.diagnosis.technicalFindings ?? '',
                          recommendedActions: order.diagnosis.recommendedActions ?? '',
                          estimatedLaborHours: order.diagnosis.estimatedLaborHours ?? '',
                          notes: order.diagnosis.notes ?? '',
                        });
                      }
                      setDiagnosisEditing(false);
                      setDiagnosisError('');
                    }}
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => diagnosisMutation.mutate(diagnosisForm)}
                  disabled={diagnosisMutation.isPending || !diagnosisForm.technicalFindings.trim() || !diagnosisForm.recommendedActions.trim()}
                >
                  {diagnosisMutation.isPending ? 'A guardar...' : 'Guardar Diagnostico'}
                </Button>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Interventions */}
        <GlassCard className="p-5">
          {(() => {
            const repairAllowed = order.status === 'in-repair';
            return (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-headline text-lg font-semibold text-on-surface">Intervencoes</p>
                  <Button
                    size="sm"
                    icon={<Icon name="add" size={16} />}
                    onClick={() => { setNewDescription(''); setCreateError(''); setCreateOpen(true); }}
                    disabled={!repairAllowed}
                    title={repairAllowed ? '' : 'Disponivel apenas em reparacao'}
                  >
                    Nova
                  </Button>
                </div>

                {!repairAllowed && (
                  <div className="mb-4 flex items-start gap-3 rounded-lg border border-outline-variant/20 bg-surface-low/40 p-3">
                    <Icon name="lock" size={18} className="mt-0.5 shrink-0 text-on-surface-variant" />
                    <p className="text-xs text-on-surface-variant">
                      As intervencoes so podem ser iniciadas quando a ordem estiver no estado <span className="font-semibold text-on-surface">"Em Reparacao"</span>. Estado atual: <StatusBadge status={order.status} />.
                    </p>
                  </div>
                )}

                {interventionsQuery.isPending ? (
                  <p className="text-sm text-on-surface-variant">A carregar...</p>
                ) : interventions.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">
                    {repairAllowed
                      ? 'Sem intervencoes registadas. Clique em "Nova" para comecar.'
                      : 'Sem intervencoes registadas.'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {interventions.map((intervention) => {
                      const liveSeconds = computeLiveSeconds(intervention);
                      const canControlTimer = repairAllowed;
                      return (
                        <div key={intervention.id} className="rounded-lg bg-surface-low/60 px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-on-surface">{intervention.description}</p>
                              <p className="mt-0.5 flex items-center gap-2 text-xs text-on-surface-variant">
                                <span className={`font-mono font-semibold ${intervention.timerState === 'running' ? 'text-tertiary' : ''}`}>
                                  {formatElapsedTime(liveSeconds)}
                                </span>
                                <StatusBadge status={intervention.timerState ?? 'idle'} />
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              {(intervention.timerState === 'idle' || intervention.timerState === 'paused') && (
                                <button
                                  onClick={() => timerMutation.mutate({ interventionId: intervention.id!, action: 'start' })}
                                  className="rounded-md p-1.5 text-tertiary transition hover:bg-surface-highest disabled:cursor-not-allowed disabled:opacity-40"
                                  disabled={!canControlTimer}
                                  title={canControlTimer ? 'Iniciar timer' : 'Disponivel apenas em reparacao'}
                                >
                                  <Icon name="play_circle" size={20} />
                                </button>
                              )}
                              {intervention.timerState === 'running' && (
                                <>
                                  <button
                                    onClick={() => timerMutation.mutate({ interventionId: intervention.id!, action: 'pause' })}
                                    className="rounded-md p-1.5 text-primary transition hover:bg-surface-highest"
                                  >
                                    <Icon name="pause_circle" size={20} />
                                  </button>
                                  <button
                                    onClick={() => timerMutation.mutate({ interventionId: intervention.id!, action: 'stop' })}
                                    className="rounded-md p-1.5 text-error transition hover:bg-surface-highest"
                                  >
                                    <Icon name="stop_circle" size={20} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          <InterventionParts
                            interventionId={intervention.id!}
                            canEdit={repairAllowed}
                            onAdd={() => {
                              setPartInterventionId(intervention.id!);
                              setPartForm({ partReference: '', quantity: '1', note: '' });
                              setPartError('');
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </GlassCard>
      </div>

      {/* Attach Part Modal */}
      <Modal open={!!partInterventionId} onClose={() => setPartInterventionId(null)} title="Adicionar Peca Usada">
        <div className="space-y-4">
          {partError && <p className="text-sm text-error">{partError}</p>}
          <Select
            label="Peca"
            value={partForm.partReference}
            onChange={(e) => setPartForm((p) => ({ ...p, partReference: e.target.value }))}
            options={partOptions}
          />
          <Input
            label="Quantidade"
            type="number"
            min="1"
            value={partForm.quantity}
            onChange={(e) => setPartForm((p) => ({ ...p, quantity: e.target.value }))}
          />
          <Input
            label="Nota (opcional)"
            value={partForm.note}
            onChange={(e) => setPartForm((p) => ({ ...p, note: e.target.value }))}
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setPartInterventionId(null)}>Cancelar</Button>
          <Button
            onClick={() => {
              const qty = parseInt(partForm.quantity, 10);
              if (!partForm.partReference || !Number.isFinite(qty) || qty < 1) {
                setPartError('Selecione uma peca e indique uma quantidade valida.');
                return;
              }
              attachPartMutation.mutate({
                interventionId: partInterventionId!,
                partReference: partForm.partReference,
                quantity: qty,
                note: partForm.note || undefined,
              });
            }}
            disabled={attachPartMutation.isPending || !partForm.partReference}
          >
            {attachPartMutation.isPending ? 'A adicionar...' : 'Adicionar Peca'}
          </Button>
        </div>
      </Modal>

      {/* Create Intervention */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nova Intervencao">
        <div className="space-y-4">
          {createError && <p className="text-sm text-error">{createError}</p>}
          <Input
            label="Descricao do trabalho"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button
            onClick={() => createInterventionMutation.mutate(newDescription)}
            disabled={createInterventionMutation.isPending || !newDescription.trim()}
          >
            {createInterventionMutation.isPending ? 'A criar...' : 'Criar Intervencao'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function InterventionParts({
  interventionId,
  canEdit,
  onAdd,
}: {
  interventionId: string;
  canEdit: boolean;
  onAdd: () => void;
}) {
  const partsQuery = useQuery({
    queryKey: ['intervention-parts', interventionId],
    queryFn: () => fetchInterventionParts(interventionId),
  });

  const parts = partsQuery.data ?? [];

  return (
    <div className="mt-3 border-t border-outline-variant/15 pt-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
          Pecas usadas {parts.length > 0 && <span className="text-on-surface">({parts.length})</span>}
        </p>
        <button
          onClick={onAdd}
          disabled={!canEdit}
          className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-primary transition hover:bg-surface-highest disabled:cursor-not-allowed disabled:opacity-40"
          title={canEdit ? 'Adicionar peca' : 'Disponivel apenas em reparacao'}
        >
          <Icon name="add" size={14} />
          Adicionar
        </button>
      </div>
      {partsQuery.isPending ? (
        <p className="text-xs text-on-surface-variant">A carregar...</p>
      ) : parts.length === 0 ? (
        <p className="text-xs text-on-surface-variant">Nenhuma peca registada.</p>
      ) : (
        <div className="space-y-1">
          {parts.map((p) => (
            <div key={`${p.partReference}-${p.note ?? ''}`} className="flex items-center justify-between rounded-md bg-surface-low/40 px-2 py-1 text-xs">
              <span className="font-mono text-on-surface">{p.partReference}</span>
              {p.note && <span className="mx-2 flex-1 truncate text-on-surface-variant">{p.note}</span>}
              <span className="font-semibold text-on-surface">x{p.quantity}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DiagnosisRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">{label}</p>
      <p className={`mt-1 text-sm text-on-surface ${multiline ? 'whitespace-pre-wrap' : ''}`}>{value || '—'}</p>
    </div>
  );
}
