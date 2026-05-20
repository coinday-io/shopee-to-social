'use client';

import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { ReplizAccount, SocialPlatform } from '@/lib/types';
import { cn, platformColor, platformLabel } from '@/lib/utils';

interface Props {
  month: Date;
  accounts: ReplizAccount[];
  accountFilter: string[];
  platformFilter: 'all' | SocialPlatform;
  onChangeMonth: (month: Date) => void;
  onChangeAccountFilter: (ids: string[]) => void;
  onChangePlatformFilter: (p: 'all' | SocialPlatform) => void;
  onRefresh: () => void;
  loading: boolean;
  eventCount: number;
}

const PLATFORM_TABS: Array<'all' | SocialPlatform> = [
  'all',
  'facebook',
  'threads',
  'instagram',
  'tiktok',
];

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function ScheduleCalendarHeader({
  month,
  accounts,
  accountFilter,
  platformFilter,
  onChangeMonth,
  onChangeAccountFilter,
  onChangePlatformFilter,
  onRefresh,
  loading,
  eventCount,
}: Props) {
  const [accountMenuOpen, setAccountMenuOpen] = React.useState(false);
  const accountMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!accountMenuOpen) return;
    function handler(e: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [accountMenuOpen]);

  function toggleAccount(id: string) {
    onChangeAccountFilter(
      accountFilter.includes(id)
        ? accountFilter.filter((x) => x !== id)
        : [...accountFilter, id],
    );
  }

  const monthLabel = month.toLocaleString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3">
      {/* Left: Account + platform filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Account dropdown */}
        <div className="relative" ref={accountMenuRef}>
          <button
            type="button"
            onClick={() => setAccountMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Account
            {accountFilter.length > 0 && (
              <span className="ml-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                {accountFilter.length}
              </span>
            )}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {accountMenuOpen && (
            <div className="absolute left-0 top-full z-30 mt-1 w-72 overflow-hidden rounded-lg border border-border bg-white shadow-lg">
              <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs">
                <span className="font-medium">
                  {accountFilter.length === 0
                    ? `Semua akun (${accounts.length})`
                    : `${accountFilter.length} dipilih`}
                </span>
                {accountFilter.length > 0 && (
                  <button
                    onClick={() => onChangeAccountFilter([])}
                    className="text-primary hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto p-1">
                {accounts.length === 0 && (
                  <div className="py-4 text-center text-sm text-neutral-500">
                    Tidak ada akun.
                  </div>
                )}
                {accounts.map((a) => {
                  const checked = accountFilter.includes(a.id);
                  return (
                    <label
                      key={a.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
                        checked ? 'bg-primary-50' : 'hover:bg-neutral-50',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAccount(a.id)}
                        className="h-4 w-4 accent-primary"
                      />
                      {a.picture ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={a.picture} alt="" className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-neutral-200" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium">{a.name}</div>
                        <div className="truncate text-[10px] text-neutral-500">@{a.username}</div>
                      </div>
                      <span className={cn('rounded px-1 py-0.5 text-[9px] font-bold uppercase', platformColor(a.type))}>
                        {a.type}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Platform tabs */}
        <div className="flex items-center gap-1">
          {PLATFORM_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onChangePlatformFilter(tab)}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium border transition-colors',
                platformFilter === tab
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white border-border text-neutral-700 hover:bg-neutral-50',
              )}
            >
              {tab === 'all' ? 'Semua' : platformLabel(tab)}
            </button>
          ))}
        </div>

        <span className="text-xs text-neutral-500">
          {loading ? 'Loading...' : `${eventCount} event`}
        </span>
      </div>

      {/* Right: Month nav + today */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChangeMonth(addMonths(month, -1))}
          aria-label="Previous month"
          className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="min-w-[140px] text-center text-sm font-semibold capitalize">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={() => onChangeMonth(addMonths(month, 1))}
          aria-label="Next month"
          className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChangeMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
        >
          Today
        </Button>
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading} title="Refresh">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
