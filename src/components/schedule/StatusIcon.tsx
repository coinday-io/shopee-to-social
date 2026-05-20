import * as React from 'react';
import { ReplizScheduleStatus } from '@/lib/types';

interface Props {
  status: ReplizScheduleStatus | string;
  size?: number;
}

export function StatusIcon({ status, size = 14 }: Props) {
  const s = size;
  if (status === 'success') {
    return (
      <span
        title="Berhasil dipost"
        className="inline-flex items-center justify-center rounded-full bg-green-500 text-white"
        style={{ width: s, height: s }}
      >
        <svg width={s * 0.7} height={s * 0.7} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span
        title="Gagal"
        className="inline-flex items-center justify-center rounded-full bg-red-500 text-white"
        style={{ width: s, height: s }}
      >
        <svg width={s * 0.7} height={s * 0.7} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </span>
    );
  }
  if (status === 'process') {
    return (
      <span
        title="Sedang diproses"
        className="inline-flex items-center justify-center rounded-full bg-blue-500 text-white"
        style={{ width: s, height: s }}
      >
        <svg width={s * 0.7} height={s * 0.7} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="animate-spin">
          <circle cx="12" cy="12" r="10" opacity="0.3" />
          <path d="M22 12a10 10 0 0 0-10-10" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  // pending (default)
  return (
    <span
      title="Pending"
      className="inline-flex items-center justify-center rounded-full bg-neutral-100 text-neutral-500"
      style={{ width: s, height: s }}
    >
      <svg width={s * 0.7} height={s * 0.7} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    </span>
  );
}
