import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';

import { Icon } from '@/components/ui/icon';
import { apiFetch } from '@/lib/api/http-client';
import { cn } from '@/lib/utils/cn';

const notificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  recipientEmail: z.string(),
  subject: z.string(),
  body: z.string().optional().default(''),
  deliveryStatus: z.string(),
  triggerSource: z.string().optional(),
  createdAt: z.string(),
});

type ApiNotification = z.infer<typeof notificationSchema>;

async function fetchNotifications(): Promise<ApiNotification[]> {
  const response = await apiFetch<unknown>('/notifications');
  return z.array(notificationSchema).parse(response);
}

const typeIcons: Record<string, string> = {
  reception_confirmation: 'inventory_2',
  budget_request: 'request_quote',
  repair_completed: 'task_alt',
  awaiting_parts_delay: 'hourglass_top',
};

const typeLabels: Record<string, string> = {
  reception_confirmation: 'Rececao',
  budget_request: 'Orcamento',
  repair_completed: 'Concluida',
  awaiting_parts_delay: 'Aguarda pecas',
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return 'Agora';
  if (minutes < 60) return `Ha ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Ha ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Ha ${days}d`;
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const query = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: fetchNotifications,
    refetchInterval: 30_000,
  });

  const notifications = query.data ?? [];

  // recent = last 24h, used as a soft "unread" indicator
  const recentCount = notifications.filter(
    (n) => Date.now() - new Date(n.createdAt).getTime() < 24 * 60 * 60_000,
  ).length;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative rounded-lg p-2 text-on-surface-variant transition hover:bg-surface-high hover:text-on-surface"
        title="Notificacoes"
      >
        <Icon name="notifications" size={22} />
        {recentCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-on-primary">
            {recentCount > 9 ? '9+' : recentCount}
          </span>
        )}
      </button>

      {open && (
        <div className="glass-card absolute right-0 top-full z-[60] mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-xl p-2 shadow-ambient-lg ring-1 ring-white/5">
          <div className="flex items-center justify-between px-3 py-2">
            <p className="font-headline text-sm font-semibold text-on-surface">Notificacoes</p>
            <span className="text-xs text-on-surface-variant">{notifications.length} no total</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {query.isPending ? (
              <p className="px-3 py-6 text-center text-sm text-on-surface-variant">A carregar...</p>
            ) : notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-on-surface-variant">Sem notificacoes ainda.</p>
            ) : (
              <ul className="space-y-1">
                {notifications.slice(0, 20).map((n) => (
                  <li key={n.id} className="rounded-lg px-3 py-2 transition hover:bg-surface-highest/50">
                    <div className="flex items-start gap-3">
                      <Icon name={typeIcons[n.type] ?? 'mail'} size={18} className="mt-0.5 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-on-surface">{n.subject}</p>
                          <span className="shrink-0 text-[10px] text-on-surface-variant">{timeAgo(n.createdAt)}</span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-on-surface-variant">
                          {typeLabels[n.type] ?? n.type} · {n.recipientEmail}
                        </p>
                        <span className={cn(
                          'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                          n.deliveryStatus === 'sent'
                            ? 'bg-tertiary/15 text-tertiary'
                            : n.deliveryStatus === 'failed'
                              ? 'bg-error/15 text-error'
                              : 'bg-surface-highest text-on-surface-variant',
                        )}>
                          {n.deliveryStatus}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
