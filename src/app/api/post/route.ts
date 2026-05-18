import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ReplizClient, buildReplizPayload } from '@/lib/repliz';
import { ReplizAccount } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type PostRequest = {
  product: { itemid: number; name: string; description: string; url: string };
  affiliateUrl: string;
  imageUrl: string;
  caption: string;
  accountIds: string[];
  accounts: ReplizAccount[];
  scheduleAt: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as PostRequest;
  const { product, affiliateUrl, imageUrl, caption, accountIds, accounts, scheduleAt } = body;

  if (!product || !accountIds?.length || !scheduleAt) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const settings = await prisma.settings.findFirst();
  if (!settings?.replizAccessKey || !settings?.replizSecretKey) {
    return NextResponse.json(
      { error: 'Repliz Access Key & Secret Key belum diset' },
      { status: 400 },
    );
  }

  const client = new ReplizClient(settings.replizAccessKey, settings.replizSecretKey);
  type Result = { accountId: string; success: boolean; scheduleId?: string; error?: string };
  const results: Result[] = [];

  await Promise.allSettled(
    accountIds.map(async (accountId) => {
      const accountInfo = accounts.find((a) => a.id === accountId);
      const payload = buildReplizPayload(
        product,
        affiliateUrl ?? '',
        imageUrl,
        caption,
        accountId,
        scheduleAt,
      );

      try {
        const res = await client.createSchedule(payload);
        await prisma.postHistory.create({
          data: {
            productItemid: String(product.itemid),
            productName: product.name,
            productUrl: product.url,
            affiliateUrl: affiliateUrl ?? '',
            caption,
            imageUrl,
            platform: accountInfo?.type ?? 'unknown',
            accountId,
            accountName: accountInfo?.name ?? accountId,
            replizScheduleId: res.scheduleId,
            scheduleAt: new Date(scheduleAt),
            status: 'pending',
          },
        });
        results.push({ accountId, success: true, scheduleId: res.scheduleId });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        await prisma.postHistory.create({
          data: {
            productItemid: String(product.itemid),
            productName: product.name,
            productUrl: product.url,
            affiliateUrl: affiliateUrl ?? '',
            caption,
            imageUrl,
            platform: accountInfo?.type ?? 'unknown',
            accountId,
            accountName: accountInfo?.name ?? accountId,
            scheduleAt: new Date(scheduleAt),
            status: 'error',
            errorMessage: message,
          },
        });
        results.push({ accountId, success: false, error: message });
      }
    }),
  );

  const successCount = results.filter((r) => r.success).length;
  return NextResponse.json({
    ok: true,
    successCount,
    failCount: results.length - successCount,
    results,
  });
}
