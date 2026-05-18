import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ReplizClient } from '@/lib/repliz';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);

  const settings = await prisma.settings.findFirst();
  if (!settings?.replizApiKey) {
    return NextResponse.json({ error: 'Repliz API key belum diset' }, { status: 400 });
  }

  try {
    const client = new ReplizClient(settings.replizApiKey);
    const data = await client.getSchedules(page, limit);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
