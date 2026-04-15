import type { HTMLAttributes, PropsWithChildren } from 'react';

import { cn } from '@/lib/utils/cn';

type GlassCardProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & {
    variant?: 'card' | 'panel' | 'solid';
  }
>;

const variantStyles = {
  card: 'glass-card rounded-xl',
  panel: 'glass-panel rounded-xl',
  solid: 'bg-surface-high rounded-xl',
} as const;

export function GlassCard({
  variant = 'card',
  className,
  children,
  ...props
}: GlassCardProps) {
  return (
    <div className={cn(variantStyles[variant], className)} {...props}>
      {children}
    </div>
  );
}
