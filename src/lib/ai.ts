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
- Output kamu adalah caption final yang siap di-copy-paste. Nothing else.
- Jangan tulis label apapun seperti "Caption:", "Hashtag:", "[caption]", "[hashtag]", "Versi 1", "Untuk Facebook".
- Satu caption universal saja, BUKAN dua versi untuk platform berbeda.
- Jangan ulang nama produk di awal caption — langsung ke value proposition.
- JANGAN PERNAH menyebutkan harga produk (no "Rp", no angka harga, no "murah Rp X").

GAYA:
- Bahasa Indonesia natural dan friendly.
- 2-3 emoji relevan, tidak berlebihan.
- Body caption SINGKAT: maksimal 2 kalimat (~120-150 karakter total).`;

const RULE_WITH_LINK = `

FORMAT WAJIB (3 blok, dipisah satu baris kosong):

Blok 1: body caption (2 kalimat max, dengan emoji)

Blok 2: ajakan + link, formatnya tepat: "Beli disini: <link>"

Blok 3: 5-8 hashtag relevan, dipisah spasi

Contoh format yang benar:
Lorem ipsum dolor sit amet, consectetur adipiscing! 🌟 Sed do eiusmod tempor incididunt ut labore.

Beli disini: https://example.com

#Tag1 #Tag2 #Tag3 #Tag4 #Tag5

Perhatikan ada SATU BARIS KOSONG antara tiap blok.`;

const RULE_WITHOUT_LINK = `

FORMAT WAJIB (2 blok, dipisah satu baris kosong):

Blok 1: body caption (2 kalimat max, dengan emoji)

Blok 2: 5-8 hashtag relevan, dipisah spasi

JANGAN sertakan URL atau link apapun. Jangan tulis "Beli disini" atau ajakan klik link.

Contoh format yang benar:
Lorem ipsum dolor sit amet, consectetur adipiscing! 🌟 Sed do eiusmod tempor incididunt ut labore.

#Tag1 #Tag2 #Tag3 #Tag4 #Tag5

Perhatikan ada SATU BARIS KOSONG antara body dan hashtag.`;

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
      max_tokens: 350,
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
      max_tokens: 350,
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
      max_tokens: 350,
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

  // Strip Rupiah price mentions
  const priceWord = /(?:hanya|cuma|harga|cuma\s+seharga|seharga|mulai(?:\s+dari)?|dengan\s+harga)\s+/i;
  const priceValue = /(?:Rp\.?|IDR)\s*[\d.,]+(?:\s*(?:ribu|rb|juta|jt|k))?/gi;
  text = text.replace(new RegExp(`${priceWord.source}${priceValue.source}[.,!?]?`, 'gi'), '');
  text = text.replace(priceValue, '');
  text = text.replace(/[ \t]{2,}/g, ' ');
  text = text.replace(/ +([.,!?])/g, '$1');
  text = text.replace(/\n{3,}/g, '\n\n');

  // === Restructure into 3 blocks: body, link (optional), hashtags ===
  const hashtagLines: string[] = [];
  const linkLines: string[] = [];
  const bodyLines: string[] = [];

  const hashtagLineRe = /^(?:#[\p{L}\p{N}_]+(?:\s+|$))+$/u;
  const trailingHashtagsRe = /(.*?)(\s+#[\p{L}\p{N}_]+(?:\s+#[\p{L}\p{N}_]+)*\s*)$/u;
  const linkLineRe = /^(?:beli\s+disini|order\s+disini|cek\s+disini|klik\s+link|link)\s*[:\-]?\s*https?:\/\/\S+/i;
  const bareUrlLineRe = /^https?:\/\/\S+$/i;
  const inlineLinkRe = /(.*?)(\b(?:beli\s+disini|order\s+disini|cek\s+disini|klik\s+link|link)\s*[:\-]?\s*https?:\/\/\S+)(.*)$/i;

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (hashtagLineRe.test(line)) {
      hashtagLines.push(line);
      continue;
    }
    if (linkLineRe.test(line) || bareUrlLineRe.test(line)) {
      linkLines.push(line);
      continue;
    }

    // Step 1: peel off trailing hashtags
    let rest = line;
    const tagMatch = rest.match(trailingHashtagsRe);
    if (tagMatch) {
      rest = (tagMatch[1] ?? '').trim();
      hashtagLines.push(tagMatch[2].trim());
    }
    if (!rest) continue;

    // Step 2: peel off inline "Beli disini: <url>" from what remains
    const linkMatch = rest.match(inlineLinkRe);
    if (linkMatch) {
      const before = (linkMatch[1] ?? '').trim();
      const link = linkMatch[2].trim();
      const after = (linkMatch[3] ?? '').trim();
      if (before) bodyLines.push(before);
      linkLines.push(link);
      if (after) bodyLines.push(after);
    } else {
      bodyLines.push(rest);
    }
  }

  const blocks: string[] = [];
  if (bodyLines.length) blocks.push(bodyLines.join(' ').replace(/\s+/g, ' ').trim());
  if (linkLines.length) blocks.push(linkLines.join(' ').trim());
  if (hashtagLines.length) blocks.push(hashtagLines.join(' ').replace(/\s+/g, ' ').trim());

  return blocks.join('\n\n').trim();
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
