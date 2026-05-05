import { useEffect, useId, useRef, useState } from 'react';

import { cn } from '@/lib/utils/cn';

import { Icon } from './icon';

type Option = { value: string; label: string };

type SelectProps = {
  label?: string;
  error?: string;
  options: Option[];
  value?: string;
  defaultValue?: string;
  onChange?: (event: { target: { value: string } }) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
};

export function Select({
  label,
  error,
  options,
  value,
  defaultValue,
  onChange,
  placeholder = 'Selecionar...',
  disabled,
  className,
  id,
  name,
}: SelectProps) {
  const autoId = useId();
  const selectId = id ?? `select-${autoId}`;
  const errorId = error ? `${selectId}-error` : undefined;

  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const currentValue = isControlled ? value : internalValue;

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === currentValue);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const select = (val: string) => {
    if (!isControlled) setInternalValue(val);
    onChange?.({ target: { value: val } });
    setOpen(false);
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-medium uppercase tracking-wider text-on-surface-variant"
        >
          {label}
        </label>
      )}

      <div ref={containerRef} className="relative">
        <button
          type="button"
          id={selectId}
          name={name}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          onClick={() => !disabled && setOpen((p) => !p)}
          className={cn(
            'minimalist-input flex w-full cursor-pointer items-center justify-between gap-2 text-left',
            error && 'border-b-error',
            disabled && 'cursor-not-allowed opacity-50',
            className,
          )}
        >
          <span className={cn('truncate', !selected && 'text-on-surface-variant/60')}>
            {selected?.label ?? placeholder}
          </span>
          <Icon
            name="expand_more"
            size={18}
            className={cn('shrink-0 text-on-surface-variant transition-transform', open && 'rotate-180')}
          />
        </button>

        {open && (
          <ul
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            className={cn(
              'absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-xl p-1 shadow-ambient-lg',
              'glass-card ring-1 ring-white/5',
            )}
          >
            {options.length === 0 ? (
              <li className="px-3 py-2 text-sm text-on-surface-variant">Sem opcoes disponiveis.</li>
            ) : (
              options.map((opt) => {
                const isSelected = opt.value === currentValue;
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => select(opt.value)}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition',
                      isSelected
                        ? 'bg-primary/15 text-primary'
                        : 'text-on-surface hover:bg-surface-highest/60',
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Icon name="check" size={16} className="shrink-0" />}
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>

      {error && (
        <p id={errorId} role="alert" aria-live="assertive" className="text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}

Select.displayName = 'Select';
