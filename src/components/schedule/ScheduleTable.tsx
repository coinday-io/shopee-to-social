'use client';

import * as React from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { ScheduleStatusBadge } from './ScheduleStatusBadge';
import { platformColor, platformLabel, truncate } from '@/lib/utils';

interface HistoryItem {
  id: string;
  productItemid: string;
  productName: string;
  imageUrl: string;
  affiliateUrl: string;
  caption: string;
  platform: string;
  accountId: string;
  accountName: string;
  replizScheduleId: string | null;
  scheduleAt: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

interface ApiResponse {
  items: HistoryItem[];
  total: number;
  page: number;
  pageCount: number;
}

export function ScheduleTable() {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<ApiResponse | null>(null);
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState('');
  const [platform, setPlatform] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '20');
    if (status) params.set('status', status);
    if (platform) params.set('platform', platform);
    if (from) params.set('from', new Date(from).toISOString());
    if (to) params.set('to', new Date(to).toISOString());
    try {
      const res = await fetch(`/api/history?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [page, status, platform, from, to]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-white p-4">
        <div className="w-40">
          <Select
            label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua</option>
            <option value="pending">Pending</option>
            <option value="success">Berhasil</option>
            <option value="error">Gagal</option>
          </Select>
        </div>
        <div className="w-44">
          <Select
            label="Platform"
            value={platform}
            onChange={(e) => {
              setPlatform(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua</option>
            <option value="facebook">Facebook</option>
            <option value="threads">Threads</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
          </Select>
        </div>
        <div className="w-48">
          <Input
            label="Dari"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Input
            label="Sampai"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <Button variant="secondary" size="md" onClick={fetchData}>
          Refresh
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-neutral-500">
            <Spinner size={20} className="mr-2" /> Memuat...
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="py-16 text-center text-sm text-neutral-500">
            Belum ada jadwal posting. Mulai dari halaman Produk.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-3 py-2">Produk</th>
                  <th className="px-3 py-2">Akun</th>
                  <th className="px-3 py-2">Caption</th>
                  <th className="px-3 py-2 whitespace-nowrap">Jadwal</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => {
                  const isOpen = expanded === item.id;
                  return (
                    <tr key={item.id} className="border-t border-border align-top">
                      <td className="px-3 py-3">
                        <div className="flex items-start gap-2">
                          {item.imageUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={item.imageUrl}
                              alt=""
                              className="h-10 w-10 rounded object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded bg-neutral-100" />
                          )}
                          <div className="max-w-[180px]">
                            <div className="text-xs font-medium leading-snug line-clamp-2">
                              {item.productName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${platformColor(item.platform)}`}>
                            {item.platform}
                          </span>
                          <span className="text-xs text-neutral-700">{truncate(item.accountName, 18)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 max-w-md">
                        <button
                          onClick={() => setExpanded(isOpen ? null : item.id)}
                          className="text-left text-xs text-neutral-600 hover:text-neutral-900"
                        >
                          {isOpen ? item.caption : truncate(item.caption, 120)}
                        </button>
                        {item.errorMessage && (
                          <div className="mt-1 text-xs text-red-600">
                            {truncate(item.errorMessage, 100)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-neutral-600">
                        {new Date(item.scheduleAt).toLocaleString('id-ID', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-3 py-3">
                        <ScheduleStatusBadge status={item.status} />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {item.replizScheduleId && (
                          <a
                            href={`https://app.repliz.com/schedule/${item.replizScheduleId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Repliz →
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.pageCount > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-neutral-500">
            Halaman {data.page} dari {data.pageCount} · Total {data.total} entry
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= data.pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
