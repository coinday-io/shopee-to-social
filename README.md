# Shopee to Social

Dashboard Next.js untuk otomasi posting produk Shopee ke Facebook, Threads, Instagram, TikTok dst. via [Repliz](https://repliz.com) API. Caption di-generate via OpenAI / OpenRouter / Anthropic Claude.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma · Supabase/Postgres · Radix UI · react-hot-toast.

## Setup

### 1. Database

Buat project di [Supabase](https://supabase.com) atau Postgres lain, lalu salin connection string.

```bash
cp .env.example .env.local
# Edit .env.local, isi DATABASE_URL
```

### 2. Install & migrate

```bash
npm install
npx prisma db push
```

### 3. Run dev

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) — akan redirect ke `/products`.

### 4. Konfigurasi API keys

Buka **/settings** dan isi:
- **Repliz API key** — tekan "Test & Load Accounts" untuk verifikasi
- Minimal salah satu dari OpenAI / OpenRouter / Claude API key
- Pilih default AI provider + model

API keys disimpan di tabel `Settings` di DB (bukan di env) supaya bisa diubah dari UI tanpa redeploy.

## Alur penggunaan

1. **/products** — upload file JSON hasil scrape Shopee (harus punya field `products[]`)
2. Klik **"Buat Post"** pada produk → modal terbuka:
   - pilih gambar dari `images[]`
   - ganti URL produk menjadi link affiliate
   - generate caption (AI) atau tulis manual
   - pilih satu atau banyak akun (multi-select, filter per platform)
   - set tanggal+jam posting
   - submit → Repliz dijadwalkan paralel per akun
3. **/schedule** — lihat riwayat posting, filter by status / platform / tanggal

## Struktur

```
src/
├── app/
│   ├── api/                 # route handlers: settings, repliz, caption, post, history
│   ├── products/            # halaman utama (upload + grid + modal)
│   ├── schedule/            # dashboard jadwal
│   └── settings/            # konfigurasi API keys
├── components/
│   ├── layout/              # Sidebar, Header
│   ├── products/            # JsonUploader, ProductGrid, ProductCard, PostFormModal
│   ├── schedule/            # ScheduleTable, ScheduleStatusBadge
│   ├── settings/            # SettingsForm
│   └── ui/                  # Button, Input, Select, Modal, Badge, Spinner
└── lib/
    ├── prisma.ts            # Prisma singleton
    ├── repliz.ts            # Repliz API client + payload builder
    ├── ai.ts                # multi-provider caption generator
    ├── types.ts             # TypeScript types
    └── utils.ts             # cn, formatRupiah, platformColor, dll
```

## Catatan

- **Repliz header auth** — saat ini pakai `x-api-key`. Kalau Repliz pakai header berbeda, edit `src/lib/repliz.ts`.
- **Shopee price** dalam satuan **sen** (dibagi 100 untuk Rupiah) — sudah dihandle di `formatRupiah()`.
- **Image URL Shopee** (`*.susercontent.com`) bisa langsung dipakai sebagai media di Repliz.
- **Multi-account posting** pakai `Promise.allSettled` — satu akun gagal tidak menghentikan yang lain. History tersimpan per-akun dengan status `pending` / `success` / `error`.
- **Produk dari JSON upload** disimpan di `localStorage` (bukan DB) — refresh halaman tetap aman, ganti file akan hapus state lama.
- **Akun Twitter/X** disembunyikan otomatis (coming soon).

## Build / Deploy

```bash
npm run build
npm start
```

Untuk deploy Vercel: hubungkan repo, set `DATABASE_URL` di env settings, lalu deploy.
