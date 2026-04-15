import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ eyebrow, title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex items-start justify-between gap-6', className)}>
      <div className="space-y-1.5">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="font-headline text-2xl font-semibold text-on-surface text-balance">
          {title}
        </h1>
        {subtitle && (
          <p className="max-w-xl text-sm leading-relaxed text-on-surface-variant">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </header>
  );
}
