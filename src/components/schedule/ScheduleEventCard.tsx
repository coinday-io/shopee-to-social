'use client';

import * as React from 'react';
import { ReplizScheduleItem } from '@/lib/types';
import { platformColor, truncate } from '@/lib/utils';
import { StatusIcon } from './StatusIcon';

interface Props {
  item: ReplizScheduleItem;
  onClick: () => void;
}

function platformIcon(type?: string): string {
  switch (type) {
    case 'facebook':
      return 'f';
    case 'instagram':
      return 'IG';
    case 'threads':
      return '@';
    case 'tiktok':
      return 'T';
    case 'youtube':
      return 'YT';
    case 'linkedin':
      return 'in';
    default:
      return '?';
  }
}

export function ScheduleEventCard({ item, onClick }: Props) {
  const date = new Date(item.scheduleAt);
  const time = date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const accountName = item.account?.name ?? 'Account';
  const caption = item.description ?? '';

  return (
    <button
      onClick={onClick}
      className="group flex flex-col gap-0.5 rounded-md border border-border bg-white px-1.5 py-1 text-left transition-colors hover:bg-neutral-50"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-neutral-700">{time}</span>
        <StatusIcon status={item.status} size={12} />
      </div>
      <div className="flex items-center gap-1">
        <div className="relative h-4 w-4 shrink-0">
          {item.account?.picture ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={item.account.picture}
              alt=""
              className="h-4 w-4 rounded-full object-cover"
            />
          ) : (
            <div className="h-4 w-4 rounded-full bg-neutral-200" />
          )}
          {item.account?.type && (
            <span
              className={`absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full text-[6px] font-bold ${platformColor(item.account.type)}`}
            >
              {platformIcon(item.account.type)}
            </span>
          )}
        </div>
        <span className="truncate text-[10px] font-medium text-neutral-700">
          {truncate(accountName, 14)}
        </span>
      </div>
      <div className="text-[10px] leading-tight text-neutral-500 line-clamp-1">
        {truncate(caption, 60) || '—'}
      </div>
    </button>
  );
}
