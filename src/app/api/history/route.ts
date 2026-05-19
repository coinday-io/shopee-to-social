import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonHandler } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

export const GET = jsonHandler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);
  const status = searchParams.get('status');
  const platform = searchParams.get('platform');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (platform) where.platform = platform;
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.gte = new Date(from);
    if (to) range.lte = new Date(to);
    where.scheduleAt = range;
  }

  const [items, total] = await Promise.all([
    prisma.postHistory.findMany({
      where,
      orderBy: { scheduleAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.postHistory.count({ where }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    limit,
    pageCount: Math.ceil(total / limit),
  });
});
