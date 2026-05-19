import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ReplizClient } from '@/lib/repliz';
import { jsonHandler } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

export const GET = jsonHandler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);

  const settings = await prisma.settings.findFirst();
  if (!settings?.replizAccessKey || !settings?.replizSecretKey) {
    return NextResponse.json(
      { error: 'Repliz Access Key & Secret Key belum diset' },
      { status: 400 },
    );
  }
  const client = new ReplizClient(settings.replizAccessKey, settings.replizSecretKey);
  const data = await client.getSchedules(page, limit);
  return NextResponse.json(data);
});
