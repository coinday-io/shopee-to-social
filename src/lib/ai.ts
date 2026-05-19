import { AiProvider, ShopeeProduct } from './types';

interface CaptionInput {
  product: ShopeeProduct;
  affiliateUrl: string;
  hint: string;
  provider: AiProvider;
  apiKey: string;
  model?: string;
}

const CAPTION_SYSTEM_PROMPT = `Kamu adalah copywriter media sosial ahli untuk pasar Indonesia.
Tugasmu: buat SATU caption produk yang singkat, engaging, dan mendorong pembelian.

ATURAN OUTPUT (penting):
- Output kamu adalah caption final yang siap di-copy-paste ke post. Nothing else.
- Jangan tulis label apapun seperti "Caption:", "Hashtag:", "[caption]", "[hashtag]", "Versi 1", "Untuk Facebook", dst.
- Jangan buat dua versi (untuk platform berbeda). Satu caption universal saja.
- Jangan ulang nama produk di awal caption (langsung ke value proposition).

GAYA:
- Bahasa Indonesia natural dan friendly.
- 2-4 emoji relevan.
- Maksimal ~280 karakter sebelum hashtag.
- Sebutkan harga kalau relevan.
- Akhiri dengan 5-10 hashtag relevan di baris terakhir (dipisah spasi).
- Sertakan link affiliate dalam caption (kalau hint dari user tidak memberi format khusus, taruh sebelum hashtag).`;

function buildUserPrompt(input: CaptionInput): string {
  const { product, affiliateUrl, hint } = input;
  const price = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(product.price);

  return `Data produk:
Nama: ${product.name}
Harga: ${price}
Kategori: ${product.categories?.join(' > ') ?? '-'}
Toko: ${product.shop_name} (${product.shop_location})
Deskripsi singkat: ${(product.description ?? '').substring(0, 300)}
Link affiliate: ${affiliateUrl || product.url}

${hint ? `Instruksi tambahan dari user: ${hint}` : ''}`;
}

async function generateWithOpenAI(prompt: string, apiKey: string, model = 'gpt-4o-mini') {
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
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text().catch(() => '')}`);
  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? '').trim();
}

async function generateWithOpenRouter(prompt: string, apiKey: string, model = 'openai/gpt-4o-mini') {
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
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text().catch(() => '')}`);
  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? '').trim();
}

async function generateWithClaude(prompt: string, apiKey: string, model = 'claude-haiku-4-5-20251001') {
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
  if (!res.ok) throw new Error(`Claude error ${res.status}: ${await res.text().catch(() => '')}`);
  const data = await res.json();
  return (data.content?.[0]?.text ?? '').trim();
}

/**
 * Strip AI artifacts that occasionally leak into the output:
 * - literal placeholder tokens like "[caption]" / "[hashtag]" on their own line
 * - leading labels like "Caption:" / "Hashtag:" / "Versi 1:"
 * - leading/trailing whitespace and excessive blank lines
 */
function sanitizeCaption(raw: string): string {
  let text = raw.trim();
  // Strip surrounding triple-backtick fences if model wrapped in code block
  text = text.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/i, '');
  // Drop standalone placeholder lines
  text = text
    .split('\n')
    .filter((line) => !/^\s*\[(caption|hashtag|tags?)\]\s*$/i.test(line))
    .join('\n');
  // Remove leading labels at start of caption
  text = text.replace(/^\s*(caption|hashtag|tags?|versi\s*\d+|untuk\s+\w+)\s*[:\-]\s*/i, '');
  // Collapse 3+ consecutive newlines down to 2
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

export async function generateCaption(input: CaptionInput): Promise<string> {
  const prompt = buildUserPrompt(input);
  let raw: string;
  switch (input.provider) {
    case 'openai':
      raw = await generateWithOpenAI(prompt, input.apiKey, input.model);
      break;
    case 'openrouter':
      raw = await generateWithOpenRouter(prompt, input.apiKey, input.model);
      break;
    case 'claude':
      raw = await generateWithClaude(prompt, input.apiKey, input.model);
      break;
    default:
      throw new Error(`Unknown AI provider: ${input.provider}`);
  }
  return sanitizeCaption(raw);
}
