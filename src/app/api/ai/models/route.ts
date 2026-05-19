import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonHandler } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

export interface AiModel {
  id: string;
  name: string;
  description?: string;
}

async function fetchOpenAi(apiKey: string): Promise<AiModel[]> {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`OpenAI list error ${res.status}`);
  const data = await res.json();
  return (data.data ?? [])
    .map((m: { id: string }) => ({ id: m.id, name: m.id }))
    .filter((m: AiModel) => /gpt|o\d|chat/i.test(m.id))
    .sort((a: AiModel, b: AiModel) => a.id.localeCompare(b.id));
}

async function fetchOpenRouter(apiKey: string | null): Promise<AiModel[]> {
  const headers: HeadersInit = {};
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`OpenRouter list error ${res.status}`);
  const data = await res.json();
  return (data.data ?? [])
    .map((m: { id: string; name?: string; description?: string }) => ({
      id: m.id,
      name: m.name ?? m.id,
      description: m.description,
    }))
    .sort((a: AiModel, b: AiModel) => a.id.localeCompare(b.id));
}

async function fetchClaude(apiKey: string): Promise<AiModel[]> {
  const res = await fetch('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Claude list error ${res.status}`);
  const data = await res.json();
  return (data.data ?? [])
    .map((m: { id: string; display_name?: string }) => ({
      id: m.id,
      name: m.display_name ?? m.id,
    }))
    .sort((a: AiModel, b: AiModel) => b.id.localeCompare(a.id)); // newest first
}

export const GET = jsonHandler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get('provider');

  if (!provider || !['openai', 'openrouter', 'claude'].includes(provider)) {
    return NextResponse.json({ error: 'Provider tidak valid' }, { status: 400 });
  }

  const settings = await prisma.settings.findFirst();

  let models: AiModel[];
  if (provider === 'openrouter') {
    // Public — works without API key, but listing is better with one
    models = await fetchOpenRouter(settings?.openrouterKey ?? null);
  } else if (provider === 'openai') {
    if (!settings?.openaiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key belum diset. Simpan dulu lalu refresh.' },
        { status: 400 },
      );
    }
    models = await fetchOpenAi(settings.openaiKey);
  } else {
    if (!settings?.claudeKey) {
      return NextResponse.json(
        { error: 'Claude API key belum diset. Simpan dulu lalu refresh.' },
        { status: 400 },
      );
    }
    models = await fetchClaude(settings.claudeKey);
  }

  return NextResponse.json({ models, count: models.length });
});
