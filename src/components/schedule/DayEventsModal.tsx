'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import { ReplizScheduleItem } from '@/lib/types';
import { cn, platformColor, truncate } from '@/lib/utils';
import { StatusIcon } from './StatusIcon';

interface Props {
  date: Date | null;
  items: ReplizScheduleItem[];
  onClose: () => void;
  onSelectItem: (item: ReplizScheduleItem) => void;
}

export function DayEventsModal({ date, items, onClose, onSelectItem }: Props) {
  if (!date) return null;

  const dateLabel = date.toLocaleString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Modal
      open={!!date}
      onOpenChange={(v) => !v && onClose()}
      title={dateLabel}
      description={`${items.length} post terjadwal`}
      size="md"
    >
      <div className="max-h-[60vh] space-y-2 overflow-y-auto px-6 py-5">
        {items.map((it) => {
          const time = new Date(it.scheduleAt).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
          const firstMedia = it.medias?.[0];
          const thumbUrl = firstMedia?.thumbnail || firstMedia?.url || '';
          return (
            <button
              key={it._id}
              onClick={() => onSelectItem(it)}
              className="flex w-full items-start gap-3 rounded-lg border border-border bg-white p-3 text-left transition-colors hover:bg-neutral-50"
            >
              {thumbUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={thumbUrl}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-md object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-xs text-neutral-400">
                  no media
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-700">{time}</span>
                  <StatusIcon status={it.status} size={12} />
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-neutral-600">
                    {it.type}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  {it.account?.picture ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={it.account.picture}
                      alt=""
                      className="h-4 w-4 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-4 w-4 rounded-full bg-neutral-200" />
                  )}
                  <span className="truncate text-xs font-medium text-neutral-700">
                    {it.account?.name ?? 'Account'}
                  </span>
                  {it.account?.type && (
                    <span
                      className={cn(
                        'rounded px-1 py-0.5 text-[9px] font-bold uppercase',
                        platformColor(it.account.type),
                      )}
                    >
                      {it.account.type}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-neutral-500 line-clamp-2">
                  {truncate(it.description ?? '', 140) || '—'}
                </div>
              </div>
            </button>
          );
        })}
        {items.length === 0 && (
          <div className="py-8 text-center text-sm text-neutral-500">
            Tidak ada post di tanggal ini.
          </div>
        )}
      </div>
    </Modal>
  );
}
