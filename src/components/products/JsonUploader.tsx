'use client';

import * as React from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { ShopeeJsonFile } from '@/lib/types';
import { csvToShopeeJsonFile } from '@/lib/csv';
import { cn } from '@/lib/utils';

interface JsonUploaderProps {
  onLoaded: (file: ShopeeJsonFile) => void;
}

export function JsonUploader({ onLoaded }: JsonUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);

  async function handleFile(file: File) {
    const lowerName = file.name.toLowerCase();
    const isJson = lowerName.endsWith('.json');
    const isCsv = lowerName.endsWith('.csv');

    if (!isJson && !isCsv) {
      toast.error('Format harus .json atau .csv');
      return;
    }
    try {
      const text = await file.text();
      let parsed: ShopeeJsonFile;
      if (isCsv) {
        parsed = csvToShopeeJsonFile(text);
      } else {
        const json = JSON.parse(text);
        if (!json || !Array.isArray(json.products)) {
          toast.error('Format JSON tidak valid: field "products" tidak ditemukan');
          return;
        }
        parsed = json as ShopeeJsonFile;
      }
      if (parsed.products.length === 0) {
        toast.error('File tidak mengandung produk');
        return;
      }
      onLoaded(parsed);
      toast.success(`${parsed.products.length} produk dimuat dari ${isCsv ? 'CSV' : 'JSON'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal parse file');
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void handleFile(file);
      }}
      className={cn(
        'rounded-xl border-2 border-dashed bg-white px-6 py-10 text-center transition-colors',
        dragOver ? 'border-primary bg-primary-50' : 'border-border',
      )}
    >
      <svg
        className="mx-auto mb-3 text-neutral-400"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <p className="text-sm font-medium text-neutral-800">
        Drop file <span className="text-primary">.json</span> atau{' '}
        <span className="text-primary">.csv</span> hasil scrape Shopee di sini
      </p>
      <p className="mt-1 text-xs text-neutral-500">atau klik tombol di bawah</p>
      <div className="mt-4">
        <Button variant="secondary" onClick={() => inputRef.current?.click()}>
          Pilih File
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".json,.csv,application/json,text/csv"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />
      <details className="mt-5 text-left text-xs text-neutral-500 max-w-md mx-auto">
        <summary className="cursor-pointer text-center hover:text-neutral-700">
          Format CSV yang diharapkan
        </summary>
        <p className="mt-2">
          Header: <code>itemid,shopid,name,url,price,price_min,price_max,currency,stock,sold,rating,rating_count,shop_name,shop_location,brand,categories,description,image_count,images,video_count,videos,scraped_at,affiliate_url</code>
        </p>
        <p className="mt-1">
          Multi-value: <code>images</code> &amp; <code>videos</code> dipisah <code>|</code>,
          <code>categories</code> dipisah <code>&gt;</code>.
        </p>
      </details>
    </div>
  );
}
