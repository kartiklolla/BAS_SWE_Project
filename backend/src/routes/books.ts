import { Router } from 'express';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { isbnFromDetails, ISBN_RE } from '../lib/isbn.js';

export const booksRouter = Router();

const withPublisher = { publisher: { select: { name: true, address: true } } } as const;
const isPosInt = (n: unknown): n is number => Number.isInteger(n) && (n as number) > 0;
const isNonNegInt = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0;
const text = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isUniqueViolation = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

// GET /api/books?title=&author=
// R.1 availability enquiry. Terms are OR-ed so one search box can match title or author.
// Values go to Prisma as parameters, so `' OR 1=1 --` is searched as literal text.
// With no term this is a plain catalogue browse.
// R.3: when a search term matches a stock=0 title, its requestCount is incremented
// server-side. This is a deliberate side effect of a GET (spec section 13). Browsing
// without a term is not an enquiry about a title, so it never counts.
booksRouter.get('/', async (req, res) => {
  const title = text(req.query.title);
  const author = text(req.query.author);
  const terms: Prisma.BookWhereInput[] = [];
  if (title) terms.push({ title: { contains: title, mode: 'insensitive' } });
  if (author) terms.push({ author: { contains: author, mode: 'insensitive' } });

  const books = await prisma.book.findMany({
    where: terms.length ? { OR: terms } : {},
    include: withPublisher,
    orderBy: { title: 'asc' },
  });

  if (terms.length) {
    const outOfStock = books.filter((b) => b.stock === 0).map((b) => b.isbn);
    if (outOfStock.length) {
      await prisma.book.updateMany({
        where: { isbn: { in: outOfStock } },
        data: { requestCount: { increment: 1 } },
      });
    }
  }
  res.json(books);
});

// POST /api/books/requests  R.2: register a procurement request for an uncatalogued title.
// Declared before /:isbn routes so "requests" is never read as an ISBN.
booksRouter.post('/requests', async (req, res) => {
  const title = text(req.body?.title);
  const author = text(req.body?.author);
  const publisher = text(req.body?.publisher);
  const edition = text(req.body?.edition);
  if (!title || !author || !publisher) {
    return res.status(400).json({ error: 'title, author and publisher are required' });
  }
  const isbn = isbnFromDetails(title, author, edition);
  if (await prisma.book.findUnique({ where: { isbn } })) {
    return res.status(409).json({ error: 'This title is already on record', isbn });
  }

  try {
    const pub = await prisma.publisher.upsert({
      where: { name: publisher },
      update: {},
      create: { name: publisher, address: 'Address not yet known' },
    });
    const book = await prisma.book.create({
      data: { isbn, title, author, publisherId: pub.id, priceInPaise: 0, stock: 0, stocked: false, requestCount: 1 },
    });
    res.status(201).json({ isbn: book.isbn, requestCount: book.requestCount });
  } catch (e) {
    // Concurrent duplicate (double-submit): the second insert hits the primary key.
    if (isUniqueViolation(e)) return res.status(409).json({ error: 'This title is already on record', isbn });
    throw e;
  }
});

// GET /api/books/:isbn
booksRouter.get('/:isbn', async (req, res) => {
  const book = await prisma.book.findUnique({ where: { isbn: req.params.isbn }, include: withPublisher });
  if (!book) return res.status(404).json({ error: 'Not found' });
  res.json(book);
});

// POST /api/books/:isbn/interest  R.3 from the Book Detail page: a customer explicitly asks
// for a title that has no copies. Only counts while stock is 0 (enquiry diagram, stock = 0 branch).
booksRouter.post('/:isbn/interest', async (req, res) => {
  const { isbn } = req.params;
  const r = await prisma.book.updateMany({
    where: { isbn, stock: 0 },
    data: { requestCount: { increment: 1 } },
  });
  const book = await prisma.book.findUnique({ where: { isbn } });
  if (!book) return res.status(404).json({ error: 'Not found' });
  if (r.count === 0) return res.status(409).json({ error: 'This title is in stock', isbn });
  res.json({ isbn, requestCount: book.requestCount });
});

// PATCH /api/books/:isbn/price  R.4 (Employee). Price changes apply to future sales only:
// each SaleRecord stores its own unitPriceInPaise.
booksRouter.patch('/:isbn/price', requireAuth, requireRole(Role.EMPLOYEE), async (req, res) => {
  const priceInPaise = req.body?.priceInPaise;
  if (!isPosInt(priceInPaise)) return res.status(400).json({ error: 'priceInPaise must be a positive integer' });
  const book = await prisma.book.findUnique({ where: { isbn: req.params.isbn } });
  if (!book) return res.status(404).json({ error: 'Not found' });
  res.json(await prisma.book.update({ where: { isbn: book.isbn }, data: { priceInPaise }, include: withPublisher }));
});

// PATCH /api/books/:isbn  R.4 / R.6 (Employee). Maintain price, rack and lead time.
// For a requested stub (stocked=false) it also sets the real ISBN from the delivered copy
// and the publisher's address, which the reorder list prints.
booksRouter.patch('/:isbn', requireAuth, requireRole(Role.EMPLOYEE), async (req, res) => {
  const body = req.body ?? {};
  const book = await prisma.book.findUnique({ where: { isbn: req.params.isbn } });
  if (!book) return res.status(404).json({ error: 'Not found' });

  const data: Prisma.BookUpdateInput = {};
  if ('priceInPaise' in body) {
    if (!isPosInt(body.priceInPaise)) return res.status(400).json({ error: 'priceInPaise must be a positive integer' });
    data.priceInPaise = body.priceInPaise;
  }
  if ('rackNo' in body) {
    if (body.rackNo !== null && !isNonNegInt(body.rackNo)) {
      return res.status(400).json({ error: 'rackNo must be a whole number or null' });
    }
    data.rackNo = body.rackNo;
  }
  if ('leadTimeDays' in body) {
    if (!isNonNegInt(body.leadTimeDays) || body.leadTimeDays > 365) {
      return res.status(400).json({ error: 'leadTimeDays must be a whole number from 0 to 365' });
    }
    data.leadTimeDays = body.leadTimeDays;
  }
  if ('isbn' in body && body.isbn !== book.isbn) {
    const next = text(body.isbn, 13).toUpperCase();
    if (!ISBN_RE.test(next)) return res.status(400).json({ error: 'isbn must be a 10- or 13-digit ISBN' });
    // Once copies exist, receipts and sales reference this key, so it is frozen.
    if (book.stocked) return res.status(409).json({ error: 'ISBN can only be changed before the first stock arrives' });
    data.isbn = next;
  }
  const address = 'publisherAddress' in body ? text(body.publisherAddress, 300) : null;
  if (address === '') return res.status(400).json({ error: 'publisherAddress cannot be empty' });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (address) await tx.publisher.update({ where: { id: book.publisherId }, data: { address } });
      return tx.book.update({ where: { isbn: book.isbn }, data, include: withPublisher });
    });
    res.json(updated);
  } catch (e) {
    if (isUniqueViolation(e)) return res.status(409).json({ error: 'Another book already has that ISBN' });
    throw e;
  }
});

// POST /api/books/:isbn/receive  R.6 (Employee). Adds stock, clears requestCount.
booksRouter.post('/:isbn/receive', requireAuth, requireRole(Role.EMPLOYEE), async (req, res) => {
  const qty = req.body?.qty;
  if (!isPosInt(qty)) return res.status(400).json({ error: 'qty must be a positive integer' });
  const book = await prisma.book.findUnique({ where: { isbn: req.params.isbn } });
  if (!book) return res.status(404).json({ error: 'Not found' });
  // A requested stub has price 0; stocking it would let POS sell it for free.
  if (book.priceInPaise <= 0) return res.status(400).json({ error: 'Set a price before receiving stock' });

  // Atomic increment: two concurrent receives on the same ISBN cannot lose an update.
  const updated = await prisma.book.update({
    where: { isbn: book.isbn },
    data: { stock: { increment: qty }, requestCount: 0, stocked: true },
    include: withPublisher,
  });
  res.json(updated);
});
