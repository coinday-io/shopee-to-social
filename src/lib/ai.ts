import { AiProvider, ShopeeProduct } from './types';

interface CaptionInput {
  product: ShopeeProduct;
  affiliateUrl: string;
  hint: string;
  includeAffiliate: boolean;
  provider: AiProvider;
  apiKey: string;
  model?: string;
}

const BASE_RULES = `Kamu adalah copywriter media sosial ahli untuk pasar Indonesia.
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
- JANGAN PERNAH menyebutkan harga produk (no "Rp", no angka harga, no "murah Rp X", no "hanya Rp X"). Sebut value/manfaat tapi tidak harga.
- Akhiri dengan 5-10 hashtag relevan di baris terakhir (dipisah spasi).`;

const RULE_WITH_LINK = `\n- WAJIB sertakan link affiliate dalam caption. Format default: "Beli disini: <link>" di baris sendiri sebelum hashtag, kecuali user memberi format spesifik di instruksi tambahan.`;
const RULE_WITHOUT_LINK = `\n- JANGAN sertakan URL atau link apapun dalam caption. Jangan tulis "Beli disini" atau ajakan klik link.`;

function buildSystemPrompt(includeAffiliate: boolean): string {
  return BASE_RULES + (includeAffiliate ? RULE_WITH_LINK : RULE_WITHOUT_LINK);
}

function buildUserPrompt(input: CaptionInput): string {
  const { product, affiliateUrl, hint, includeAffiliate } = input;

  const linkLine = includeAffiliate
    ? `Link affiliate yang harus disertakan: ${affiliateUrl || product.url}`
    : `(Link tidak perlu disertakan dalam caption.)`;

  return `Data produk:
Nama: ${product.name}
Kategori: ${product.categories?.join(' > ') ?? '-'}
Toko: ${product.shop_name} (${product.shop_location})
Deskripsi singkat: ${(product.description ?? '').substring(0, 300)}
${linkLine}

${hint ? `Instruksi tambahan dari user: ${hint}` : ''}

INGAT: dilarang menyebutkan harga dalam caption.`;
}

async function generateWithOpenAI(systemPrompt: string, prompt: string, apiKey: string, model = 'gpt-4o-mini') {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
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

async function generateWithOpenRouter(systemPrompt: string, prompt: string, apiKey: string, model = 'openai/gpt-4o-mini') {
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
        { role: 'system', content: systemPrompt },
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

async function generateWithClaude(systemPrompt: string, prompt: string, apiKey: string, model = 'claude-haiku-4-5-20251001') {
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
      system: systemPrompt,
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

  // Strip Rupiah price mentions ("Rp 52.500", "Rp52.500", "hanya Rp 5.500", "IDR 52,500", etc.)
  // Common patterns from AI: "hanya Rp X", "cuma Rp X", "harga Rp X", or bare "Rp X"
  const priceWord = /(?:hanya|cuma|harga|cuma\s+seharga|seharga|mulai(?:\s+dari)?|dengan\s+harga)\s+/i;
  const priceValue = /(?:Rp\.?|IDR)\s*[\d.,]+(?:\s*(?:ribu|rb|juta|jt|k))?/gi;
  // Remove price phrases with leading words ("hanya Rp 52.500!", optional trailing punctuation)
  text = text.replace(new RegExp(`${priceWord.source}${priceValue.source}[.,!?]?`, 'gi'), '');
  // Remove bare Rp/IDR mentions
  text = text.replace(priceValue, '');
  // Clean up resulting whitespace artifacts
  text = text.replace(/\s{2,}/g, ' ');
  text = text.replace(/\s+([.,!?])/g, '$1');

  // Collapse 3+ consecutive newlines down to 2
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

export async function generateCaption(input: CaptionInput): Promise<string> {
  const systemPrompt = buildSystemPrompt(input.includeAffiliate);
  const prompt = buildUserPrompt(input);
  let raw: string;
  switch (input.provider) {
    case 'openai':
      raw = await generateWithOpenAI(systemPrompt, prompt, input.apiKey, input.model);
      break;
    case 'openrouter':
      raw = await generateWithOpenRouter(systemPrompt, prompt, input.apiKey, input.model);
      break;
    case 'claude':
      raw = await generateWithClaude(systemPrompt, prompt, input.apiKey, input.model);
      break;
    default:
      throw new Error(`Unknown AI provider: ${input.provider}`);
  }
  return sanitizeCaption(raw);
}
