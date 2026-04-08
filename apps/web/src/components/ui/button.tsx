import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

import { cn } from '@/lib/utils/cn';

export function Button({
  className,
  children,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-2xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
