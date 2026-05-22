import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ReplizClient } from '@/lib/repliz';
import { jsonHandler } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const POST = jsonHandler(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const settings = await prisma.settings.findFirst();
    if (!settings?.replizAccessKey || !settings?.replizSecretKey) {
      return NextResponse.json(
        { error: 'Repliz Access Key & Secret Key belum diset' },
        { status: 400 },
      );
    }
    const client = new ReplizClient(settings.replizAccessKey, settings.replizSecretKey);
    await client.retrySchedule(params.id);
    return NextResponse.json({ ok: true });
  },
);
