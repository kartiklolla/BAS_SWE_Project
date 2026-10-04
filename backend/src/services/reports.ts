import { prisma } from '../db.js';

export interface SalesStatRow {
  isbn: string;
  title: string;
  copiesSold: number;
  revenueInPaise: number;
}

export interface ReorderItem {
  isbn: string;
  title: string;
  stock: number;
  copiesSoldLast14: number;
  leadTimeDays: number;
  inventoryLevel: number;
  toProcure: number;
  publisher: string;
  publisherAddress: string;
}

// R.8. Per-title copies sold and revenue in [from, to]. Dates are server-parsed.
export async function salesStats(fromISO: string, toISO: string): Promise<SalesStatRow[]> {
  const from = new Date(fromISO + 'T00:00:00.000Z');
  const to = new Date(toISO + 'T23:59:59.999Z');

  const grouped = await prisma.saleRecord.groupBy({
    by: ['isbn'],
    where: { soldOn: { gte: from, lte: to } },
    _count: { _all: true },
    _sum: { unitPriceInPaise: true },
  });
  if (grouped.length === 0) return [];

  const books = await prisma.book.findMany({ where: { isbn: { in: grouped.map((g) => g.isbn) } } });
  const titleOf = new Map(books.map((b) => [b.isbn, b.title]));

  return grouped
    .map((g) => ({
      isbn: g.isbn,
      title: titleOf.get(g.isbn) ?? g.isbn,
      copiesSold: g._count._all,
      revenueInPaise: g._sum.unitPriceInPaise ?? 0,
    }))
    .sort((a, b) => b.copiesSold - a.copiesSold || b.revenueInPaise - a.revenueInPaise);
}

// R.9. Reorder list computed against the server's current date.
//   inventoryLevel = copiesSold(last 14 days) * leadTimeDays
//   belowThreshold = stock < inventoryLevel ; toProcure = max(0, level - stock)
// leadTimeDays=0 or zero recent sales => level 0 => never flagged.
export async function reorderList(now = new Date()): Promise<ReorderItem[]> {
  const since = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Ordered by publisher so the printed list reads as one purchase order per publisher.
  const books = await prisma.book.findMany({
    include: { publisher: true },
    orderBy: [{ publisher: { name: 'asc' } }, { title: 'asc' }],
  });
  const sold = await prisma.saleRecord.groupBy({
    by: ['isbn'],
    where: { soldOn: { gte: since, lte: now } },
    _count: { _all: true },
  });
  const soldMap = new Map(sold.map((s) => [s.isbn, s._count._all]));

  const items: ReorderItem[] = [];
  for (const b of books) {
    const copies = soldMap.get(b.isbn) ?? 0;
    const inventoryLevel = copies * b.leadTimeDays;
    if (b.stock < inventoryLevel) {
      items.push({
        isbn: b.isbn,
        title: b.title,
        stock: b.stock,
        copiesSoldLast14: copies,
        leadTimeDays: b.leadTimeDays,
        inventoryLevel,
        toProcure: inventoryLevel - b.stock,
        publisher: b.publisher.name,
        publisherAddress: b.publisher.address,
      });
    }
  }
  return items;
}
