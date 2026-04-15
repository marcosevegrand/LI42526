import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

const variants = {
  primary:
    'bg-primary text-on-primary font-semibold hover:brightness-110',
  secondary:
    'bg-surface-high text-on-surface font-medium hover:bg-surface-highest',
  ghost:
    'bg-transparent text-on-surface-variant font-medium hover:bg-surface-high/50',
  danger:
    'bg-error-container text-on-error-container font-semibold hover:brightness-110',
  outline:
    'bg-transparent border border-outline-variant/30 text-on-surface font-medium hover:bg-surface-high/50',
} as const;

const sizes = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-md',
  md: 'px-4 py-2 text-sm gap-2 rounded-lg',
  lg: 'px-6 py-3 text-base gap-2.5 rounded-xl',
} as const;

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: keyof typeof variants;
    size?: keyof typeof sizes;
    icon?: ReactNode;
  }
>;

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center transition-all duration-200',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
