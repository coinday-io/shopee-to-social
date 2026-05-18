import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function mask(key: string | null | undefined, prefix = ''): string | null {
  if (!key) return null;
  return `${prefix}...${key.slice(-4)}`;
}

export async function GET() {
  const settings = await prisma.settings.findFirst();
  if (!settings) {
    return NextResponse.json({
      replizApiKey: null,
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
    replizApiKey: mask(settings.replizApiKey),
    openaiKey: mask(settings.openaiKey, 'sk-'),
    openrouterKey: mask(settings.openrouterKey, 'sk-or-'),
    claudeKey: mask(settings.claudeKey, 'sk-ant-'),
    defaultAiProvider: settings.defaultAiProvider,
    defaultAiModel: settings.defaultAiModel,
    hasReplizKey: !!settings.replizApiKey,
    hasOpenaiKey: !!settings.openaiKey,
    hasOpenrouterKey: !!settings.openrouterKey,
    hasClaudeKey: !!settings.claudeKey,
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const existing = await prisma.settings.findFirst();

  const updateData: Record<string, string | null> = {};
  const secretFields = ['replizApiKey', 'openaiKey', 'openrouterKey', 'claudeKey'];
  const plainFields = ['defaultAiProvider', 'defaultAiModel'];

  for (const field of secretFields) {
    const value = body[field];
    if (value === undefined) continue;
    // Skip masked values (containing "...")
    if (typeof value === 'string' && value.includes('...')) continue;
    updateData[field] = value === '' ? null : value;
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
