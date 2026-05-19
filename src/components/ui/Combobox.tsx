'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
}

interface ComboboxProps {
  label?: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  loading?: boolean;
  placeholder?: string;
  emptyHint?: string;
  allowFreeText?: boolean;
}

export function Combobox({
  label,
  hint,
  value,
  onChange,
  options,
  loading,
  placeholder,
  emptyHint,
  allowFreeText = true,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [highlight, setHighlight] = React.useState(0);
  const id = React.useId();

  // Sync external value into query when not editing
  React.useEffect(() => {
    if (!open) setQuery(value);
  }, [value, open]);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(value);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, value]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 200);
    return options
      .filter(
        (o) =>
          o.value.toLowerCase().includes(q) ||
          o.label.toLowerCase().includes(q) ||
          (o.description?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 200);
  }, [options, query]);

  React.useEffect(() => {
    setHighlight(0);
  }, [query]);

  function selectOption(opt: ComboboxOption) {
    onChange(opt.value);
    setQuery(opt.value);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && filtered[highlight]) {
        selectOption(filtered[highlight]);
      } else if (allowFreeText) {
        onChange(query);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery(value);
    }
  }

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-neutral-800">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (allowFreeText) onChange(e.target.value);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          className={cn(
            'h-10 w-full rounded-lg border border-border bg-white pl-3 pr-9 text-sm',
            'placeholder:text-neutral-400',
            'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
          )}
        />
        <button
          type="button"
          onClick={() => {
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
          className="absolute inset-y-0 right-2 flex items-center text-neutral-400 hover:text-neutral-600"
          tabIndex={-1}
          aria-label="Toggle options"
        >
          {loading ? (
            <Spinner size={14} />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-white shadow-lg">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-sm text-neutral-500">
                <Spinner size={14} className="mr-2" /> Memuat model...
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-neutral-500">
                {emptyHint ?? 'Tidak ada hasil'}
              </div>
            ) : (
              <ul role="listbox">
                {filtered.map((opt, i) => (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={value === opt.value}
                    onMouseDown={(e) => {
                      // mousedown beats blur, so selection happens
                      e.preventDefault();
                      selectOption(opt);
                    }}
                    onMouseEnter={() => setHighlight(i)}
                    className={cn(
                      'cursor-pointer px-3 py-2 text-sm border-l-2 border-transparent',
                      i === highlight ? 'bg-primary-50 border-primary' : 'hover:bg-neutral-50',
                      value === opt.value && 'font-medium',
                    )}
                  >
                    <div className="truncate font-mono text-[12.5px]">{opt.value}</div>
                    {opt.label && opt.label !== opt.value && (
                      <div className="text-xs text-neutral-500 truncate">{opt.label}</div>
                    )}
                    {opt.description && (
                      <div className="text-[11px] text-neutral-400 mt-0.5 line-clamp-2">
                        {opt.description}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      {hint && <span className="text-xs text-neutral-500">{hint}</span>}
    </div>
  );
}
