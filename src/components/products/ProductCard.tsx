'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ShopeeProduct } from '@/lib/types';
import { formatRupiah, truncate } from '@/lib/utils';

interface ProductCardProps {
  product: ShopeeProduct;
  alreadyPosted?: boolean;
  onCreatePost: (product: ShopeeProduct) => void;
}

export function ProductCard({ product, alreadyPosted, onCreatePost }: ProductCardProps) {
  const [imgError, setImgError] = React.useState(false);
  const img = product.images?.[0];

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-white transition-shadow hover:shadow-md">
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
        {alreadyPosted && (
          <div className="absolute left-2 top-2">
            <Badge tone="success">Sudah dipost</Badge>
          </div>
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
