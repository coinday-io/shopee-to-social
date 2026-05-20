'use client';

import * as React from 'react';
import toast from 'react-hot-toast';
import { Spinner } from '@/components/ui/Spinner';
import { ReplizAccount, ReplizScheduleItem, SocialPlatform } from '@/lib/types';
import { fetchJson } from '@/lib/fetch-client';
import { ScheduleEventCard } from './ScheduleEventCard';
import { ScheduleCalendarHeader } from './ScheduleCalendarHeader';
import { ScheduleDetailModal } from './ScheduleDetailModal';

interface ScheduleResponse {
  docs: ReplizScheduleItem[];
  total: number;
}

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Build a 6×7 grid of dates that covers the month, padded with prev/next month days. */
function buildMonthGrid(month: Date): Date[] {
  const first = startOfMonth(month);
  const offset = first.getDay(); // 0=Sun
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  return cells;
}

export function ScheduleCalendar() {
  const [month, setMonth] = React.useState(() => startOfMonth(new Date()));
  const [items, setItems] = React.useState<ReplizScheduleItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [accounts, setAccounts] = React.useState<ReplizAccount[]>([]);
  const [accountFilter, setAccountFilter] = React.useState<string[]>([]); // empty = all
  const [platformFilter, setPlatformFilter] = React.useState<'all' | SocialPlatform>('all');
  const [selected, setSelected] = React.useState<ReplizScheduleItem | null>(null);

  // Load accounts once
  React.useEffect(() => {
    fetchJson<ReplizAccount[]>('/api/repliz/accounts')
      .then(setAccounts)
      .catch((err: Error) => toast.error(err.message));
  }, []);

  const fetchSchedules = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('fromDate', startOfMonth(month).toISOString());
      params.set('toDate', endOfMonth(month).toISOString());
      // Server-side filter by account if user picked specific accounts
      for (const id of accountFilter) params.append('accountIds', id);
      const data = await fetchJson<ScheduleResponse>(`/api/repliz/schedule?${params}`);
      setItems(data.docs ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memuat jadwal');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [month, accountFilter]);

  React.useEffect(() => {
    void fetchSchedules();
  }, [fetchSchedules]);

  // Client-side filter by platform (since the API doesn't filter by platform directly)
  const filteredItems = React.useMemo(() => {
    if (platformFilter === 'all') return items;
    return items.filter((it) => it.account?.type === platformFilter);
  }, [items, platformFilter]);

  // Group items by yyyy-mm-dd
  const itemsByDay = React.useMemo(() => {
    const map = new Map<string, ReplizScheduleItem[]>();
    for (const it of filteredItems) {
      const d = new Date(it.scheduleAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const list = map.get(key) ?? [];
      list.push(it);
      map.set(key, list);
    }
    // Sort each day by time
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.scheduleAt).getTime() - new Date(b.scheduleAt).getTime());
    }
    return map;
  }, [filteredItems]);

  const cells = buildMonthGrid(month);
  const today = new Date();

  return (
    <div className="space-y-4">
      <ScheduleCalendarHeader
        month={month}
        accounts={accounts}
        accountFilter={accountFilter}
        platformFilter={platformFilter}
        onChangeMonth={setMonth}
        onChangeAccountFilter={setAccountFilter}
        onChangePlatformFilter={setPlatformFilter}
        onRefresh={fetchSchedules}
        loading={loading}
        eventCount={filteredItems.length}
      />

      <div className="overflow-hidden rounded-xl border border-border bg-white">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-border bg-neutral-50">
          {DAY_LABELS.map((day) => (
            <div
              key={day}
              className="px-2 py-2 text-center text-[11px] font-medium tracking-wider text-neutral-500"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="relative grid grid-cols-7 grid-rows-6 divide-x divide-y divide-border">
          {cells.map((date, idx) => {
            const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            const dayEvents = itemsByDay.get(key) ?? [];
            const isOutsideMonth = date.getMonth() !== month.getMonth();
            const isToday = isSameDay(date, today);

            const visibleCount = 2;
            const visible = dayEvents.slice(0, visibleCount);
            const hidden = dayEvents.length - visible.length;

            return (
              <div
                key={idx}
                className={`flex min-h-[140px] flex-col p-1.5 ${
                  isOutsideMonth ? 'bg-neutral-50/60' : 'bg-white'
                }`}
              >
                <div
                  className={`mb-1 self-start text-xs font-medium ${
                    isOutsideMonth ? 'text-neutral-300' : 'text-neutral-600'
                  }`}
                >
                  {isToday ? (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                      {date.getDate()}
                    </span>
                  ) : (
                    <span className="px-1">{date.getDate()}</span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                  {visible.map((ev) => (
                    <ScheduleEventCard
                      key={ev._id}
                      item={ev}
                      onClick={() => setSelected(ev)}
                    />
                  ))}
                  {hidden > 0 && (
                    <button
                      onClick={() => {
                        // For now: open the first hidden one. Could be a "day view" later.
                        setSelected(dayEvents[visibleCount]);
                      }}
                      className="rounded bg-neutral-100 px-2 py-1 text-left text-[11px] font-medium text-neutral-600 hover:bg-neutral-200"
                    >
                      +{hidden} lainnya
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm">
              <Spinner size={28} />
            </div>
          )}
        </div>
      </div>

      <ScheduleDetailModal
        item={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
