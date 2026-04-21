import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium uppercase tracking-wider text-on-surface-variant"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={cn('minimalist-input', error && 'border-b-error', className)}
          {...props}
        />
        {error && (
          <p id={errorId} role="alert" aria-live="assertive" className="text-xs text-error">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
