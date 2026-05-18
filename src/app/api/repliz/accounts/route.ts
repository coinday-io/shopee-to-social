import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ReplizClient } from '@/lib/repliz';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = await prisma.settings.findFirst();
  if (!settings?.replizAccessKey || !settings?.replizSecretKey) {
    return NextResponse.json(
      { error: 'Repliz Access Key & Secret Key belum diset' },
      { status: 400 },
    );
  }

  try {
    const client = new ReplizClient(settings.replizAccessKey, settings.replizSecretKey);
    const result = await client.getAccounts(1, 100);
    const connected = result.docs.filter((a) => a.isConnected);
    return NextResponse.json(connected);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
