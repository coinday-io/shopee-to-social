'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ReplizScheduleItem } from '@/lib/types';
import { cn, platformColor, platformLabel } from '@/lib/utils';
import { StatusIcon } from './StatusIcon';

interface Props {
  item: ReplizScheduleItem | null;
  onClose: () => void;
}

function statusTone(status: string) {
  switch (status) {
    case 'success':
      return 'success' as const;
    case 'error':
      return 'danger' as const;
    case 'process':
      return 'info' as const;
    default:
      return 'warning' as const;
  }
}

export function ScheduleDetailModal({ item, onClose }: Props) {
  if (!item) return null;

  const scheduleDate = new Date(item.scheduleAt);
  // Repliz tidak expose per-schedule URL, jadi arahkan ke schedule list saja
  const replizUrl = 'https://repliz.com/user/schedule';

  // Determine which medias to render — repliz returns type as either number (0=image,1=video) or string
  const medias = item.medias ?? [];
  const isVideo = (m: { type?: string | number }) =>
    m.type === 1 || m.type === 'video' || m.type === '1';

  return (
    <Modal
      open={!!item}
      onOpenChange={(v) => !v && onClose()}
      title="Detail Jadwal"
      description={scheduleDate.toLocaleString('id-ID', {
        dateStyle: 'full',
        timeStyle: 'short',
      })}
      size="lg"
    >
      <div className="space-y-5 px-6 py-5">
        {/* Status + mode badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusTone(item.status)}>
            <StatusIcon status={item.status} size={12} />
            <span className="ml-1 capitalize">{item.status}</span>
          </Badge>
          <Badge tone="neutral">Mode: {item.type}</Badge>
        </div>

        {/* Account */}
        {item.account && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-neutral-50 p-3">
            {item.account.picture ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={item.account.picture}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-neutral-200" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{item.account.name}</div>
              <div className="text-xs text-neutral-500">@{item.account.username}</div>
            </div>
            <span className={cn('rounded px-2 py-0.5 text-[10px] font-bold uppercase', platformColor(item.account.type))}>
              {platformLabel(item.account.type)}
            </span>
          </div>
        )}

        {/* Caption */}
        {item.description && (
          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Caption
            </h3>
            <div className="whitespace-pre-wrap rounded-lg border border-border bg-white p-3 text-sm text-neutral-800">
              {item.description}
            </div>
          </section>
        )}

        {/* Media */}
        {medias.length > 0 && (
          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Media ({medias.length})
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {medias.map((m, i) => (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden rounded-lg border border-border bg-neutral-100"
                >
                  {isVideo(m) ? (
                    <>
                      {m.thumbnail ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={m.thumbnail} alt={m.alt ?? ''} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-neutral-400">▶</div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-2xl text-white">
                        ▶
                      </div>
                    </>
                  ) : m.url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={m.url} alt={m.alt ?? ''} className="h-full w-full object-cover" />
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Meta link */}
        {item.meta?.url && (
          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Link
            </h3>
            <a
              href={item.meta.url}
              target="_blank"
              rel="noreferrer"
              className="break-all text-sm text-primary hover:underline"
            >
              {item.meta.url}
            </a>
          </section>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border bg-neutral-50 px-6 py-3">
        <span className="text-xs text-neutral-500">ID: {item._id.slice(-8)}</span>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            Tutup
          </Button>
          <a href={replizUrl} target="_blank" rel="noreferrer">
            <Button>Buka di Repliz →</Button>
          </a>
        </div>
      </div>
    </Modal>
  );
}
