'use client';

import * as React from 'react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { PostMode, ReplizAccount, ShopeeProduct, SocialPlatform } from '@/lib/types';
import { cn, formatRupiah, platformColor, platformLabel } from '@/lib/utils';
import { fetchJson } from '@/lib/fetch-client';

interface BulkPostModalProps {
  open: boolean;
  products: ShopeeProduct[];
  onClose: () => void;
  onSuccess: (itemIds: string[]) => void;
}

interface ItemState {
  product: ShopeeProduct;
  caption: string;
  /** Images selected for album mode (ordered). Ignored for other modes. */
  albumImages: string[];
  status: 'idle' | 'generating' | 'ready' | 'scheduling' | 'success' | 'error' | 'skipped';
  error?: string;
}

function isItemCompatible(it: ItemState, mode: PostMode): { ok: boolean; reason?: string } {
  const p = it.product;
  if (mode === 'album') {
    if (it.albumImages.length < 2) {
      return { ok: false, reason: `Album butuh ≥2 gambar (dipilih ${it.albumImages.length})` };
    }
    if (it.albumImages.length > 10) {
      return { ok: false, reason: `Album maks 10 gambar (dipilih ${it.albumImages.length})` };
    }
  }
  if (mode === 'video' || mode === 'reel') {
    if ((p.videos?.length ?? 0) === 0) return { ok: false, reason: `Mode ${mode} butuh video` };
  }
  if ((mode === 'image' || mode === 'story') && (p.images?.length ?? 0) === 0) {
    return { ok: false, reason: 'Tidak ada gambar' };
  }
  return { ok: true };
}

const PLATFORM_TABS: Array<'all' | SocialPlatform> = [
  'all',
  'facebook',
  'threads',
  'instagram',
  'tiktok',
];

const MODE_OPTIONS: { value: PostMode; label: string }[] = [
  { value: 'image', label: '📷 Image' },
  { value: 'album', label: '🖼️ Album' },
  { value: 'video', label: '🎬 Video' },
  { value: 'reel', label: '🎞️ Reel' },
  { value: 'story', label: '⭐ Story' },
  { value: 'text', label: '📝 Text' },
  { value: 'link', label: '🔗 Link' },
];

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BulkPostModal({ open, products, onClose, onSuccess }: BulkPostModalProps) {
  const [items, setItems] = React.useState<ItemState[]>([]);
  const [mode, setMode] = React.useState<PostMode>('image');
  const [includeAffiliate, setIncludeAffiliate] = React.useState(true);
  const [captionHint, setCaptionHint] = React.useState('');
  const [accounts, setAccounts] = React.useState<ReplizAccount[] | null>(null);
  const [accountsLoading, setAccountsLoading] = React.useState(false);
  const [selectedAccountIds, setSelectedAccountIds] = React.useState<string[]>([]);
  const [activeTab, setActiveTab] = React.useState<'all' | SocialPlatform>('all');
  const [startAt, setStartAt] = React.useState('');
  const [intervalMin, setIntervalMin] = React.useState(30);
  const [genProgress, setGenProgress] = React.useState({ done: 0, total: 0 });
  const [scheduleProgress, setScheduleProgress] = React.useState({ done: 0, total: 0 });
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isScheduling, setIsScheduling] = React.useState(false);

  // Reset when products change or modal opens
  React.useEffect(() => {
    if (!open) return;
    setItems(
      products.map((p) => ({
        product: p,
        caption: '',
        // Default album selection: first 3 images (or fewer if product has less)
        albumImages: (p.images ?? []).slice(0, 3),
        status: 'idle',
      })),
    );
    setSelectedAccountIds([]);
    setMode('image');
    setIncludeAffiliate(true);
    setCaptionHint('');
    setActiveTab('all');
    setStartAt(toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)));
    setIntervalMin(30);
    setGenProgress({ done: 0, total: 0 });
    setScheduleProgress({ done: 0, total: 0 });
  }, [open, products]);

  // Load accounts
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

  if (products.length === 0) return null;

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

  async function generateAll() {
    if (mode === 'text' || mode === 'link') {
      // still allow generation
    }
    setIsGenerating(true);
    setGenProgress({ done: 0, total: items.length });
    const next = [...items];

    // Sequential to avoid hammering the AI provider
    for (let i = 0; i < next.length; i++) {
      next[i] = { ...next[i], status: 'generating' };
      setItems([...next]);
      try {
        const data = await fetchJson<{ caption: string }>('/api/caption', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product: next[i].product,
            affiliateUrl: next[i].product.affiliate_url || next[i].product.url,
            hint: captionHint,
            includeAffiliate,
          }),
        });
        next[i] = { ...next[i], caption: data.caption, status: 'ready' };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error';
        next[i] = { ...next[i], status: 'error', error: msg };
      }
      setItems([...next]);
      setGenProgress({ done: i + 1, total: next.length });
    }
    setIsGenerating(false);
    const okCount = next.filter((it) => it.status === 'ready').length;
    toast.success(`${okCount}/${next.length} caption siap`);
  }

  function updateCaption(itemId: string, value: string) {
    setItems((prev) =>
      prev.map((it) =>
        String(it.product.itemid) === itemId
          ? { ...it, caption: value, status: value.trim() ? 'ready' : 'idle' }
          : it,
      ),
    );
  }

  function toggleAlbumImage(itemId: string, url: string) {
    setItems((prev) =>
      prev.map((it) => {
        if (String(it.product.itemid) !== itemId) return it;
        const exists = it.albumImages.includes(url);
        if (exists) {
          return { ...it, albumImages: it.albumImages.filter((u) => u !== url) };
        }
        if (it.albumImages.length >= 10) return it; // max 10
        return { ...it, albumImages: [...it.albumImages, url] };
      }),
    );
  }

  function setAlbumImagesFor(itemId: string, urls: string[]) {
    setItems((prev) =>
      prev.map((it) =>
        String(it.product.itemid) === itemId ? { ...it, albumImages: urls } : it,
      ),
    );
  }

  async function scheduleAll() {
    if (selectedAccountIds.length === 0) return toast.error('Pilih minimal 1 akun');
    if (!startAt) return toast.error('Set jadwal mulai');
    const startDate = new Date(startAt);
    if (startDate.getTime() < Date.now() - 60_000) {
      return toast.error('Jadwal mulai tidak boleh di masa lalu');
    }

    // Partition items: ready (has caption + compatible with mode) vs skipped
    const next = [...items];
    const toSchedule: ItemState[] = [];
    for (let i = 0; i < next.length; i++) {
      const it = next[i];
      if (!it.caption.trim()) {
        next[i] = { ...it, status: 'skipped', error: 'Caption kosong' };
        continue;
      }
      const compat = isItemCompatible(it, mode);
      if (!compat.ok) {
        next[i] = { ...it, status: 'skipped', error: compat.reason };
        continue;
      }
      toSchedule.push(it);
    }
    setItems([...next]);

    if (toSchedule.length === 0) {
      toast.error('Tidak ada produk yang valid untuk mode ini');
      return;
    }

    setIsScheduling(true);
    setScheduleProgress({ done: 0, total: toSchedule.length });
    const successIds: string[] = [];

    for (let i = 0; i < toSchedule.length; i++) {
      const target = toSchedule[i];
      const idx = next.findIndex((it) => it.product.itemid === target.product.itemid);
      next[idx] = { ...next[idx], status: 'scheduling' };
      setItems([...next]);

      const scheduleAtMs = startDate.getTime() + i * intervalMin * 60_000;
      const product = target.product;

      // Per-mode media derivation
      const imageUrls =
        mode === 'album'
          ? target.albumImages.slice(0, 10)
          : mode === 'image' || mode === 'story'
            ? product.images?.[0]
              ? [product.images[0]]
              : []
            : [];
      const videoUrl =
        mode === 'video' || mode === 'reel' ? product.videos?.[0]?.url ?? '' : '';
      const videoThumbnail =
        mode === 'video' || mode === 'reel'
          ? product.videos?.[0]?.thumbnail || product.images?.[0] || ''
          : '';

      try {
        await fetchJson<{ successCount: number; failCount: number }>('/api/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product: {
              itemid: product.itemid,
              name: product.name,
              description: product.description,
              url: product.url,
            },
            affiliateUrl: product.affiliate_url || product.url,
            mode,
            imageUrls,
            videoUrl,
            videoThumbnail,
            caption: target.caption,
            accountIds: selectedAccountIds,
            accounts: accounts ?? [],
            scheduleAt: new Date(scheduleAtMs).toISOString(),
          }),
        });
        next[idx] = { ...next[idx], status: 'success' };
        successIds.push(String(product.itemid));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error';
        next[idx] = { ...next[idx], status: 'error', error: msg };
      }
      setItems([...next]);
      setScheduleProgress({ done: i + 1, total: toSchedule.length });
    }

    setIsScheduling(false);
    const okCount = next.filter((it) => it.status === 'success').length;
    const failCount = next.filter((it) => it.status === 'error').length;
    const skipCount = next.filter((it) => it.status === 'skipped').length;
    const parts = [`${okCount} berhasil`];
    if (failCount > 0) parts.push(`${failCount} gagal`);
    if (skipCount > 0) parts.push(`${skipCount} di-skip`);
    if (failCount === 0 && skipCount === 0) {
      toast.success(`${okCount} post berhasil dijadwalkan`);
    } else {
      toast(parts.join(' · '), { icon: '⚠️' });
    }
    onSuccess(successIds);
  }

  return (
    <Modal
      open={open}
      onOpenChange={(v) => !v && !isScheduling && !isGenerating && onClose()}
      title="Bulk Post"
      description={`${products.length} produk akan dijadwalkan ke akun-akun terpilih`}
      size="xl"
    >
      <div className="grid gap-6 px-6 py-5 md:grid-cols-2">
        {/* LEFT — Configuration */}
        <div className="space-y-5">
          <section>
            <h3 className="mb-2 text-sm font-semibold">
              Mode Posting <span className="text-primary">→ {mode}</span>
            </h3>
            <div className="grid grid-cols-4 gap-1.5">
              {MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMode(opt.value)}
                  className={cn(
                    'rounded-lg border px-2 py-2 text-xs font-medium transition-colors',
                    mode === opt.value
                      ? 'border-primary bg-primary-50'
                      : 'border-border bg-white hover:bg-neutral-50',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Mode yang sama dipakai untuk semua produk. Produk yang tidak cocok dengan mode akan di-skip otomatis.
              {mode === 'album' && ' Pilih gambar yang mau dipakai untuk tiap produk di bawah.'}
            </p>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">AI Caption</h3>
              <label className="flex items-center gap-2 text-xs text-neutral-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAffiliate}
                  onChange={(e) => setIncludeAffiliate(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                Sertakan link affiliate
                <span className="text-neutral-400">{includeAffiliate ? '(ON)' : '(OFF)'}</span>
              </label>
            </div>
            <Textarea
              label="Hint Caption (opsional, berlaku untuk semua)"
              placeholder={
                includeAffiliate
                  ? 'mis. "Tone santai, mention diskon 5.5"'
                  : 'mis. "Fokus ke fitur, jangan ajak klik link"'
              }
              value={captionHint}
              onChange={(e) => setCaptionHint(e.target.value)}
              rows={2}
            />
            <div className="mt-2 flex items-center gap-3">
              <Button
                onClick={generateAll}
                loading={isGenerating}
                variant="secondary"
                size="sm"
              >
                ✨ Generate Captions untuk Semua
              </Button>
              {isGenerating && (
                <span className="text-xs text-neutral-500">
                  {genProgress.done}/{genProgress.total}
                </span>
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">Pilih Akun</h3>
            <div className="mb-2 flex flex-wrap gap-1.5">
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
                className="mb-1 text-xs font-medium text-primary hover:underline"
              >
                Pilih Semua {platformLabel(activeTab)}
              </button>
            )}
            <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-white p-2">
              {accountsLoading ? (
                <div className="flex items-center justify-center py-6 text-neutral-500 text-sm">
                  <Spinner size={16} className="mr-2" /> Memuat akun...
                </div>
              ) : visibleAccounts.length === 0 ? (
                <div className="py-6 text-center text-sm text-neutral-500">
                  Belum ada akun.
                </div>
              ) : (
                visibleAccounts.map((a) => {
                  const checked = selectedAccountIds.includes(a.id);
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
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{a.name}</div>
                        <div className="text-[10px] text-neutral-500 truncate">@{a.username}</div>
                      </div>
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold uppercase', platformColor(a.type))}>
                        {a.type}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              {selectedAccountIds.length} akun dipilih · total post yang akan dibuat: {selectedAccountIds.length * items.length}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">Jadwal</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Mulai"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
              <Select
                label="Interval antar post"
                value={String(intervalMin)}
                onChange={(e) => setIntervalMin(parseInt(e.target.value, 10))}
              >
                <option value="5">Tiap 5 menit</option>
                <option value="15">Tiap 15 menit</option>
                <option value="30">Tiap 30 menit</option>
                <option value="60">Tiap 1 jam</option>
                <option value="120">Tiap 2 jam</option>
                <option value="240">Tiap 4 jam</option>
                <option value="1440">Tiap 1 hari</option>
              </Select>
            </div>
            {items.length > 0 && (
              <p className="mt-1 text-xs text-neutral-500">
                Post pertama: {startAt ? new Date(startAt).toLocaleString('id-ID') : '-'} · Post terakhir:{' '}
                {startAt
                  ? new Date(
                      new Date(startAt).getTime() + (items.length - 1) * intervalMin * 60_000,
                    ).toLocaleString('id-ID')
                  : '-'}
              </p>
            )}
          </section>
        </div>

        {/* RIGHT — Items list */}
        <div>
          <h3 className="mb-2 text-sm font-semibold sticky top-0 bg-white">
            Produk ({items.length})
          </h3>
          <div className="space-y-2">
            {items.map((it, idx) => {
              const scheduleAtMs = startAt
                ? new Date(startAt).getTime() + idx * intervalMin * 60_000
                : 0;
              return (
                <div
                  key={it.product.itemid}
                  className={cn(
                    'rounded-lg border bg-white p-3',
                    it.status === 'success' && 'border-green-300 bg-green-50',
                    it.status === 'error' && 'border-red-300 bg-red-50',
                    it.status === 'generating' && 'border-blue-300',
                    it.status === 'scheduling' && 'border-amber-300',
                  )}
                >
                  <div className="flex gap-3">
                    {it.product.images?.[0] ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={it.product.images[0]}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 shrink-0 rounded bg-neutral-200" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate" title={it.product.name}>
                        {it.product.name}
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        {formatRupiah(it.product.price)} · jadwal:{' '}
                        {startAt
                          ? new Date(scheduleAtMs).toLocaleString('id-ID', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '-'}
                      </div>
                      <StatusPill status={it.status} error={it.error} />
                    </div>
                  </div>

                  {mode === 'album' && (
                    <div className="mt-2">
                      <div className="mb-1 flex items-center justify-between text-[10px] text-neutral-500">
                        <span>
                          Pilih gambar untuk album ({it.albumImages.length}/{Math.min(10, it.product.images?.length ?? 0)} dipilih, min 2)
                        </span>
                        <button
                          type="button"
                          onClick={() => setAlbumImagesFor(String(it.product.itemid), [])}
                          className="text-primary hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="grid grid-cols-6 gap-1">
                        {(it.product.images ?? []).map((img) => {
                          const selectedIdx = it.albumImages.indexOf(img);
                          const isSelected = selectedIdx >= 0;
                          return (
                            <button
                              key={img}
                              type="button"
                              onClick={() => toggleAlbumImage(String(it.product.itemid), img)}
                              className={cn(
                                'relative aspect-square overflow-hidden rounded border-2 transition-colors',
                                isSelected ? 'border-primary' : 'border-transparent hover:border-neutral-300',
                              )}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img} alt="" className="h-full w-full object-cover" />
                              {isSelected && (
                                <div className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                                  {selectedIdx + 1}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <Textarea
                    rows={3}
                    value={it.caption}
                    onChange={(e) => updateCaption(String(it.product.itemid), e.target.value)}
                    placeholder="Caption akan muncul di sini setelah generate, atau tulis manual"
                    className="mt-2 text-xs"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border bg-neutral-50 px-6 py-3">
        <div className="text-xs text-neutral-500">
          {isScheduling
            ? `Menjadwalkan ${scheduleProgress.done}/${scheduleProgress.total}...`
            : `${items.filter((it) => it.caption.trim()).length}/${items.length} caption siap`}
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isScheduling || isGenerating}
          >
            Tutup
          </Button>
          <Button
            onClick={scheduleAll}
            loading={isScheduling}
            disabled={isGenerating}
          >
            Schedule All ({mode})
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function StatusPill({ status, error }: { status: ItemState['status']; error?: string }) {
  const map: Record<ItemState['status'], { tone: string; text: string }> = {
    idle: { tone: 'bg-neutral-100 text-neutral-600', text: 'Belum ada caption' },
    generating: { tone: 'bg-blue-100 text-blue-700', text: 'Generating...' },
    ready: { tone: 'bg-amber-100 text-amber-800', text: 'Ready' },
    scheduling: { tone: 'bg-amber-100 text-amber-800', text: 'Scheduling...' },
    success: { tone: 'bg-green-100 text-green-700', text: 'Terjadwal ✓' },
    error: { tone: 'bg-red-100 text-red-700', text: `Error: ${error ?? ''}` },
    skipped: { tone: 'bg-neutral-200 text-neutral-700', text: `Skipped: ${error ?? ''}` },
  };
  const v = map[status];
  return (
    <span
      className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${v.tone}`}
      title={error}
    >
      {v.text}
    </span>
  );
}
