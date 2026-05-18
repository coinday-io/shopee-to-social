'use client';

import * as React from 'react';
import { Header } from '@/components/layout/Header';
import { JsonUploader } from '@/components/products/JsonUploader';
import { ProductGrid } from '@/components/products/ProductGrid';
import { PostFormModal } from '@/components/products/PostFormModal';
import { Button } from '@/components/ui/Button';
import { ShopeeJsonFile, ShopeeProduct } from '@/lib/types';

const STORAGE_KEY = 'shopee_products_file';
const POSTED_KEY = 'shopee_posted_itemids';

export default function ProductsPage() {
  const [file, setFile] = React.useState<ShopeeJsonFile | null>(null);
  const [selected, setSelected] = React.useState<ShopeeProduct | null>(null);
  const [posted, setPosted] = React.useState<Set<string>>(new Set());

  // Restore from localStorage on mount
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch {
      // ignore quota
    }
  }

  function clearProducts() {
    setFile(null);
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

  return (
    <div>
      <Header
        title="Produk"
        subtitle="Upload hasil scrape Shopee dan jadwalkan posting"
      />
      <div className="p-6 space-y-6">
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
              onCreatePost={setSelected}
            />
          </>
        )}
      </div>

      <PostFormModal
        open={!!selected}
        product={selected}
        onClose={() => setSelected(null)}
        onSuccess={markPosted}
      />
    </div>
  );
}
