import { Router } from 'express';
import { createHash } from 'node:crypto';
import { prisma } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Role } from '@prisma/client';

export const booksRouter = Router();

// Deterministic synthetic ISBN so the same request details resolve to the same
// primary key -> a duplicate request hits the unique constraint (409, not a new stub).
function isbnFromDetails(title: string, author: string, edition?: string): string {
  const h = createHash('sha1').update(`${title}|${author}|${edition ?? ''}`.toLowerCase()).digest();
  // 13 digits, 'R' stub prefix kept numeric-free-safe: use digits derived from hash.
  let digits = '';
  for (const b of h) {
    digits += (b % 10).toString();
    if (digits.length >= 13) break;
  }
  return digits.slice(0, 13);
}

// GET /api/books?title=&author=
// R.1 availability enquiry. R.3: matching a stock=0 title increments requestCount
// server-side. This is a deliberate side effect of a GET, documented here per spec.
booksRouter.get('/', async (req, res) => {
  const title = typeof req.query.title === 'string' ? req.query.title : undefined;
  const author = typeof req.query.author === 'string' ? req.query.author : undefined;

  // Query values are passed as Prisma parameters -> treated as literal text,
  // so `' OR 1=1 --` and long strings are safe (no SQL injection, no crash).
  const where =
    title || author
      ? {
          OR: [
            title ? { title: { contains: title, mode: 'insensitive' as const } } : undefined,
            author ? { author: { contains: author, mode: 'insensitive' as const } } : undefined,
          ].filter(Boolean) as object[],
        }
      : {};

  const books = await prisma.book.findMany({ where });

  // R.3: bump requestCount for matched out-of-stock titles.
  const outOfStock = books.filter((b) => b.stock === 0).map((b) => b.isbn);
  if (outOfStock.length) {
    await prisma.book.updateMany({
      where: { isbn: { in: outOfStock } },
      data: { requestCount: { increment: 1 } },
    });
  }

  res.json(books);
});

// GET /api/books/:isbn
booksRouter.get('/:isbn', async (req, res) => {
  const book = await prisma.book.findUnique({ where: { isbn: req.params.isbn } });
  if (!book) return res.status(404).json({ error: 'Not found' });
  res.json(book);
});

// POST /api/books/requests  R.2: register procurement request for an uncatalogued title.
booksRouter.post('/requests', async (req, res) => {
  const { title, author, publisher, edition } = req.body ?? {};
  if (!title || !author || !publisher) {
    return res.status(400).json({ error: 'title, author, publisher required' });
  }
  const isbn = isbnFromDetails(title, author, edition);

  const existing = await prisma.book.findUnique({ where: { isbn } });
  if (existing) return res.status(409).json({ error: 'Title already requested/exists', isbn });

  try {
    const pub =
      (await prisma.publisher.findFirst({ where: { name: publisher } })) ??
      (await prisma.publisher.create({ data: { name: publisher, address: 'Unknown' } }));
    const book = await prisma.book.create({
      data: {
        isbn,
        title,
        author,
        publisherId: pub.id,
        priceInPaise: 0,
        stock: 0,
        stocked: false,
        requestCount: 1,
      },
    });
    res.status(201).json({ isbn: book.isbn, requestCount: book.requestCount });
  } catch (e: any) {
    // Concurrent duplicate: unique constraint on isbn.
    if (e?.code === 'P2002') return res.status(409).json({ error: 'Title already requested/exists', isbn });
    throw e;
  }
});

// PATCH /api/books/:isbn/price  R.4 (Employee). Price changes apply to future sales only.
booksRouter.patch('/:isbn/price', requireAuth, requireRole(Role.EMPLOYEE), async (req, res) => {
  const priceInPaise = Number(req.body?.priceInPaise);
  if (!Number.isInteger(priceInPaise) || priceInPaise <= 0) {
    return res.status(400).json({ error: 'priceInPaise must be a positive integer' });
  }
  const book = await prisma.book.findUnique({ where: { isbn: req.params.isbn } });
  if (!book) return res.status(404).json({ error: 'Not found' });
  const updated = await prisma.book.update({ where: { isbn: book.isbn }, data: { priceInPaise } });
  res.json(updated);
});

// POST /api/books/:isbn/receive  R.6 (Employee). Adds stock, clears requestCount.
booksRouter.post('/:isbn/receive', requireAuth, requireRole(Role.EMPLOYEE), async (req, res) => {
  const qty = Number(req.body?.qty);
  if (!Number.isInteger(qty) || qty <= 0) {
    return res.status(400).json({ error: 'qty must be a positive integer' });
  }
  const book = await prisma.book.findUnique({ where: { isbn: req.params.isbn } });
  if (!book) return res.status(404).json({ error: 'Not found' });

  // Atomic increment; two concurrent /receive calls can't lose an update.
  const updated = await prisma.book.update({
    where: { isbn: book.isbn },
    data: { stock: { increment: qty }, requestCount: 0, stocked: true },
  });
  res.json(updated);
});
