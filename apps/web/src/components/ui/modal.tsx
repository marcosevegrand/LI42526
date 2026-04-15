import { type PropsWithChildren, useEffect } from 'react';

import { cn } from '@/lib/utils/cn';

import { Icon } from './icon';

type ModalProps = PropsWithChildren<{
  open: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
}>;

export function Modal({ open, onClose, title, className, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-surface-dim/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Content */}
      <div
        className={cn(
          'glass-card relative z-10 w-full max-w-lg rounded-xl p-6 shadow-ambient-lg',
          className,
        )}
      >
        {title && (
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-headline text-lg font-semibold text-on-surface">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-on-surface-variant transition hover:bg-surface-highest hover:text-on-surface"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
