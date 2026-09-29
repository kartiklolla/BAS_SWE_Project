import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const oreilly = await prisma.publisher.create({
    data: { name: 'Prentice Hall', address: '1 Prentice Way, NJ, USA' },
  });
  const aw = await prisma.publisher.create({
    data: { name: 'Addison-Wesley', address: '75 Arlington St, Boston, USA' },
  });

  await prisma.book.createMany({
    data: [
      {
        isbn: '9780131103627',
        title: 'The C Programming Language',
        author: 'Kernighan & Ritchie',
        publisherId: oreilly.id,
        priceInPaise: 45000,
        rackNo: 12,
        leadTimeDays: 5,
        stock: 8,
        stocked: true,
      },
      {
        isbn: '9780201896831',
        title: 'The Art of Computer Programming',
        author: 'Donald Knuth',
        publisherId: aw.id,
        priceInPaise: 120000,
        rackNo: 3,
        leadTimeDays: 10,
        stock: 2,
        stocked: true,
      },
      {
        isbn: '9788173711463',
        title: 'गोदान', // non-Latin title, R.testing
        author: 'Munshi Premchand',
        publisherId: oreilly.id,
        priceInPaise: 30000,
        rackNo: 7,
        leadTimeDays: 3,
        stock: 0, // out of stock -> enquiry increments requestCount
        stocked: true,
      },
    ],
    skipDuplicates: true,
  });

  const hash = (pw: string) => bcrypt.hashSync(pw, 10);
  await prisma.user.createMany({
    data: [
      { username: 'clerk', passwordHash: hash('clerk123'), role: Role.CLERK },
      { username: 'employee', passwordHash: hash('employee123'), role: Role.EMPLOYEE },
      { username: 'owner', passwordHash: hash('owner123'), role: Role.OWNER },
    ],
    skipDuplicates: true,
  });

  console.log('Seeded publishers, books, and users (clerk/employee/owner, pw <name>123).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
