'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, className, id, children, ...rest },
  ref,
) {
  const selectId = id ?? React.useId();
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-neutral-800">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={cn(
          'h-10 w-full rounded-lg border border-border bg-white px-3 text-sm',
          'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      {hint && <span className="text-xs text-neutral-500">{hint}</span>}
    </div>
  );
});
