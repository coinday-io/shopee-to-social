'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, id, ...rest },
  ref,
) {
  const inputId = id ?? React.useId();
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-neutral-800">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'h-10 w-full rounded-lg border border-border bg-white px-3 text-sm',
          'placeholder:text-neutral-400',
          'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/30',
          className,
        )}
        {...rest}
      />
      {hint && !error && <span className="text-xs text-neutral-500">{hint}</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
});

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, id, ...rest },
  ref,
) {
  const textareaId = id ?? React.useId();
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-neutral-800">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        className={cn(
          'min-h-[80px] w-full rounded-lg border border-border bg-white px-3 py-2 text-sm',
          'placeholder:text-neutral-400',
          'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
          error && 'border-red-500',
          className,
        )}
        {...rest}
      />
      {hint && !error && <span className="text-xs text-neutral-500">{hint}</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
});
