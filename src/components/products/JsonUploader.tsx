'use client';

import * as React from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { ShopeeJsonFile } from '@/lib/types';
import { cn } from '@/lib/utils';

interface JsonUploaderProps {
  onLoaded: (file: ShopeeJsonFile) => void;
}

export function JsonUploader({ onLoaded }: JsonUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);

  async function handleFile(file: File) {
    if (!file.name.endsWith('.json')) {
      toast.error('File harus berformat .json');
      return;
    }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.products)) {
        toast.error('Format tidak valid: field "products" tidak ditemukan');
        return;
      }
      onLoaded(parsed as ShopeeJsonFile);
      toast.success(`${parsed.products.length} produk dimuat`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal parse JSON');
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
        Drop file JSON hasil scrape Shopee di sini
      </p>
      <p className="mt-1 text-xs text-neutral-500">atau klik tombol di bawah</p>
      <div className="mt-4">
        <Button variant="secondary" onClick={() => inputRef.current?.click()}>
          Pilih File JSON
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
