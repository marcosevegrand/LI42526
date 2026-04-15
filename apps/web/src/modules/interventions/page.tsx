import { interventionSchema, serviceOrderStatuses } from '@gengis-khan/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { ApiError, apiFetch } from '@/lib/api/http-client';
import { useSessionStore } from '@/store/session-store';

type ApiIntervention = z.infer<typeof interventionSchema>;

const interventionPartSchema = z.object({
  partReference: z.string(),
  quantity: z.number(),
  note: z.string().optional(),
});

type InterventionPart = z.infer<typeof interventionPartSchema>;

const serviceOrderSchema = z.object({
  id: z.string(),
  serviceOrderNumber: z.number(),
  customerNif: z.string(),
  scooterSerialNumber: z.string(),
  reportedProblem: z.string(),
  status: z.enum(serviceOrderStatuses),
  createdAt: z.string(),
});

type ApiServiceOrder = z.infer<typeof serviceOrderSchema>;

function formatElapsedTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Computes live elapsed seconds for a running intervention */
function computeLiveSeconds(intervention: ApiIntervention): number {
  const base = intervention.elapsedSeconds ?? 0;
  if (intervention.timerState !== 'running' || !intervention.timerStartedAt) {
    return base;
  }
  const startedAt = new Date(intervention.timerStartedAt).getTime();
  const delta = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  return base + delta;
}

/** Hook that ticks every second while any intervention is running */
function useLiveTick(interventions: ApiIntervention[]): number {
  const [tick, setTick] = useState(0);
  const hasRunning = interventions.some((i) => i.timerState === 'running');

  useEffect(() => {
    if (!hasRunning) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [hasRunning]);

  return tick;
}

async function fetchServiceOrders(): Promise<ApiServiceOrder[]> {
  const response = await apiFetch<unknown>('/service-orders?limit=100');
  return z.array(serviceOrderSchema).parse(response);
}

async function fetchInterventions(serviceOrderId: string): Promise<ApiIntervention[]> {
  const response = await apiFetch<unknown>(`/service-orders/${serviceOrderId}/interventions`);
  return z.array(interventionSchema).parse(response);
}

async function fetchInterventionParts(interventionId: string): Promise<InterventionPart[]> {
  const response = await apiFetch<unknown>(`/interventions/${interventionId}/parts`);
  return z.array(interventionPartSchema).parse(response);
}

export function InterventionsPage() {
  const queryClient = useQueryClient();
  const user = useSessionStore((s) => s.user);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedInterventionId, setSelectedInterventionId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [createError, setCreateError] = useState('');

  const serviceOrdersQuery = useQuery({
    queryKey: ['service-orders', 'list'],
    queryFn: fetchServiceOrders,
  });

  const activeOrders = useMemo(
    () => (serviceOrdersQuery.data ?? []).filter(
      (so) => so.status === 'in-repair' || so.status === 'in-diagnosis',
    ),
    [serviceOrdersQuery.data],
  );

  const interventionsQuery = useQuery({
    queryKey: ['interventions', selectedOrderId],
    queryFn: () => fetchInterventions(selectedOrderId!),
    enabled: !!selectedOrderId,
  });

  const partsQuery = useQuery({
    queryKey: ['intervention-parts', selectedInterventionId],
    queryFn: () => fetchInterventionParts(selectedInterventionId!),
    enabled: !!selectedInterventionId,
  });

  const timerMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'start' | 'pause' | 'stop' }) => {
      const response = await apiFetch<unknown>(`/interventions/${id}/timer/${action}`, {
        method: 'POST',
      });
      return interventionSchema.parse(response);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['interventions', selectedOrderId] });
    },
  });

  const createInterventionMutation = useMutation({
    mutationFn: async ({ serviceOrderId, description }: { serviceOrderId: string; description: string }) => {
      const response = await apiFetch<unknown>(`/service-orders/${serviceOrderId}/interventions`, {
        method: 'POST',
        body: JSON.stringify({
          description,
          mechanicUserId: user?.id ?? '',
        }),
      });
      return interventionSchema.parse(response);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['interventions', selectedOrderId] });
      setCreateOpen(false);
      setNewDescription('');
      setCreateError('');
    },
    onError: (err) => {
      setCreateError(err instanceof ApiError ? err.message : 'Erro ao criar intervencao.');
    },
  });

  const interventions = interventionsQuery.data ?? [];
  const selectedIntervention = interventions.find((i) => i.id === selectedInterventionId);
  const parts = partsQuery.data ?? [];

  // Live tick — triggers re-render every second while a timer is running
  useLiveTick(interventions);

  const queryError = serviceOrdersQuery.error;
  const errorMessage = queryError instanceof ApiError
    ? queryError.message
    : 'Nao foi possivel carregar as ordens.';

  if (!selectedOrderId) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Intervencao Ativa"
          title="Registo de Intervencao"
          subtitle="Selecione uma ordem de servico ativa para gerir intervencoes."
        />

        {queryError ? (
          <div className="glass-card rounded-xl p-6">
            <p className="text-sm text-on-surface-variant">{errorMessage}</p>
            <Button className="mt-4" variant="outline" onClick={() => { void serviceOrdersQuery.refetch(); }}>
              Tentar novamente
            </Button>
          </div>
        ) : serviceOrdersQuery.isPending ? (
          <GlassCard className="p-8 text-center text-sm text-on-surface-variant">
            A carregar ordens de servico...
          </GlassCard>
        ) : activeOrders.length === 0 ? (
          <GlassCard className="p-8 text-center text-sm text-on-surface-variant">
            Nenhuma ordem de servico ativa encontrada.
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <GlassCard
                key={order.id}
                className="cursor-pointer p-5 transition hover:ring-1 hover:ring-primary/30"
                onClick={() => {
                  setSelectedOrderId(order.id);
                  setSelectedInterventionId(null);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-headline text-lg font-semibold text-on-surface">
                      OS-{String(order.serviceOrderNumber).padStart(4, '0')}
                    </p>
                    <p className="mt-1 text-sm text-on-surface-variant">{order.reportedProblem}</p>
                    <p className="text-xs text-on-surface-variant">Scooter: {order.scooterSerialNumber}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    );
  }

  const currentOrder = activeOrders.find((o) => o.id === selectedOrderId) ??
    (serviceOrdersQuery.data ?? []).find((o) => o.id === selectedOrderId);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Intervencao Ativa"
        title={`OS-${currentOrder ? String(currentOrder.serviceOrderNumber).padStart(4, '0') : '...'}`}
        subtitle={currentOrder?.reportedProblem ?? 'A carregar...'}
        actions={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setSelectedOrderId(null); setSelectedInterventionId(null); }}>
              Voltar
            </Button>
            <Button icon={<Icon name="add" size={18} />} onClick={() => { setNewDescription(''); setCreateError(''); setCreateOpen(true); }}>
              Nova Intervencao
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
        {/* Left column — Interventions list */}
        <div className="space-y-6">
          <GlassCard className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-headline text-lg font-semibold text-on-surface">
                Intervencoes
              </p>
            </div>

            {interventionsQuery.isPending ? (
              <p className="text-sm text-on-surface-variant">A carregar...</p>
            ) : interventions.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Nenhuma intervencao registada.</p>
            ) : (
              <div className="space-y-3">
                {interventions.map((intervention) => {
                  const liveSeconds = computeLiveSeconds(intervention);
                  return (
                    <div
                      key={intervention.id}
                      onClick={() => setSelectedInterventionId(intervention.id ?? null)}
                      className={`cursor-pointer rounded-lg px-4 py-3 transition ${
                        selectedInterventionId === intervention.id
                          ? 'bg-primary/10 ring-1 ring-primary/30'
                          : 'bg-surface-low/60 hover:bg-surface-low'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-on-surface">
                            {intervention.description}
                          </p>
                          <p className="text-xs text-on-surface-variant">
                            Tempo:{' '}
                            <span className={`font-mono font-semibold ${intervention.timerState === 'running' ? 'text-tertiary' : ''}`}>
                              {formatElapsedTime(liveSeconds)}
                            </span>
                            {' — '}
                            <StatusBadge status={intervention.timerState ?? 'idle'} />
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {(intervention.timerState === 'idle' || intervention.timerState === 'paused') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                timerMutation.mutate({ id: intervention.id!, action: 'start' });
                              }}
                              className="rounded-md p-1.5 text-tertiary transition hover:bg-surface-highest"
                            >
                              <Icon name="play_circle" size={20} />
                            </button>
                          )}
                          {intervention.timerState === 'running' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  timerMutation.mutate({ id: intervention.id!, action: 'pause' });
                                }}
                                className="rounded-md p-1.5 text-primary transition hover:bg-surface-highest"
                              >
                                <Icon name="pause_circle" size={20} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  timerMutation.mutate({ id: intervention.id!, action: 'stop' });
                                }}
                                className="rounded-md p-1.5 text-error transition hover:bg-surface-highest"
                              >
                                <Icon name="stop_circle" size={20} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right column — Selected intervention details */}
        <div className="space-y-6">
          {selectedIntervention ? (
            <>
              <GlassCard className="p-5">
                <p className="mb-4 font-headline text-lg font-semibold text-on-surface">
                  Detalhes da Intervencao
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <p className="text-xs uppercase tracking-wider text-on-surface-variant">Descricao</p>
                    <p className="text-sm font-medium text-on-surface">{selectedIntervention.description}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-xs uppercase tracking-wider text-on-surface-variant">Tempo Decorrido</p>
                    <p className={`font-mono text-lg font-bold ${selectedIntervention.timerState === 'running' ? 'text-tertiary' : 'text-primary'}`}>
                      {formatElapsedTime(computeLiveSeconds(selectedIntervention))}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs uppercase tracking-wider text-on-surface-variant">Estado Timer</p>
                    <StatusBadge status={selectedIntervention.timerState ?? 'idle'} />
                  </div>
                  {selectedIntervention.notes && (
                    <div className="flex justify-between">
                      <p className="text-xs uppercase tracking-wider text-on-surface-variant">Notas</p>
                      <p className="text-sm text-on-surface">{selectedIntervention.notes}</p>
                    </div>
                  )}
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <p className="mb-4 font-headline text-lg font-semibold text-on-surface">
                  Pecas Utilizadas
                </p>
                {partsQuery.isPending ? (
                  <p className="text-sm text-on-surface-variant">A carregar pecas...</p>
                ) : parts.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">Nenhuma peca associada.</p>
                ) : (
                  <div className="space-y-3">
                    {parts.map((part) => (
                      <div
                        key={part.partReference}
                        className="flex items-center justify-between rounded-lg bg-surface-low/60 px-4 py-3"
                      >
                        <p className="text-sm font-medium text-on-surface">{part.partReference}</p>
                        <span className="font-mono text-sm font-semibold text-on-surface">
                          x{part.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </>
          ) : (
            <GlassCard className="p-8 text-center text-sm text-on-surface-variant">
              Selecione uma intervencao para ver os detalhes.
            </GlassCard>
          )}
        </div>
      </div>

      {/* Create Intervention Modal */}
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
            onClick={() => createInterventionMutation.mutate({ serviceOrderId: selectedOrderId!, description: newDescription })}
            disabled={createInterventionMutation.isPending || !newDescription.trim()}
          >
            {createInterventionMutation.isPending ? 'A criar...' : 'Criar Intervencao'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
