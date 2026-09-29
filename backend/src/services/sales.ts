import { prisma } from '../db.js';

export interface SaleResult {
  receiptNo: number;
  issuedOn: string;
  lines: { isbn: string; title: string; unitPriceInPaise: number }[];
  rejected: { isbn: string; reason: string }[];
  totalInPaise: number;
}

async function buildResult(receiptNo: number): Promise<SaleResult> {
  const receipt = await prisma.receipt.findUniqueOrThrow({
    where: { receiptNo },
    include: { lines: { include: { book: true } } },
  });
  return {
    receiptNo: receipt.receiptNo,
    issuedOn: receipt.issuedOn.toISOString().slice(0, 10),
    lines: receipt.lines.map((l) => ({
      isbn: l.isbn,
      title: l.book.title,
      unitPriceInPaise: l.unitPriceInPaise,
    })),
    rejected: [],
    totalInPaise: receipt.totalInPaise,
  };
}

// R.5 Record Sale. Atomic: accepted lines update stock + sales log together, or none do.
// Idempotent on idempotencyKey: a retried commit returns the same receipt, no double decrement.
export async function recordSale(
  items: string[],
  idempotencyKey?: string,
): Promise<SaleResult> {
  if (idempotencyKey) {
    const prior = await prisma.receipt.findUnique({ where: { idempotencyKey } });
    if (prior) return buildResult(prior.receiptNo); // rejected list not persisted; empty on replay
  }

  const rejected: { isbn: string; reason: string }[] = [];

  const receiptNo = await prisma.$transaction(async (tx) => {
    const receipt = await tx.receipt.create({
      data: { totalInPaise: 0, idempotencyKey: idempotencyKey ?? null },
    });

    let total = 0;
    for (const isbn of items) {
      const book = await tx.book.findUnique({ where: { isbn } });
      if (!book) {
        rejected.push({ isbn, reason: 'not catalogued' });
        continue;
      }
      // Conditional decrement: only succeeds while stock > 0. Prevents overselling
      // the last copy under concurrent requests; stock never goes negative.
      const dec = await tx.book.updateMany({
        where: { isbn, stock: { gt: 0 } },
        data: { stock: { decrement: 1 } },
      });
      if (dec.count === 0) {
        rejected.push({ isbn, reason: 'out of stock' });
        continue;
      }
      // Price fixed at time of sale (business rule 11).
      await tx.saleRecord.create({
        data: { isbn, unitPriceInPaise: book.priceInPaise, receiptNo: receipt.receiptNo },
      });
      total += book.priceInPaise;
    }

    await tx.receipt.update({ where: { receiptNo: receipt.receiptNo }, data: { totalInPaise: total } });
    return receipt.receiptNo;
  });

  const result = await buildResult(receiptNo);
  result.rejected = rejected;
  return result;
}

export async function getReceipt(receiptNo: number): Promise<SaleResult | null> {
  const exists = await prisma.receipt.findUnique({ where: { receiptNo } });
  if (!exists) return null;
  return buildResult(receiptNo);
}
