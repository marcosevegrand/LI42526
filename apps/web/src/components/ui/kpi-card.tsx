import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

import { GlassCard } from './glass-card';
import { Icon } from './icon';

type KPICardProps = {
  label: string;
  value: string | number;
  icon?: string;
  trend?: { value: string; positive: boolean };
  className?: string;
  children?: ReactNode;
};

export function KPICard({ label, value, icon, trend, className, children }: KPICardProps) {
  return (
    <GlassCard className={cn('p-5 space-y-3', className)}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
          {label}
        </p>
        {icon && (
          <Icon name={icon} className="text-primary/60" size={20} />
        )}
      </div>

      <div className="flex items-end gap-3">
        <p className="font-headline text-2xl font-semibold text-on-surface">
          {value}
        </p>
        {trend && (
          <span
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              trend.positive ? 'text-tertiary' : 'text-error',
            )}
          >
            <Icon
              name={trend.positive ? 'trending_up' : 'trending_down'}
              size={14}
            />
            {trend.value}
          </span>
        )}
      </div>

      {children}
    </GlassCard>
  );
}
