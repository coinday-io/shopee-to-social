import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ReplizClient } from '@/lib/repliz';
import { jsonHandler } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

export const GET = jsonHandler(async () => {
  const settings = await prisma.settings.findFirst();
  if (!settings?.replizAccessKey || !settings?.replizSecretKey) {
    return NextResponse.json(
      { error: 'Repliz Access Key & Secret Key belum diset' },
      { status: 400 },
    );
  }
  const client = new ReplizClient(settings.replizAccessKey, settings.replizSecretKey);
  const result = await client.getAccounts(1, 100);
  const connected = result.docs.filter((a) => a.isConnected);
  return NextResponse.json(connected);
});
