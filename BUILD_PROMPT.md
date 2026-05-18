# SHOPEE TO SOCIAL — Claude Code Build Prompt

## Deskripsi Aplikasi
Web app **Next.js** untuk mengotomatisasi posting produk Shopee ke media sosial. User upload hasil scrape produk Shopee (JSON), pilih produk, generate caption dengan AI, lalu jadwalkan posting ke Facebook/Threads via Repliz API. Multi-akun didukung penuh.

---

## Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **Styling**: Tailwind CSS
- **Auth**: tidak perlu (single user / private tool)
- **AI**: OpenAI API / OpenRouter API / Anthropic Claude API (user pilih provider)
- **Posting**: Repliz Public API (`https://api.repliz.com/public`)
- **Deploy**: Vercel

---

## Langkah 0 — Inisialisasi Project

```bash
npx create-next-app@latest shopee-to-social --typescript --tailwind --app --src-dir --import-alias "@/*"
cd shopee-to-social
npm install @prisma/client prisma @supabase/supabase-js
npm install openai @anthropic-ai/sdk
npm install date-fns
npm install react-hot-toast
npm install @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-checkbox @radix-ui/react-tabs
npx prisma init
```

Buat `.env.local`:
```env
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="xxx"
```

---

## Langkah 1 — Database Schema (Prisma)

File: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Settings {
  id                  String   @id @default(cuid())
  replizApiKey        String?
  openaiKey           String?
  openrouterKey       String?
  claudeKey           String?
  defaultAiProvider   String   @default("openai") // "openai" | "openrouter" | "claude"
  defaultAiModel      String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

model PostHistory {
  id                String   @id @default(cuid())
  productItemid     String
  productName       String
  productUrl        String
  affiliateUrl      String
  caption           String   @db.Text
  imageUrl          String
  platform          String   // "facebook" | "threads" | "tiktok" | "instagram"
  accountId         String   // Repliz accountId
  accountName       String
  replizScheduleId  String?
  scheduleAt        DateTime
  status            String   @default("pending") // "pending" | "success" | "error"
  errorMessage      String?
  createdAt         DateTime @default(now())
}
```

Jalankan:
```bash
npx prisma db push
npx prisma generate
```

---

## Langkah 2 — Struktur Folder

```
src/
├── app/
│   ├── layout.tsx                   # Root layout + Toaster
│   ├── page.tsx                     # Redirect ke /products
│   ├── products/
│   │   └── page.tsx                 # Halaman utama: upload + daftar produk
│   ├── schedule/
│   │   └── page.tsx                 # Dashboard jadwal
│   └── settings/
│       └── page.tsx                 # Settings API keys
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── products/
│   │   ├── JsonUploader.tsx         # Upload / drag-drop JSON
│   │   ├── ProductCard.tsx          # Card produk dengan checkbox
│   │   ├── ProductGrid.tsx          # Grid semua produk
│   │   └── PostFormModal.tsx        # Modal form posting per produk
│   ├── schedule/
│   │   ├── ScheduleTable.tsx        # Table jadwal posting
│   │   └── ScheduleStatusBadge.tsx
│   ├── settings/
│   │   └── SettingsForm.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Select.tsx
│       ├── Modal.tsx
│       ├── Badge.tsx
│       └── Spinner.tsx
├── lib/
│   ├── prisma.ts                    # Prisma client singleton
│   ├── repliz.ts                    # Repliz API client
│   ├── ai.ts                        # AI caption generator (multi-provider)
│   └── types.ts                     # TypeScript types
└── app/api/
    ├── settings/
    │   └── route.ts                 # GET, POST settings
    ├── repliz/
    │   ├── accounts/
    │   │   └── route.ts             # GET akun dari Repliz
    │   └── schedule/
    │       └── route.ts             # GET list jadwal dari Repliz
    ├── caption/
    │   └── route.ts                 # POST generate caption via AI
    └── post/
        └── route.ts                 # POST buat jadwal ke Repliz (multi-akun)
```

---

## Langkah 3 — TypeScript Types

File: `src/lib/types.ts`

```typescript
// Data dari JSON scrape Shopee
export interface ShopeeProduct {
  itemid: number;
  shopid: number;
  name: string;
  description: string;
  price: number;
  price_min: number;
  price_max: number;
  images: string[];
  videos: { url: string; thumbnail: string; duration?: number }[];
  url: string;
  categories: string[];
  brand: string | null;
  shop_name: string;
  shop_location: string;
  rating: number;
  currency: string;
  scraped_at: string;
}

export interface ShopeeJsonFile {
  scraped_at: string;
  query: { type: string; keyword?: string };
  success_count: number;
  products: ShopeeProduct[];
}

// Repliz Account
export interface ReplizAccount {
  id: string;
  name: string;
  username: string;
  picture: string;
  type: 'facebook' | 'instagram' | 'threads' | 'tiktok' | 'linkedin' | 'youtube';
  isConnected: boolean;
}

// Form data untuk membuat post
export interface PostFormData {
  product: ShopeeProduct;
  affiliateUrl: string;
  selectedImageUrl: string;
  captionHint: string;
  generatedCaption: string;
  selectedAccountIds: string[];
  scheduleAt: string; // ISO datetime string
}

// Payload ke Repliz
export interface ReplizSchedulePayload {
  title: string;
  description: string;
  topic: string;
  type: 'image' | 'album' | 'text' | 'link';
  medias: {
    alt: string;
    type: 'image' | 'video';
    thumbnail: string;
    url: string;
    customThumbnail: boolean;
  }[];
  meta: { title: string; description: string; url: string };
  additionalInfo: {
    isAiGenerated: boolean;
    isDraft: boolean;
    collaborators: string[];
    music: { id: string; artist: string; name: string; thumbnail: string };
  };
  replies: [];
  accountId: string;
  scheduleAt: string;
}

// AI Provider
export type AiProvider = 'openai' | 'openrouter' | 'claude';

export interface AppSettings {
  replizApiKey: string | null;
  openaiKey: string | null;
  openrouterKey: string | null;
  claudeKey: string | null;
  defaultAiProvider: AiProvider;
  defaultAiModel: string | null;
}
```

---

## Langkah 4 — Repliz API Client

File: `src/lib/repliz.ts`

```typescript
import { ReplizAccount, ReplizSchedulePayload } from './types';

export class ReplizClient {
  private baseUrl = 'https://api.repliz.com';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey, // sesuaikan header name jika berbeda
    };
  }

  // Ambil semua akun yang terhubung
  async getAccounts(page = 1, limit = 50): Promise<{ docs: ReplizAccount[]; total: number }> {
    const res = await fetch(
      `${this.baseUrl}/public/account?page=${page}&limit=${limit}`,
      { headers: this.headers }
    );
    if (!res.ok) throw new Error(`Repliz getAccounts error: ${res.status}`);
    const data = await res.json();
    return { docs: data.docs, total: data.totalDocs };
  }

  // Buat jadwal posting (satu akun)
  async createSchedule(payload: ReplizSchedulePayload): Promise<{ scheduleId: string }> {
    const res = await fetch(`${this.baseUrl}/public/schedule`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? `Repliz createSchedule error: ${res.status}`);
    }
    return res.json();
  }

  // Ambil list jadwal
  async getSchedules(page = 1, limit = 20) {
    const res = await fetch(
      `${this.baseUrl}/public/schedule?page=${page}&limit=${limit}`,
      { headers: this.headers }
    );
    if (!res.ok) throw new Error(`Repliz getSchedules error: ${res.status}`);
    return res.json();
  }
}

// Helper: build payload Repliz dari data produk
export function buildReplizPayload(
  product: { name: string; description: string; url: string },
  affiliateUrl: string,
  imageUrl: string,
  caption: string,
  accountId: string,
  scheduleAt: string
): ReplizSchedulePayload {
  return {
    title: product.name.substring(0, 100),
    description: caption,
    topic: 'Shopee Product',
    type: 'image',
    medias: [
      {
        alt: product.name,
        type: 'image',
        thumbnail: imageUrl,
        url: imageUrl,
        customThumbnail: false,
      },
    ],
    meta: {
      title: product.name,
      description: product.description.substring(0, 200),
      url: affiliateUrl || product.url,
    },
    additionalInfo: {
      isAiGenerated: true,
      isDraft: false,
      collaborators: [],
      music: { id: '', artist: '', name: '', thumbnail: '' },
    },
    replies: [],
    accountId,
    scheduleAt,
  };
}
```

**PENTING**: Cek format API Key Repliz. Sesuaikan nama header (`x-api-key`, `Authorization: Bearer`, dll) berdasarkan dokumentasi atau coba dengan curl dulu.

---

## Langkah 5 — AI Caption Generator

File: `src/lib/ai.ts`

```typescript
import { AiProvider, ShopeeProduct } from './types';

interface CaptionInput {
  product: ShopeeProduct;
  affiliateUrl: string;
  hint: string; // input dari user, misal: "beli disini: [link]"
  provider: AiProvider;
  apiKey: string;
  model?: string;
}

const CAPTION_SYSTEM_PROMPT = `Kamu adalah copywriter media sosial yang ahli dalam membuat caption produk yang engaging untuk pasar Indonesia. 
Tugasmu membuat caption singkat, menarik, dan mendorong pembelian.
Selalu gunakan bahasa Indonesia yang natural dan friendly.
Sertakan emoji yang relevan.
Akhiri dengan hashtag yang relevan (5-10 hashtag).
Caption maksimal 300 karakter (tidak termasuk hashtag).
Format output:
[caption]

[hashtag]`;

function buildUserPrompt(input: CaptionInput): string {
  const { product, affiliateUrl, hint } = input;
  const price = new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(product.price / 100); // Shopee price dalam sen

  return `Data produk:
Nama: ${product.name}
Harga: ${price}
Kategori: ${product.categories?.join(' > ') ?? '-'}
Toko: ${product.shop_name} (${product.shop_location})
Deskripsi singkat: ${product.description.substring(0, 300)}
Link: ${affiliateUrl || product.url}

${hint ? `Instruksi tambahan dari user: ${hint}` : ''}

Buat caption untuk Facebook dan Threads.`;
}

// OpenAI
async function generateWithOpenAI(prompt: string, apiKey: string, model = 'gpt-4o-mini'): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: CAPTION_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.8,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

// OpenRouter
async function generateWithOpenRouter(prompt: string, apiKey: string, model = 'openai/gpt-4o-mini'): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://shopee-to-social.app',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: CAPTION_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.8,
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

// Anthropic Claude
async function generateWithClaude(prompt: string, apiKey: string, model = 'claude-haiku-4-5-20251001'): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      system: CAPTION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude error: ${res.status}`);
  const data = await res.json();
  return data.content[0].text.trim();
}

// Main generator
export async function generateCaption(input: CaptionInput): Promise<string> {
  const prompt = buildUserPrompt(input);

  switch (input.provider) {
    case 'openai':
      return generateWithOpenAI(prompt, input.apiKey, input.model);
    case 'openrouter':
      return generateWithOpenRouter(prompt, input.apiKey, input.model);
    case 'claude':
      return generateWithClaude(prompt, input.apiKey, input.model);
    default:
      throw new Error(`Unknown AI provider: ${input.provider}`);
  }
}
```

**Model default per provider:**
- OpenAI: `gpt-4o-mini`
- OpenRouter: `openai/gpt-4o-mini` (bisa diganti model apapun yang tersedia)
- Claude: `claude-haiku-4-5-20251001` (paling cepat dan murah untuk caption)

---

## Langkah 6 — API Routes

### `GET/POST /api/settings`

File: `src/app/api/settings/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const settings = await prisma.settings.findFirst();
  if (!settings) return NextResponse.json(null);
  // Jangan expose API keys secara penuh, mask sebagian
  return NextResponse.json({
    ...settings,
    openaiKey: settings.openaiKey ? `sk-...${settings.openaiKey.slice(-4)}` : null,
    openrouterKey: settings.openrouterKey ? `sk-or-...${settings.openrouterKey.slice(-4)}` : null,
    claudeKey: settings.claudeKey ? `sk-ant-...${settings.claudeKey.slice(-4)}` : null,
    replizApiKey: settings.replizApiKey ? `...${settings.replizApiKey.slice(-4)}` : null,
    hasReplizKey: !!settings.replizApiKey,
    hasOpenaiKey: !!settings.openaiKey,
    hasOpenrouterKey: !!settings.openrouterKey,
    hasClaudeKey: !!settings.claudeKey,
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const existing = await prisma.settings.findFirst();

  // Hanya update field yang dikirim (dan bukan masked value)
  const updateData: Record<string, string> = {};
  const fields = ['replizApiKey', 'openaiKey', 'openrouterKey', 'claudeKey', 'defaultAiProvider', 'defaultAiModel'];
  
  for (const field of fields) {
    if (body[field] !== undefined && !body[field]?.includes('...')) {
      updateData[field] = body[field];
    }
  }

  const settings = existing
    ? await prisma.settings.update({ where: { id: existing.id }, data: updateData })
    : await prisma.settings.create({ data: updateData });

  return NextResponse.json({ ok: true });
}
```

### `GET /api/repliz/accounts`

File: `src/app/api/repliz/accounts/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ReplizClient } from '@/lib/repliz';

export async function GET() {
  const settings = await prisma.settings.findFirst();
  if (!settings?.replizApiKey) {
    return NextResponse.json({ error: 'Repliz API key belum diset' }, { status: 400 });
  }

  try {
    const client = new ReplizClient(settings.replizApiKey);
    // Ambil semua akun, pagination jika perlu
    const result = await client.getAccounts(1, 100);
    // Filter hanya yang connected
    const connected = result.docs.filter(a => a.isConnected);
    return NextResponse.json(connected);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

### `POST /api/caption`

File: `src/app/api/caption/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCaption } from '@/lib/ai';

export async function POST(req: Request) {
  const { product, affiliateUrl, hint } = await req.json();

  const settings = await prisma.settings.findFirst();
  if (!settings) return NextResponse.json({ error: 'Settings belum dikonfigurasi' }, { status: 400 });

  const provider = settings.defaultAiProvider as 'openai' | 'openrouter' | 'claude';
  const apiKeyMap = {
    openai: settings.openaiKey,
    openrouter: settings.openrouterKey,
    claude: settings.claudeKey,
  };
  const apiKey = apiKeyMap[provider];
  if (!apiKey) return NextResponse.json({ error: `API key untuk ${provider} belum diset` }, { status: 400 });

  try {
    const caption = await generateCaption({
      product,
      affiliateUrl,
      hint,
      provider,
      apiKey,
      model: settings.defaultAiModel ?? undefined,
    });
    return NextResponse.json({ caption });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

### `POST /api/post`

File: `src/app/api/post/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ReplizClient, buildReplizPayload } from '@/lib/repliz';

export async function POST(req: Request) {
  const { product, affiliateUrl, imageUrl, caption, accountIds, accounts, scheduleAt } = await req.json();
  // accountIds: string[]
  // accounts: ReplizAccount[] (untuk simpan nama akun)

  const settings = await prisma.settings.findFirst();
  if (!settings?.replizApiKey) {
    return NextResponse.json({ error: 'Repliz API key belum diset' }, { status: 400 });
  }

  const client = new ReplizClient(settings.replizApiKey);
  const results = [];

  // Kirim ke setiap akun yang dipilih secara paralel
  await Promise.allSettled(
    accountIds.map(async (accountId: string) => {
      const accountInfo = accounts.find((a: any) => a.id === accountId);
      const payload = buildReplizPayload(product, affiliateUrl, imageUrl, caption, accountId, scheduleAt);

      try {
        const res = await client.createSchedule(payload);

        // Simpan ke history
        await prisma.postHistory.create({
          data: {
            productItemid: String(product.itemid),
            productName: product.name,
            productUrl: product.url,
            affiliateUrl,
            caption,
            imageUrl,
            platform: accountInfo?.type ?? 'unknown',
            accountId,
            accountName: accountInfo?.name ?? accountId,
            replizScheduleId: res.scheduleId,
            scheduleAt: new Date(scheduleAt),
            status: 'pending',
          },
        });

        results.push({ accountId, success: true, scheduleId: res.scheduleId });
      } catch (err: any) {
        // Simpan ke history dengan status error
        await prisma.postHistory.create({
          data: {
            productItemid: String(product.itemid),
            productName: product.name,
            productUrl: product.url,
            affiliateUrl,
            caption,
            imageUrl,
            platform: accountInfo?.type ?? 'unknown',
            accountId,
            accountName: accountInfo?.name ?? accountId,
            scheduleAt: new Date(scheduleAt),
            status: 'error',
            errorMessage: err.message,
          },
        });

        results.push({ accountId, success: false, error: err.message });
      }
    })
  );

  const successCount = results.filter(r => r.success).length;
  return NextResponse.json({
    ok: true,
    successCount,
    failCount: results.length - successCount,
    results,
  });
}
```

### `GET /api/repliz/schedule`

File: `src/app/api/repliz/schedule/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ReplizClient } from '@/lib/repliz';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '20');

  const settings = await prisma.settings.findFirst();
  if (!settings?.replizApiKey) {
    return NextResponse.json({ error: 'Repliz API key belum diset' }, { status: 400 });
  }

  const client = new ReplizClient(settings.replizApiKey);
  const data = await client.getSchedules(page, limit);
  return NextResponse.json(data);
}
```

---

## Langkah 7 — Halaman Settings

File: `src/app/settings/page.tsx`

Tampilkan form untuk input:
- **Repliz API Key** — dengan tombol "Test & Load Accounts" yang langsung fetch akun dan tampilkan jumlah akun terkoneksi
- **OpenAI API Key**
- **OpenRouter API Key**
- **Claude API Key**
- **Default AI Provider** — dropdown (OpenAI / OpenRouter / Claude)
- **Default AI Model** — text input (misal: `gpt-4o-mini`, `claude-haiku-4-5-20251001`)

UX detail:
- API key yang sudah tersimpan ditampilkan masked (`sk-...xxxx`)
- Setiap field punya tombol "Update" tersendiri atau satu tombol "Simpan Semua"
- Setelah Repliz key disimpan, otomatis tampilkan badge "X akun terkoneksi" dengan breakdown per platform (ikon Facebook, Threads, dll)

---

## Langkah 8 — Halaman Products (Halaman Utama)

File: `src/app/products/page.tsx`

### 8a — Upload JSON

Komponen `JsonUploader`:
- Drag & drop area atau klik untuk upload file JSON
- Parse file dan validasi format (harus punya field `products[]`)
- Simpan ke `useState` atau `localStorage` (tidak perlu ke DB)
- Tampilkan info: "60 produk ditemukan | Keyword: baju anak | Scraped: 18 Mei 2026"

### 8b — Product Grid

Komponen `ProductGrid` + `ProductCard`:
- Grid responsif (3-4 kolom di desktop)
- Setiap card tampilkan:
  - Gambar pertama produk (dari `images[0]`)
  - Nama produk (truncate 2 baris)
  - Harga (format Rupiah)
  - Nama toko + lokasi
  - Rating bintang
  - Badge kategori utama
- Tombol **"Buat Post"** di setiap card
- Search/filter bar di atas (filter by kategori, cari nama)

### 8c — Post Form Modal

Komponen `PostFormModal` — modal yang muncul ketika klik "Buat Post":

**Section 1: Produk**
- Preview nama produk dan harga

**Section 2: Pilih Gambar**
- Tampilkan semua `images[]` sebagai thumbnail grid
- User klik untuk pilih gambar yang akan diposting
- Default: gambar pertama

**Section 3: Link Affiliate**
- Input field "Affiliate URL"
- Pre-filled dengan URL produk Shopee original
- User ubah ke link affiliate mereka

**Section 4: Caption**
- Textarea "Hint Caption" — placeholder: `"beli disini: [link affiliate]"`
- Tombol **"Generate Caption"** → loading → tampilkan hasil di textarea "Caption Final"
- Textarea "Caption Final" — bisa diedit manual setelah generate
- Counter karakter

**Section 5: Pilih Akun**
- Fetch dari `/api/repliz/accounts` (dengan loading state)
- Tampilkan list akun dengan ikon platform, nama, username, foto profil
- Multi-select dengan checkbox
- Filter tab: Semua | Facebook | Threads | Instagram | dll
- Tombol "Pilih Semua Facebook", "Pilih Semua Threads"

**Section 6: Jadwal**
- DateTime picker (date + time)
- Default: sekarang + 1 jam

**Footer Modal:**
- Tombol "Batal"
- Tombol "Jadwalkan Post" → loading → success toast

---

## Langkah 9 — Halaman Schedule Dashboard

File: `src/app/schedule/page.tsx`

Tampilkan data dari `prisma.postHistory` (bukan dari Repliz API langsung, karena sudah kita simpan):

Table dengan kolom:
- Gambar produk (thumbnail kecil)
- Nama produk (truncate)
- Akun tujuan (ikon platform + nama)
- Caption (truncate 2 baris, hover expand)
- Jadwal (tanggal + jam, format lokal)
- Status badge: `pending` (kuning) | `success` (hijau) | `error` (merah)
- Aksi: link ke Repliz dashboard (jika ada scheduleId)

Filter di atas:
- Filter by status
- Filter by platform
- Date range picker

Pagination.

---

## Langkah 10 — Layout & Navigasi

File: `src/components/layout/Sidebar.tsx`

Sidebar dengan navigasi:
- **Produk** (icon: grid) → `/products`
- **Jadwal** (icon: calendar) → `/schedule`
- **Settings** (icon: gear) → `/settings`

Tampilkan badge di "Jadwal" jika ada post pending hari ini.

Root layout (`src/app/layout.tsx`) wrap semua halaman dengan Sidebar + Toaster dari `react-hot-toast`.

---

## Langkah 11 — UI & Design

Gunakan Tailwind CSS dengan design system yang konsisten:

**Color palette:**
```
Primary: #FF6B35 (oranye Shopee-ish tapi lebih modern)
Background: #0F0F0F (dark) atau #FAFAF9 (light — pilih salah satu)
Surface: #1A1A1A atau #FFFFFF
Border: #2A2A2A atau #E5E5E5
Text primary: #FFFFFF atau #0F0F0F
Text secondary: #888888 atau #6B7280
Success: #22C55E
Error: #EF4444
Warning: #F59E0B
```

**Typography:**
- Heading: font tebal, ukuran besar dan clear
- Body: mudah dibaca, line-height 1.6

**Komponen UI yang harus konsisten:**
- Button: primary (oranye filled), secondary (ghost), danger (red)
- Badge platform: warna unik per platform (biru FB, hitam Threads, dll)
- Loading state: skeleton loader untuk product grid, spinner untuk tombol
- Empty state: ilustrasi + teks ketika belum ada produk / jadwal
- Error state: pesan error yang jelas dengan instruksi

---

## Langkah 12 — Edge Cases & Error Handling

Pastikan semua skenario ini ditangani dengan baik:

| Skenario | Penanganan |
|---|---|
| Repliz API key salah | Toast error + highlight field di Settings |
| AI API key salah | Toast error dengan nama provider yang salah |
| JSON scrape format tidak valid | Alert dengan pesan jelas |
| Gambar Shopee tidak bisa dimuat | Fallback placeholder image |
| Posting ke 5 akun, 2 gagal | Toast "3 berhasil, 2 gagal" + detail per akun |
| Caption generate gagal | Biarkan user input manual |
| Repliz rate limit | Retry dengan exponential backoff |
| Jadwal di masa lalu | Validasi sebelum submit + warning |
| Produk sudah pernah dipost | Tampilkan indikator "sudah dipost" di card |

---

## Langkah 13 — Environment Variables

File: `.env.local` (tidak di-commit):
```env
# Supabase / Database
DATABASE_URL="postgresql://postgres:[password]@[host]:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="xxx"
```

Semua API keys (Repliz, OpenAI, dll) **disimpan di database** (tabel `Settings`), bukan di env — supaya bisa diubah dari UI tanpa redeploy.

---

## Langkah 14 — Testing Manual

Urutan testing setelah build:

```
1. Buka /settings
   → Input Repliz API key → klik "Test" → pastikan muncul daftar akun

2. Input salah satu AI key → set default provider

3. Buka /products
   → Upload file JSON scrape
   → Pastikan produk muncul di grid

4. Klik "Buat Post" pada satu produk
   → Ubah URL ke affiliate
   → Klik "Generate Caption" → pastikan caption muncul
   → Pilih 2 akun berbeda
   → Set jadwal 5 menit ke depan
   → Klik "Jadwalkan Post"

5. Buka /schedule
   → Pastikan post muncul di table
   → Tunggu jadwal tiba → cek di Repliz dashboard apakah terposting

6. Test error case:
   → Input AI key yang salah → pastikan error message jelas
```

---

## Catatan Penting untuk Claude Code

1. **Prisma client singleton** — buat `src/lib/prisma.ts` dengan pattern singleton untuk menghindari multiple connections di Next.js dev mode
2. **API keys di server only** — semua call ke Repliz dan AI harus dari API routes (`/api/...`), bukan dari client component langsung
3. **Repliz header auth** — di `ReplizClient`, cek format header yang benar. Coba `x-api-key`, jika tidak bisa coba `Authorization: Bearer` atau `Authorization: Basic`. Sesuaikan setelah testing pertama
4. **Harga Shopee** — field `price` di JSON scrape dalam satuan **sen** (dibagi 100 untuk dapat Rupiah). Perhatikan ini saat display dan di prompt AI
5. **Shopee image URL** — URL dari `down-id.img.susercontent.com` bisa langsung dipakai sebagai `url` di Repliz medias (sudah dikonfirmasi bisa)
6. **Multi-account posting** — gunakan `Promise.allSettled` (bukan `Promise.all`) supaya kegagalan satu akun tidak menghentikan akun lain
7. **localStorage untuk produk** — data produk dari JSON upload tidak perlu disimpan ke DB, cukup di `localStorage` atau `sessionStorage` di browser, karena user akan upload ulang untuk sesi berbeda
8. **Twitter/X coming soon** — di UI pilih akun, sembunyikan akun bertipe `twitter` dengan badge "Coming Soon" jika ada, jangan error
