'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ShopeeProduct } from '@/lib/types';
import { formatRupiah, truncate } from '@/lib/utils';

interface ProductCardProps {
  product: ShopeeProduct;
  alreadyPosted?: boolean;
  selected?: boolean;
  onToggleSelect?: (product: ShopeeProduct) => void;
  onCreatePost: (product: ShopeeProduct) => void;
}

export function ProductCard({
  product,
  alreadyPosted,
  selected,
  onToggleSelect,
  onCreatePost,
}: ProductCardProps) {
  const [imgError, setImgError] = React.useState(false);
  const img = product.images?.[0];

  return (
    <div className={`group flex flex-col overflow-hidden rounded-xl border bg-white transition-all hover:shadow-md ${selected ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}>
      <div className="relative aspect-square overflow-hidden bg-neutral-100">
        {img && !imgError ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={img}
            alt={product.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-400">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {alreadyPosted && <Badge tone="success">Sudah dipost</Badge>}
          {product.affiliate_url && <Badge tone="primary">🔗 Affiliate</Badge>}
        </div>
        {onToggleSelect && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(product);
            }}
            aria-label={selected ? 'Deselect' : 'Select'}
            className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md border-2 transition-all ${
              selected
                ? 'bg-primary border-primary text-white'
                : 'bg-white/90 border-white/90 text-transparent hover:text-neutral-400 hover:border-neutral-300'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        )}
        {product.categories?.[0] && (
          <div className="absolute bottom-2 left-2">
            <Badge tone="neutral" className="bg-white/90 backdrop-blur">
              {truncate(product.categories[0], 20)}
            </Badge>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-sm font-medium leading-snug line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>
        <div className="mt-2 text-base font-semibold text-primary">
          {formatRupiah(product.price)}
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500">
            <path d="M12 2l2.39 7.36H22l-6.18 4.49L18.21 21 12 16.5 5.79 21l2.39-7.15L2 9.36h7.61z" />
          </svg>
          {(product.rating ?? 0).toFixed(1)} · {truncate(product.shop_name ?? '', 16)}
        </div>
        <div className="mt-1 text-xs text-neutral-400">
          {truncate(product.shop_location ?? '', 24)}
        </div>
        <Button
          onClick={() => onCreatePost(product)}
          size="sm"
          className="mt-3 w-full"
        >
          Buat Post
        </Button>
      </div>
    </div>
  );
}
