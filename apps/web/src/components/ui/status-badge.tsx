import { cn } from '@/lib/utils/cn';

const statusStyles = {
  critico: 'bg-error-container text-on-error-container',
  limiar: 'bg-secondary-container text-on-secondary-container',
  estavel: 'bg-on-tertiary text-tertiary-fixed',
  em_reparacao: 'bg-secondary-container text-on-secondary-container',
  'in-repair': 'bg-secondary-container text-on-secondary-container',
  'in-diagnosis': 'bg-surface-bright text-on-surface',
  'awaiting-customer-approval': 'bg-surface-highest text-on-surface-variant',
  'awaiting-parts': 'bg-secondary-container text-on-secondary-container',
  received: 'bg-surface-highest text-on-surface-variant',
  requested: 'bg-surface-highest text-on-surface-variant',
  concluido: 'bg-on-tertiary text-tertiary-fixed',
  completed: 'bg-on-tertiary text-tertiary-fixed',
  delivered: 'bg-on-tertiary text-tertiary-fixed',
  pendente: 'bg-surface-highest text-on-surface-variant',
  pending: 'bg-surface-highest text-on-surface-variant',
  urgente: 'bg-error-container text-on-error-container',
  diagnostico: 'bg-surface-bright text-on-surface',
  pago: 'bg-on-tertiary text-tertiary-fixed',
  paid: 'bg-on-tertiary text-tertiary-fixed',
  vencido: 'bg-error-container text-on-error-container',
  overdue: 'bg-error-container text-on-error-container',
  ativo: 'bg-on-tertiary text-tertiary-fixed',
  inativo: 'bg-surface-highest text-on-surface-variant',
  idle: 'bg-surface-highest text-on-surface-variant',
  running: 'bg-secondary-container text-on-secondary-container',
  paused: 'bg-surface-bright text-on-surface',
  stopped: 'bg-on-tertiary text-tertiary-fixed',
} as const;

type StatusBadgeProps = {
  status: keyof typeof statusStyles;
  label?: string;
  className?: string;
};

const defaultLabels: Record<keyof typeof statusStyles, string> = {
  critico: 'Critico',
  limiar: 'Limiar',
  estavel: 'Estavel',
  em_reparacao: 'Em Reparacao',
  'in-repair': 'Em Reparacao',
  'in-diagnosis': 'Em Diagnostico',
  'awaiting-customer-approval': 'Aguardar Aprovacao Cliente',
  'awaiting-parts': 'Aguardar Pecas',
  received: 'Recebido',
  requested: 'Solicitado',
  concluido: 'Concluido',
  completed: 'Concluido',
  delivered: 'Entregue',
  pendente: 'Pendente',
  pending: 'Pendente',
  urgente: 'Urgente',
  diagnostico: 'Diagnostico',
  pago: 'Pago',
  paid: 'Pago',
  vencido: 'Vencido',
  overdue: 'Vencido',
  ativo: 'Ativo',
  inativo: 'Inativo',
  idle: 'Parado',
  running: 'Em Curso',
  paused: 'Pausado',
  stopped: 'Terminado',
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide',
        statusStyles[status],
        className,
      )}
    >
      {label ?? defaultLabels[status]}
    </span>
  );
}
