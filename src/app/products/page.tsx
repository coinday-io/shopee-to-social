'use client';

import * as React from 'react';
import { Header } from '@/components/layout/Header';
import { JsonUploader } from '@/components/products/JsonUploader';
import { ProductGrid } from '@/components/products/ProductGrid';
import { PostFormModal } from '@/components/products/PostFormModal';
import { BulkPostModal } from '@/components/products/BulkPostModal';
import { Button } from '@/components/ui/Button';
import { ShopeeJsonFile, ShopeeProduct } from '@/lib/types';

const STORAGE_KEY = 'shopee_products_file';
const POSTED_KEY = 'shopee_posted_itemids';

export default function ProductsPage() {
  const [file, setFile] = React.useState<ShopeeJsonFile | null>(null);
  const [selected, setSelected] = React.useState<ShopeeProduct | null>(null);
  const [posted, setPosted] = React.useState<Set<string>>(new Set());
  const [pickedIds, setPickedIds] = React.useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setFile(JSON.parse(raw));
      const postedRaw = localStorage.getItem(POSTED_KEY);
      if (postedRaw) setPosted(new Set(JSON.parse(postedRaw)));
    } catch {
      // ignore
    }
  }, []);

  function handleLoaded(parsed: ShopeeJsonFile) {
    setFile(parsed);
    setPickedIds(new Set());
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch {
      // ignore quota
    }
  }

  function clearProducts() {
    setFile(null);
    setPickedIds(new Set());
    localStorage.removeItem(STORAGE_KEY);
  }

  function markPosted(itemId: string) {
    setPosted((prev) => {
      const next = new Set(prev);
      next.add(itemId);
      try {
        localStorage.setItem(POSTED_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function markManyPosted(itemIds: string[]) {
    setPosted((prev) => {
      const next = new Set(prev);
      itemIds.forEach((id) => next.add(id));
      try {
        localStorage.setItem(POSTED_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function toggleSelect(p: ShopeeProduct) {
    setPickedIds((prev) => {
      const next = new Set(prev);
      const id = String(p.itemid);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const pickedProducts = React.useMemo(
    () => (file?.products ?? []).filter((p) => pickedIds.has(String(p.itemid))),
    [file, pickedIds],
  );

  return (
    <div>
      <Header
        title="Produk"
        subtitle="Upload hasil scrape Shopee dan jadwalkan posting"
      />
      <div className="p-6 pb-32 space-y-6">
        {!file ? (
          <JsonUploader onLoaded={handleLoaded} />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3">
              <div className="text-sm">
                <span className="font-medium">{file.products.length} produk</span>
                {file.query?.keyword && (
                  <>
                    {' · '}
                    <span className="text-neutral-500">Keyword: {file.query.keyword}</span>
                  </>
                )}
                {file.scraped_at && (
                  <>
                    {' · '}
                    <span className="text-neutral-500">
                      Scraped: {new Date(file.scraped_at).toLocaleString('id-ID')}
                    </span>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={clearProducts}>
                  Ganti File
                </Button>
              </div>
            </div>

            <ProductGrid
              products={file.products}
              postedItemIds={posted}
              selectedItemIds={pickedIds}
              onToggleSelect={toggleSelect}
              onCreatePost={setSelected}
            />
          </>
        )}
      </div>

      {/* Floating bulk action bar */}
      {pickedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-full border border-border bg-white px-4 py-2 shadow-lg">
            <span className="text-sm font-medium">
              {pickedIds.size} produk dipilih
            </span>
            <button
              onClick={() => setPickedIds(new Set())}
              className="text-xs text-neutral-500 hover:text-neutral-800"
            >
              Clear
            </button>
            <Button size="sm" onClick={() => setBulkOpen(true)}>
              Bulk Post →
            </Button>
          </div>
        </div>
      )}

      <PostFormModal
        open={!!selected}
        product={selected}
        onClose={() => setSelected(null)}
        onSuccess={markPosted}
      />

      <BulkPostModal
        open={bulkOpen}
        products={pickedProducts}
        onClose={() => setBulkOpen(false)}
        onSuccess={(itemIds) => {
          markManyPosted(itemIds);
          setPickedIds(new Set());
          setBulkOpen(false);
        }}
      />
    </div>
  );
}
