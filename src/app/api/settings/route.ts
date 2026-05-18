import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function mask(key: string | null | undefined, prefix = ''): string | null {
  if (!key) return null;
  const tail = key.length > 4 ? key.slice(-4) : key;
  return `${prefix}...${tail}`;
}

export async function GET() {
  const settings = await prisma.settings.findFirst();
  if (!settings) {
    return NextResponse.json({
      replizAccessKey: null,
      replizSecretKey: null,
      openaiKey: null,
      openrouterKey: null,
      claudeKey: null,
      defaultAiProvider: 'openai',
      defaultAiModel: null,
      hasReplizKey: false,
      hasOpenaiKey: false,
      hasOpenrouterKey: false,
      hasClaudeKey: false,
    });
  }
  return NextResponse.json({
    replizAccessKey: settings.replizAccessKey, // access key is not secret, show full
    replizSecretKey: mask(settings.replizSecretKey),
    openaiKey: mask(settings.openaiKey, 'sk-'),
    openrouterKey: mask(settings.openrouterKey, 'sk-or-'),
    claudeKey: mask(settings.claudeKey, 'sk-ant-'),
    defaultAiProvider: settings.defaultAiProvider,
    defaultAiModel: settings.defaultAiModel,
    hasReplizKey: !!(settings.replizAccessKey && settings.replizSecretKey),
    hasOpenaiKey: !!settings.openaiKey,
    hasOpenrouterKey: !!settings.openrouterKey,
    hasClaudeKey: !!settings.claudeKey,
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const existing = await prisma.settings.findFirst();

  const updateData: Record<string, string | null> = {};
  const secretFields = ['replizSecretKey', 'openaiKey', 'openrouterKey', 'claudeKey'];
  const plainSecretFields = ['replizAccessKey']; // access key is not masked
  const plainFields = ['defaultAiProvider', 'defaultAiModel'];

  for (const field of secretFields) {
    const value = body[field];
    if (value === undefined) continue;
    // Skip masked placeholders (containing "...")
    if (typeof value === 'string' && value.includes('...')) continue;
    updateData[field] = value === '' ? null : value;
  }
  for (const field of plainSecretFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field] === '' ? null : body[field];
    }
  }
  for (const field of plainFields) {
    if (body[field] !== undefined) updateData[field] = body[field];
  }

  if (existing) {
    await prisma.settings.update({ where: { id: existing.id }, data: updateData });
  } else {
    await prisma.settings.create({ data: updateData });
  }

  return NextResponse.json({ ok: true });
}
