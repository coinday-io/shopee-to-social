'use client';

import * as React from 'react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { ReplizAccount, ShopeeProduct, SocialPlatform } from '@/lib/types';
import { cn, formatRupiah, platformColor, platformLabel } from '@/lib/utils';

interface PostFormModalProps {
  open: boolean;
  product: ShopeeProduct | null;
  onClose: () => void;
  onSuccess: (itemId: string) => void;
}

const PLATFORM_TABS: Array<'all' | SocialPlatform> = [
  'all',
  'facebook',
  'threads',
  'instagram',
  'tiktok',
];

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PostFormModal({ open, product, onClose, onSuccess }: PostFormModalProps) {
  const [selectedImageUrl, setSelectedImageUrl] = React.useState('');
  const [affiliateUrl, setAffiliateUrl] = React.useState('');
  const [captionHint, setCaptionHint] = React.useState('');
  const [caption, setCaption] = React.useState('');
  const [generating, setGenerating] = React.useState(false);
  const [accounts, setAccounts] = React.useState<ReplizAccount[] | null>(null);
  const [accountsLoading, setAccountsLoading] = React.useState(false);
  const [selectedAccountIds, setSelectedAccountIds] = React.useState<string[]>([]);
  const [scheduleAt, setScheduleAt] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'all' | SocialPlatform>('all');
  const [submitting, setSubmitting] = React.useState(false);

  // Reset on product change
  React.useEffect(() => {
    if (!product) return;
    setSelectedImageUrl(product.images?.[0] ?? '');
    setAffiliateUrl(product.url ?? '');
    setCaptionHint('');
    setCaption('');
    setSelectedAccountIds([]);
    const future = new Date(Date.now() + 60 * 60 * 1000);
    setScheduleAt(toLocalInputValue(future));
    setActiveTab('all');
  }, [product]);

  // Load accounts when modal opens
  React.useEffect(() => {
    if (!open) return;
    setAccountsLoading(true);
    fetch('/api/repliz/accounts')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Gagal load akun');
        setAccounts(data);
      })
      .catch((err: Error) => {
        toast.error(err.message);
        setAccounts([]);
      })
      .finally(() => setAccountsLoading(false));
  }, [open]);

  if (!product) return null;

  const visibleAccounts = (accounts ?? []).filter((a) => {
    if (a.type === 'twitter') return false; // hide twitter (coming soon)
    if (activeTab === 'all') return true;
    return a.type === activeTab;
  });

  function toggleAccount(id: string) {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function selectAllOfType(type: SocialPlatform) {
    const ids = (accounts ?? []).filter((a) => a.type === type).map((a) => a.id);
    setSelectedAccountIds((prev) => Array.from(new Set([...prev, ...ids])));
  }

  async function generateCaption() {
    if (!product) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, affiliateUrl, hint: captionHint }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generate gagal');
      setCaption(data.caption);
      toast.success('Caption dibuat');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generate gagal');
    } finally {
      setGenerating(false);
    }
  }

  async function submit() {
    if (!product) return;
    if (!selectedImageUrl) return toast.error('Pilih gambar terlebih dahulu');
    if (!caption.trim()) return toast.error('Caption belum diisi');
    if (selectedAccountIds.length === 0) return toast.error('Pilih minimal satu akun');
    if (!scheduleAt) return toast.error('Set jadwal posting');

    const scheduleDate = new Date(scheduleAt);
    if (scheduleDate.getTime() < Date.now() - 60_000) {
      return toast.error('Jadwal tidak boleh di masa lalu');
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            itemid: product.itemid,
            name: product.name,
            description: product.description,
            url: product.url,
          },
          affiliateUrl,
          imageUrl: selectedImageUrl,
          caption,
          accountIds: selectedAccountIds,
          accounts: accounts ?? [],
          scheduleAt: scheduleDate.toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Post gagal');
      const { successCount, failCount } = data;
      if (failCount === 0) {
        toast.success(`${successCount} jadwal berhasil dibuat`);
      } else {
        toast(
          `${successCount} berhasil, ${failCount} gagal`,
          { icon: '⚠️' },
        );
      }
      onSuccess(String(product.itemid));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Post gagal');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title="Buat Post"
      description={product.name}
      size="xl"
    >
      <div className="grid gap-6 px-6 py-5 md:grid-cols-2">
        {/* LEFT */}
        <div className="space-y-5">
          <section>
            <h3 className="mb-2 text-sm font-semibold">Produk</h3>
            <div className="rounded-lg border border-border bg-neutral-50 p-3">
              <div className="text-sm font-medium leading-snug">{product.name}</div>
              <div className="mt-1 text-sm text-primary font-semibold">
                {formatRupiah(product.price)}
              </div>
              <div className="mt-0.5 text-xs text-neutral-500">
                {product.shop_name} · {product.shop_location}
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">Pilih Gambar</h3>
            <div className="grid grid-cols-4 gap-2">
              {(product.images ?? []).slice(0, 8).map((img) => (
                <button
                  key={img}
                  onClick={() => setSelectedImageUrl(img)}
                  className={cn(
                    'aspect-square overflow-hidden rounded-lg border-2 transition-colors',
                    selectedImageUrl === img ? 'border-primary' : 'border-transparent hover:border-neutral-300',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </section>

          <Input
            label="Affiliate URL"
            value={affiliateUrl}
            onChange={(e) => setAffiliateUrl(e.target.value)}
            hint="Default: URL produk Shopee. Ganti ke link affiliate."
          />

          <section>
            <h3 className="mb-2 text-sm font-semibold">Caption</h3>
            <Textarea
              placeholder="beli disini: [link affiliate]"
              value={captionHint}
              onChange={(e) => setCaptionHint(e.target.value)}
              rows={2}
              label="Hint Caption (opsional)"
            />
            <Button
              onClick={generateCaption}
              loading={generating}
              variant="secondary"
              size="sm"
              className="mt-2"
            >
              ✨ Generate Caption (AI)
            </Button>
            <div className="mt-3">
              <Textarea
                label="Caption Final"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={6}
                placeholder="Caption muncul di sini setelah di-generate, atau tulis manual"
              />
              <div className="mt-1 text-right text-xs text-neutral-500">
                {caption.length} karakter
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT */}
        <div className="space-y-5">
          <section>
            <h3 className="mb-2 text-sm font-semibold">Pilih Akun</h3>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {PLATFORM_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                    activeTab === tab
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white border-border text-neutral-700 hover:bg-neutral-50',
                  )}
                >
                  {tab === 'all' ? 'Semua' : platformLabel(tab)}
                </button>
              ))}
            </div>

            {activeTab !== 'all' && (
              <button
                onClick={() => selectAllOfType(activeTab)}
                className="mb-2 text-xs font-medium text-primary hover:underline"
              >
                Pilih Semua {platformLabel(activeTab)}
              </button>
            )}

            <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-white p-2">
              {accountsLoading ? (
                <div className="flex items-center justify-center py-8 text-neutral-500 text-sm">
                  <Spinner size={18} className="mr-2" /> Memuat akun...
                </div>
              ) : visibleAccounts.length === 0 ? (
                <div className="py-8 text-center text-sm text-neutral-500">
                  Belum ada akun. Set Repliz API key di Settings.
                </div>
              ) : (
                visibleAccounts.map((a) => {
                  const checked = selectedAccountIds.includes(a.id);
                  return (
                    <label
                      key={a.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors',
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
                        <img
                          src={a.picture}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-neutral-200" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{a.name}</div>
                        <div className="text-xs text-neutral-500 truncate">@{a.username}</div>
                      </div>
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold uppercase', platformColor(a.type))}>
                        {a.type}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
            <div className="mt-2 text-xs text-neutral-500">
              {selectedAccountIds.length} akun dipilih
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">Jadwal Posting</h3>
            <Input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
            />
            <p className="mt-1 text-xs text-neutral-500">
              Default: sekarang + 1 jam (zona waktu lokal)
            </p>
          </section>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border bg-neutral-50 px-6 py-3">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Batal
        </Button>
        <Button onClick={submit} loading={submitting}>
          Jadwalkan Post
        </Button>
      </div>
    </Modal>
  );
}
