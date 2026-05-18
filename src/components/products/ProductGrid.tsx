'use client';

import * as React from 'react';
import { ShopeeProduct } from '@/lib/types';
import { Input } from '@/components/ui/Input';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: ShopeeProduct[];
  postedItemIds: Set<string>;
  onCreatePost: (product: ShopeeProduct) => void;
}

export function ProductGrid({ products, postedItemIds, onCreatePost }: ProductGridProps) {
  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState('');

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      for (const c of p.categories ?? []) set.add(c);
    }
    return Array.from(set).slice(0, 30);
  }, [products]);

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (category && !(p.categories ?? []).includes(category)) return false;
      return true;
    });
  }, [products, search, category]);

  if (products.length === 0) return null;

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Cari nama produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCategory('')}
            className={`rounded-full px-3 py-1 text-xs font-medium border ${category === '' ? 'bg-primary text-white border-primary' : 'bg-white border-border text-neutral-700 hover:bg-neutral-50'}`}
          >
            Semua
          </button>
          {categories.slice(0, 6).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1 text-xs font-medium border ${category === c ? 'bg-primary text-white border-primary' : 'bg-white border-border text-neutral-700 hover:bg-neutral-50'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 text-sm text-neutral-500">
        Menampilkan {filtered.length} dari {products.length} produk
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((p) => (
          <ProductCard
            key={p.itemid}
            product={p}
            alreadyPosted={postedItemIds.has(String(p.itemid))}
            onCreatePost={onCreatePost}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-white p-10 text-center text-sm text-neutral-500">
          Tidak ada produk cocok dengan filter ini.
        </div>
      )}
    </div>
  );
}
