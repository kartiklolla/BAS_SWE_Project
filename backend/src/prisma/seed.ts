// Built-in catalogue. Idempotent: safe to re-run (it runs on every Vercel deploy).
// - Publishers, books and users are upserted and never overwrite live edits.
// - Demo sales history is only written into a database that has no sales yet.
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { isbnFromDetails } from '../lib/isbn.js';

const prisma = new PrismaClient();

const PUBLISHERS: Record<string, string> = {
  'Pearson Education': 'Sector 62, Noida, Uttar Pradesh, India',
  'MIT Press': 'Cambridge, Massachusetts, USA',
  'Microsoft Press': 'Redmond, Washington, USA',
  Bloomsbury: 'London, United Kingdom',
  HarperCollins: 'Noida, Uttar Pradesh, India',
  'Houghton Mifflin Harcourt': 'Boston, Massachusetts, USA',
  'Penguin Random House': 'Gurugram, Haryana, India',
  'Simon & Schuster': 'New York, USA',
  Hachette: 'New York, USA',
  Macmillan: 'New York, USA',
  'Universities Press': 'Hyderabad, Telangana, India',
  'Rajkamal Prakashan': 'Daryaganj, New Delhi, India',
};

// [isbn, title, author, publisher, price in rupees, rack, lead time (days), stock, requests]
type Row = [string, string, string, string, number, number, number, number, number?];
const BOOKS: Row[] = [
  // Computing — rack 12-13
  ['9780131103627', 'The C Programming Language', 'Brian W. Kernighan & Dennis M. Ritchie', 'Pearson Education', 450, 12, 5, 8],
  ['9780201896831', 'The Art of Computer Programming, Vol. 1', 'Donald E. Knuth', 'Pearson Education', 1200, 12, 21, 2],
  ['9780132350884', 'Clean Code', 'Robert C. Martin', 'Pearson Education', 650, 12, 7, 4],
  ['9780135957059', 'The Pragmatic Programmer', 'David Thomas & Andrew Hunt', 'Pearson Education', 899, 12, 7, 6],
  ['9780201633610', 'Design Patterns', 'Gamma, Helm, Johnson & Vlissides', 'Pearson Education', 1100, 12, 14, 3],
  ['9780134757599', 'Refactoring', 'Martin Fowler', 'Pearson Education', 950, 12, 10, 0, 5],
  ['9780262033848', 'Introduction to Algorithms', 'Cormen, Leiserson, Rivest & Stein', 'MIT Press', 1500, 13, 21, 5],
  ['9780262510875', 'Structure and Interpretation of Computer Programs', 'Harold Abelson & Gerald Jay Sussman', 'MIT Press', 1300, 13, 21, 1],
  ['9780735619678', 'Code Complete', 'Steve McConnell', 'Microsoft Press', 1050, 13, 14, 2],
  // Fantasy & children's — racks 3-5
  ['9780747532699', "Harry Potter and the Philosopher's Stone", 'J.K. Rowling', 'Bloomsbury', 499, 3, 7, 14],
  ['9780547928227', 'The Hobbit', 'J.R.R. Tolkien', 'Houghton Mifflin Harcourt', 550, 3, 10, 6],
  ['9780544003415', 'The Lord of the Rings', 'J.R.R. Tolkien', 'Houghton Mifflin Harcourt', 1450, 3, 14, 2],
  ['9780156012195', 'The Little Prince', 'Antoine de Saint-Exupéry', 'Houghton Mifflin Harcourt', 299, 4, 7, 9],
  ['9780141439761', "Alice's Adventures in Wonderland", 'Lewis Carroll', 'Penguin Random House', 250, 4, 5, 7],
  ['9780142410370', 'Matilda', 'Roald Dahl', 'Penguin Random House', 350, 4, 5, 0, 7],
  ['9780064400558', "Charlotte's Web", 'E.B. White', 'HarperCollins', 320, 4, 7, 5],
  ['9780064401883', 'The Secret Garden', 'Frances Hodgson Burnett', 'HarperCollins', 280, 4, 7, 4],
  ['9780399226908', 'The Very Hungry Caterpillar', 'Eric Carle', 'Penguin Random House', 399, 5, 10, 10],
  ['9780060254926', 'Where the Wild Things Are', 'Maurice Sendak', 'HarperCollins', 450, 5, 10, 3],
  // Classics — rack 7
  ['9780141439518', 'Pride and Prejudice', 'Jane Austen', 'Penguin Random House', 299, 7, 5, 11],
  ['9780141441146', 'Jane Eyre', 'Charlotte Brontë', 'Penguin Random House', 299, 7, 5, 6],
  ['9780141439471', 'Frankenstein', 'Mary Shelley', 'Penguin Random House', 275, 7, 5, 0, 2],
  ['9780451524935', '1984', 'George Orwell', 'Penguin Random House', 350, 7, 7, 9],
  ['9780060850524', 'Brave New World', 'Aldous Huxley', 'HarperCollins', 399, 7, 7, 4],
  ['9780743273565', 'The Great Gatsby', 'F. Scott Fitzgerald', 'Simon & Schuster', 325, 7, 10, 5],
  ['9780061120084', 'To Kill a Mockingbird', 'Harper Lee', 'HarperCollins', 399, 7, 7, 3],
  ['9780316769488', 'The Catcher in the Rye', 'J.D. Salinger', 'Hachette', 375, 7, 10, 2],
  // Science fiction — rack 8
  ['9780441172719', 'Dune', 'Frank Herbert', 'Penguin Random House', 599, 8, 10, 4],
  ['9780345391803', "The Hitchhiker's Guide to the Galaxy", 'Douglas Adams', 'Penguin Random House', 399, 8, 7, 6],
  // Indian writing — racks 9-10
  ['9780812979657', 'The God of Small Things', 'Arundhati Roy', 'Penguin Random House', 499, 9, 7, 5],
  ['9780812976533', "Midnight's Children", 'Salman Rushdie', 'Penguin Random House', 599, 9, 10, 2],
  ['9781416562603', 'The White Tiger', 'Aravind Adiga', 'Simon & Schuster', 399, 9, 10, 3],
  ['9780060786526', 'A Suitable Boy', 'Vikram Seth', 'HarperCollins', 999, 9, 14, 1],
  ['9780143039655', 'Malgudi Days', 'R.K. Narayan', 'Penguin Random House', 299, 9, 5, 8],
  ['9788173711466', 'Wings of Fire', 'A.P.J. Abdul Kalam', 'Universities Press', 350, 9, 5, 12],
  // Non-Latin title (search must handle Devanagari). Internal code, not a published ISBN.
  ['9788173711463', 'गोदान', 'मुंशी प्रेमचंद', 'Rajkamal Prakashan', 300, 10, 3, 3],
  // Non-fiction — rack 11
  ['9780062316097', 'Sapiens', 'Yuval Noah Harari', 'HarperCollins', 599, 11, 7, 7],
  ['9780735211292', 'Atomic Habits', 'James Clear', 'Penguin Random House', 499, 11, 7, 5],
  ['9780374533557', 'Thinking, Fast and Slow', 'Daniel Kahneman', 'Macmillan', 550, 11, 10, 3],
  ['9780062315007', 'The Alchemist', 'Paulo Coelho', 'HarperCollins', 350, 11, 7, 9],
];

// Customer procurement requests (R.2): uncatalogued stubs, keyed the same way the request form keys them.
const REQUESTS: [string, string, string, number][] = [
  ['Project Hail Mary', 'Andy Weir', 'Penguin Random House', 4],
  ['The Night Circus', 'Erin Morgenstern', 'Penguin Random House', 3],
  ['Tomb of Sand', 'Geetanjali Shree', 'Penguin Random House', 2],
];

// [isbn, copies sold in the last 14 days, copies sold 15-30 days ago]
// Chosen so a handful of titles fall below inventoryLevel = sold14 x leadTime (R.9).
const HISTORY: [string, number, number][] = [
  ['9780747532699', 4, 3],
  ['9780735211292', 3, 2],
  ['9780062315007', 2, 1],
  ['9780131103627', 2, 1],
  ['9780201896831', 1, 0],
  ['9780547928227', 1, 1],
  ['9780812979657', 1, 0],
  ['9780141439518', 2, 2],
  ['9788173711466', 2, 2],
  ['9780451524935', 1, 2],
  ['9780399226908', 1, 1],
  ['9780062316097', 1, 1],
  ['9780135957059', 0, 2],
  ['9780156012195', 0, 1],
];

// Deterministic PRNG so every fresh database gets the same history.
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function seedSalesHistory(price: Map<string, number>) {
  if ((await prisma.saleRecord.count()) > 0) return 0;
  const rand = mulberry32(42);
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();
  // Recent sales land 1-12 days ago (well inside the 14-day window); older ones 16-29 days ago.
  const at = (minDays: number, spanDays: number) =>
    new Date(now - (minDays + Math.floor(rand() * spanDays)) * DAY - Math.floor(rand() * 8) * 60 * 60 * 1000);

  const sales: { isbn: string; soldOn: Date }[] = [];
  for (const [isbn, recent, older] of HISTORY) {
    for (let i = 0; i < recent; i++) sales.push({ isbn, soldOn: at(1, 12) });
    for (let i = 0; i < older; i++) sales.push({ isbn, soldOn: at(16, 14) });
  }
  sales.sort((a, b) => a.soldOn.getTime() - b.soldOn.getTime());

  // Group same-day sales into receipts of 1-3 lines.
  let receipts = 0;
  for (let i = 0; i < sales.length; ) {
    const day = sales[i].soldOn.toISOString().slice(0, 10);
    const size = 1 + Math.floor(rand() * 3);
    const lines = [];
    while (lines.length < size && i < sales.length && sales[i].soldOn.toISOString().slice(0, 10) === day) {
      lines.push(sales[i++]);
    }
    const priced = lines.map((l) => ({ isbn: l.isbn, soldOn: l.soldOn, unitPriceInPaise: price.get(l.isbn)! }));
    await prisma.receipt.create({
      data: {
        issuedOn: lines[0].soldOn,
        totalInPaise: priced.reduce((s, l) => s + l.unitPriceInPaise, 0),
        lines: { create: priced },
      },
    });
    receipts++;
  }
  return receipts;
}

async function main() {
  const pubId = new Map<string, number>();
  for (const [name, address] of Object.entries(PUBLISHERS)) {
    const p = await prisma.publisher.upsert({ where: { name }, update: {}, create: { name, address } });
    pubId.set(name, p.id);
  }

  const price = new Map<string, number>();
  for (const [isbn, title, author, publisher, rupees, rackNo, leadTimeDays, stock, requestCount = 0] of BOOKS) {
    const priceInPaise = rupees * 100;
    price.set(isbn, priceInPaise);
    await prisma.book.upsert({
      where: { isbn },
      update: {},
      create: { isbn, title, author, publisherId: pubId.get(publisher)!, priceInPaise, rackNo, leadTimeDays, stock, requestCount, stocked: true },
    });
  }

  for (const [title, author, publisher, requestCount] of REQUESTS) {
    await prisma.book.upsert({
      where: { isbn: isbnFromDetails(title, author) },
      update: {},
      create: { isbn: isbnFromDetails(title, author), title, author, publisherId: pubId.get(publisher)!, priceInPaise: 0, stock: 0, stocked: false, requestCount },
    });
  }

  const receipts = await seedSalesHistory(price);

  // Staff accounts. Locally the password is <username>123. On Vercel the demo passwords
  // would be public, so accounts are only created when SEED_STAFF_PASSWORD is set.
  const shared = process.env.SEED_STAFF_PASSWORD;
  const onVercel = !!process.env.VERCEL;
  let users = 0;
  for (const [username, role] of [['clerk', Role.CLERK], ['employee', Role.EMPLOYEE], ['owner', Role.OWNER]] as const) {
    const password = shared || (onVercel ? null : `${username}123`);
    if (!password) continue;
    await prisma.user.upsert({
      where: { username },
      update: {},
      create: { username, role, passwordHash: bcrypt.hashSync(password, 10) },
    });
    users++;
  }
  if (!users) console.warn('SEED_STAFF_PASSWORD not set: no staff accounts created.');

  console.log(
    `Seeded ${Object.keys(PUBLISHERS).length} publishers, ${BOOKS.length} books, ${REQUESTS.length} requests, ` +
      `${receipts} demo receipts, ${users} staff accounts.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
