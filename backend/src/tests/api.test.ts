import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';
import { createApp } from '../app.js';
import { prisma } from '../db.js';
import { signToken } from '../middleware/auth.js';

const app = createApp();
const employee = `Bearer ${signToken(0, Role.EMPLOYEE)}`;
const PUB = 'Zyzzyva Test Press';
const REAL_ISBN = '9799999999990';

const cleanup = async () => {
  await prisma.book.deleteMany({ where: { title: { startsWith: 'Zyzzyva' } } });
  await prisma.publisher.deleteMany({ where: { name: PUB } });
};

beforeAll(async () => {
  await cleanup();
  const pub = await prisma.publisher.create({ data: { name: PUB, address: 'Nowhere' } });
  await prisma.book.create({
    data: { isbn: 'ZYZTEST000001', title: 'Zyzzyva Out Of Stock', author: 'T', publisherId: pub.id, priceInPaise: 100, stock: 0, stocked: true },
  });
});
afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

const count = async (isbn: string) => (await prisma.book.findUniqueOrThrow({ where: { isbn } })).requestCount;

describe('enquiry demand (R.3)', () => {
  it('browsing never counts demand; a search matching a zero-stock title does', async () => {
    await request(app).get('/api/books').expect(200);
    expect(await count('ZYZTEST000001')).toBe(0);
    await request(app).get('/api/books?title=zyzzyva out').expect(200);
    expect(await count('ZYZTEST000001')).toBe(1);
  });
});

describe('requested title lifecycle (state diagram: Requested -> InStock)', () => {
  it('stub must be priced before stocking, takes its real ISBN, then the ISBN freezes', async () => {
    const created = await request(app)
      .post('/api/books/requests')
      .send({ title: 'Zyzzyva Stub', author: 'A', publisher: PUB })
      .expect(201);
    const stub = created.body.isbn as string;

    // Same details resolve to the same key: duplicate, not a second stub.
    await request(app).post('/api/books/requests').send({ title: ' zyzzyva  stub', author: 'a', publisher: PUB }).expect(409);

    await request(app).post(`/api/books/${stub}/receive`).set('authorization', employee).send({ qty: 2 }).expect(400);

    await request(app)
      .patch(`/api/books/${stub}`)
      .set('authorization', employee)
      .send({ isbn: REAL_ISBN, priceInPaise: 50000, rackNo: 2, leadTimeDays: 3, publisherAddress: 'Real St' })
      .expect(200);

    const received = await request(app)
      .post(`/api/books/${REAL_ISBN}/receive`)
      .set('authorization', employee)
      .send({ qty: 2 })
      .expect(200);
    expect(received.body).toMatchObject({ stock: 2, requestCount: 0, stocked: true, leadTimeDays: 3 });
    expect(received.body.publisher.address).toBe('Real St');

    await request(app).patch(`/api/books/${REAL_ISBN}`).set('authorization', employee).send({ isbn: '9799999999991' }).expect(409);
  });
});
