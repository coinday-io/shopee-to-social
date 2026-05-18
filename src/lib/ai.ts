import { AiProvider, ShopeeProduct } from './types';

interface CaptionInput {
  product: ShopeeProduct;
  affiliateUrl: string;
  hint: string;
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
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(product.price / 100);

  return `Data produk:
Nama: ${product.name}
Harga: ${price}
Kategori: ${product.categories?.join(' > ') ?? '-'}
Toko: ${product.shop_name} (${product.shop_location})
Deskripsi singkat: ${(product.description ?? '').substring(0, 300)}
Link: ${affiliateUrl || product.url}

${hint ? `Instruksi tambahan dari user: ${hint}` : ''}

Buat caption untuk Facebook dan Threads.`;
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
