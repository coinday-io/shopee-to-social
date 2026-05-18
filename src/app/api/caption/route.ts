import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCaption } from '@/lib/ai';
import { AiProvider } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  const { product, affiliateUrl, hint } = await req.json();

  if (!product) {
    return NextResponse.json({ error: 'Product data missing' }, { status: 400 });
  }

  const settings = await prisma.settings.findFirst();
  if (!settings) {
    return NextResponse.json({ error: 'Settings belum dikonfigurasi' }, { status: 400 });
  }

  const provider = settings.defaultAiProvider as AiProvider;
  const apiKey =
    provider === 'openai'
      ? settings.openaiKey
      : provider === 'openrouter'
        ? settings.openrouterKey
        : settings.claudeKey;

  if (!apiKey) {
    return NextResponse.json(
      { error: `API key untuk ${provider} belum diset` },
      { status: 400 },
    );
  }

  try {
    const caption = await generateCaption({
      product,
      affiliateUrl: affiliateUrl ?? '',
      hint: hint ?? '',
      provider,
      apiKey,
      model: settings.defaultAiModel ?? undefined,
    });
    return NextResponse.json({ caption });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
