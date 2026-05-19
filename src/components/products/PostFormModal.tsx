'use client';

import * as React from 'react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { PostMode, ReplizAccount, ShopeeProduct, SocialPlatform } from '@/lib/types';
import { cn, formatRupiah, platformColor, platformLabel } from '@/lib/utils';
import { fetchJson } from '@/lib/fetch-client';

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

interface ModeOption {
  value: PostMode;
  label: string;
  desc: string;
  needsImage: boolean;
  needsVideo: boolean;
  multipleImages: boolean;
}

const MODE_OPTIONS: ModeOption[] = [
  { value: 'image', label: '📷 Image', desc: 'Satu gambar produk', needsImage: true, needsVideo: false, multipleImages: false },
  { value: 'album', label: '🖼️ Album', desc: 'Banyak gambar (2-10)', needsImage: true, needsVideo: false, multipleImages: true },
  { value: 'video', label: '🎬 Video', desc: 'Video produk', needsImage: false, needsVideo: true, multipleImages: false },
  { value: 'reel', label: '🎞️ Reel', desc: 'Short vertical video', needsImage: false, needsVideo: true, multipleImages: false },
  { value: 'story', label: '⭐ Story', desc: 'Story / ephemeral', needsImage: true, needsVideo: false, multipleImages: false },
  { value: 'text', label: '📝 Text', desc: 'Caption tanpa media', needsImage: false, needsVideo: false, multipleImages: false },
  { value: 'link', label: '🔗 Link', desc: 'Link preview saja', needsImage: false, needsVideo: false, multipleImages: false },
];

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PostFormModal({ open, product, onClose, onSuccess }: PostFormModalProps) {
  const [mode, setMode] = React.useState<PostMode>('image');
  const [selectedImageUrls, setSelectedImageUrls] = React.useState<string[]>([]);
  const [selectedVideoUrl, setSelectedVideoUrl] = React.useState('');
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

  const currentMode = MODE_OPTIONS.find((m) => m.value === mode) ?? MODE_OPTIONS[0];

  // Reset on product change
  React.useEffect(() => {
    if (!product) return;
    setMode('image');
    setSelectedImageUrls(product.images?.[0] ? [product.images[0]] : []);
    setSelectedVideoUrl(product.videos?.[0]?.url ?? '');
    setAffiliateUrl(product.affiliate_url || product.url || '');
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
    fetchJson<ReplizAccount[]>('/api/repliz/accounts')
      .then(setAccounts)
      .catch((err: Error) => {
        toast.error(err.message);
        setAccounts([]);
      })
      .finally(() => setAccountsLoading(false));
  }, [open]);

  if (!product) return null;

  const visibleAccounts = (accounts ?? []).filter((a) => {
    if (a.type === 'twitter') return false;
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

  function toggleImage(url: string) {
    if (currentMode.multipleImages) {
      setSelectedImageUrls((prev) =>
        prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url],
      );
    } else {
      setSelectedImageUrls([url]);
    }
  }

  function handleModeChange(next: PostMode) {
    setMode(next);
    const nextMode = MODE_OPTIONS.find((m) => m.value === next)!;
    // Reset selection if switching from multi to single
    if (!nextMode.multipleImages && selectedImageUrls.length > 1) {
      setSelectedImageUrls(selectedImageUrls.slice(0, 1));
    }
    // Ensure at least one image selected when switching to image-mode
    if (nextMode.needsImage && selectedImageUrls.length === 0 && product?.images?.[0]) {
      setSelectedImageUrls([product.images[0]]);
    }
  }

  async function generateCaption() {
    if (!product) return;
    setGenerating(true);
    try {
      const data = await fetchJson<{ caption: string }>('/api/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, affiliateUrl, hint: captionHint }),
      });
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
    if (!caption.trim()) return toast.error('Caption belum diisi');
    if (selectedAccountIds.length === 0) return toast.error('Pilih minimal satu akun');
    if (!scheduleAt) return toast.error('Set jadwal posting');

    // Mode-specific validation
    if (currentMode.needsImage && selectedImageUrls.length === 0) {
      return toast.error('Pilih minimal 1 gambar');
    }
    if (mode === 'album' && selectedImageUrls.length < 2) {
      return toast.error('Album butuh minimal 2 gambar');
    }
    if (mode === 'album' && selectedImageUrls.length > 10) {
      return toast.error('Album maksimal 10 gambar');
    }
    if (currentMode.needsVideo && !selectedVideoUrl) {
      return toast.error('Pilih video terlebih dahulu');
    }

    const scheduleDate = new Date(scheduleAt);
    if (scheduleDate.getTime() < Date.now() - 60_000) {
      return toast.error('Jadwal tidak boleh di masa lalu');
    }

    setSubmitting(true);
    try {
      const data = await fetchJson<{ successCount: number; failCount: number }>('/api/post', {
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
          mode,
          imageUrls: selectedImageUrls,
          videoUrl: selectedVideoUrl,
          videoThumbnail: product.videos?.find((v) => v.url === selectedVideoUrl)?.thumbnail || product.images?.[0] || '',
          caption,
          accountIds: selectedAccountIds,
          accounts: accounts ?? [],
          scheduleAt: scheduleDate.toISOString(),
        }),
      });
      const { successCount, failCount } = data;
      if (failCount === 0) {
        toast.success(`${successCount} jadwal berhasil dibuat`);
      } else {
        toast(`${successCount} berhasil, ${failCount} gagal`, { icon: '⚠️' });
      }
      onSuccess(String(product.itemid));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Post gagal');
    } finally {
      setSubmitting(false);
    }
  }

  const productImages = (product.images ?? []).slice(0, 12);
  const productVideos = product.videos ?? [];

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
            <h3 className="mb-2 text-sm font-semibold">Mode Posting</h3>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {MODE_OPTIONS.map((opt) => {
                const disabled = opt.needsVideo && productVideos.length === 0;
                const active = mode === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleModeChange(opt.value)}
                    title={disabled ? 'Produk tidak punya video' : opt.desc}
                    className={cn(
                      'rounded-lg border px-2 py-2 text-left transition-colors',
                      active
                        ? 'border-primary bg-primary-50'
                        : 'border-border bg-white hover:bg-neutral-50',
                      disabled && 'opacity-40 cursor-not-allowed',
                    )}
                  >
                    <div className="text-xs font-semibold">{opt.label}</div>
                    <div className="text-[10px] text-neutral-500 leading-tight">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {currentMode.needsImage && (
            <section>
              <h3 className="mb-2 text-sm font-semibold">
                {currentMode.multipleImages
                  ? `Pilih Gambar (${selectedImageUrls.length} dipilih, 2-10)`
                  : 'Pilih Gambar'}
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {productImages.map((img) => {
                  const selected = selectedImageUrls.includes(img);
                  const orderIdx = selectedImageUrls.indexOf(img);
                  return (
                    <button
                      key={img}
                      onClick={() => toggleImage(img)}
                      className={cn(
                        'relative aspect-square overflow-hidden rounded-lg border-2 transition-colors',
                        selected ? 'border-primary' : 'border-transparent hover:border-neutral-300',
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="h-full w-full object-cover" />
                      {currentMode.multipleImages && selected && (
                        <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                          {orderIdx + 1}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {currentMode.needsVideo && (
            <section>
              <h3 className="mb-2 text-sm font-semibold">
                Pilih Video {productVideos.length > 0 && `(${productVideos.length} tersedia)`}
              </h3>
              {productVideos.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-neutral-50 p-4 text-center text-sm text-neutral-500">
                  Produk ini tidak punya video.
                </div>
              ) : (
                <div className="space-y-2">
                  {productVideos.map((v, i) => {
                    const selected = selectedVideoUrl === v.url;
                    return (
                      <button
                        key={v.url}
                        onClick={() => setSelectedVideoUrl(v.url)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg border-2 p-2 text-left transition-colors',
                          selected ? 'border-primary bg-primary-50' : 'border-border bg-white hover:bg-neutral-50',
                        )}
                      >
                        {v.thumbnail ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={v.thumbnail} alt="" className="h-14 w-14 rounded object-cover" />
                        ) : product.images?.[0] ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={product.images[0]} alt="" className="h-14 w-14 rounded object-cover opacity-70" />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded bg-neutral-200 text-neutral-500">
                            ▶
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">Video {i + 1}</div>
                          <div className="truncate text-xs text-neutral-500">{v.url}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {(mode === 'text' || mode === 'link') && (
            <div className="rounded-lg border border-dashed border-border bg-neutral-50 p-3 text-xs text-neutral-600">
              Mode <strong>{mode}</strong> tidak butuh media. Hanya caption{mode === 'link' && ' + URL meta'} yang akan diposting.
            </div>
          )}

          <Input
            label="Affiliate URL"
            value={affiliateUrl}
            onChange={(e) => setAffiliateUrl(e.target.value)}
            hint={
              product.affiliate_url
                ? 'Otomatis terisi dari affiliate_url di data scrape.'
                : 'Default: URL produk Shopee. Ganti ke link affiliate.'
            }
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
          Jadwalkan Post ({mode})
        </Button>
      </div>
    </Modal>
  );
}
