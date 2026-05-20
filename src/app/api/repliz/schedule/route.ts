import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ReplizClient } from '@/lib/repliz';
import { jsonHandler } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PAGE_LIMIT = 100;
const MAX_PAGES = 10; // hard cap so we never paginate forever

export const GET = jsonHandler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const fromDate = searchParams.get('fromDate');
  const toDate = searchParams.get('toDate');
  const status = searchParams.get('status');
  const accountIds = searchParams.getAll('accountIds');
  const aggregate = searchParams.get('aggregate') !== 'false'; // default true

  const settings = await prisma.settings.findFirst();
  if (!settings?.replizAccessKey || !settings?.replizSecretKey) {
    return NextResponse.json(
      { error: 'Repliz Access Key & Secret Key belum diset' },
      { status: 400 },
    );
  }
  const client = new ReplizClient(settings.replizAccessKey, settings.replizSecretKey);

  // For calendar view we want every event in the visible window, not a single
  // page. Loop fetch pages until we've collected `totalDocs` or hit a safety cap.
  if (aggregate) {
    const docs: unknown[] = [];
    let total = 0;
    for (let page = 1; page <= MAX_PAGES; page++) {
      const data = await client.getSchedules({
        page,
        limit: PAGE_LIMIT,
        fromDate,
        toDate,
        accountIds: accountIds.length ? accountIds : undefined,
        status,
      });
      const pageDocs = Array.isArray(data.docs) ? data.docs : [];
      docs.push(...pageDocs);
      total = data.totalDocs ?? docs.length;
      if (docs.length >= total || pageDocs.length === 0) break;
    }
    return NextResponse.json({ docs, total });
  }

  // Single-page mode (for ad-hoc use)
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);
  const data = await client.getSchedules({
    page,
    limit,
    fromDate,
    toDate,
    accountIds: accountIds.length ? accountIds : undefined,
    status,
  });
  return NextResponse.json(data);
});
