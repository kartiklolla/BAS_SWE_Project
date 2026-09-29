import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../db.js';
import { recordSale } from '../services/sales.js';
import { reorderList } from '../services/reports.js';

const ISBN = 'TEST000000001';
let pubId: number;

beforeAll(async () => {
  const pub = await prisma.publisher.create({ data: { name: 'Test Pub', address: 'Testville' } });
  pubId = pub.id;
  await prisma.book.create({
    data: { isbn: ISBN, title: 'Test Book', author: 'Tester', publisherId: pubId, priceInPaise: 1000, leadTimeDays: 4, stock: 1, stocked: true },
  });
});

afterAll(async () => {
  await prisma.saleRecord.deleteMany({ where: { isbn: ISBN } });
  await prisma.receipt.deleteMany({ where: { lines: { some: { isbn: ISBN } } } });
  await prisma.book.delete({ where: { isbn: ISBN } });
  await prisma.publisher.delete({ where: { id: pubId } });
  await prisma.$disconnect();
});

describe('sales', () => {
  it('never oversells: 3 attempts on stock=1 accept exactly one, stock hits 0 not negative', async () => {
    const r = await recordSale([ISBN, ISBN, ISBN]);
    expect(r.lines).toHaveLength(1);
    expect(r.rejected).toHaveLength(2);
    expect(r.totalInPaise).toBe(1000);
    const book = await prisma.book.findUniqueOrThrow({ where: { isbn: ISBN } });
    expect(book.stock).toBe(0);
  });

  it('is idempotent: same key returns the same receipt without re-decrementing', async () => {
    // restock so there is something to (not) sell
    await prisma.book.update({ where: { isbn: ISBN }, data: { stock: 5 } });
    const a = await recordSale([ISBN], 'key-123');
    const b = await recordSale([ISBN], 'key-123');
    expect(b.receiptNo).toBe(a.receiptNo);
    const book = await prisma.book.findUniqueOrThrow({ where: { isbn: ISBN } });
    expect(book.stock).toBe(4); // decremented once, not twice
  });
});

describe('reorder rule', () => {
  it('flags a below-threshold title and computes toProcure = level - stock', async () => {
    // 4 recent sales already exist (3 attempts sold 1, plus idempotent 1) -> copies sold = 2 in window.
    // Force a clean, known state: stock=1, leadTime=4. Need copiesSold*4 > 1.
    await prisma.book.update({ where: { isbn: ISBN }, data: { stock: 1, leadTimeDays: 4 } });
    const list = await reorderList();
    const row = list.find((r) => r.isbn === ISBN);
    expect(row).toBeTruthy();
    expect(row!.inventoryLevel).toBe(row!.copiesSoldLast14 * 4);
    expect(row!.toProcure).toBe(row!.inventoryLevel - 1);
  });

  it('leadTime=0 is never flagged regardless of stock/sales', async () => {
    await prisma.book.update({ where: { isbn: ISBN }, data: { stock: 0, leadTimeDays: 0 } });
    const list = await reorderList();
    expect(list.find((r) => r.isbn === ISBN)).toBeUndefined();
  });
});
