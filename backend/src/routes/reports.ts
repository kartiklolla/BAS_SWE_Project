import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Role } from '@prisma/client';
import { prisma } from '../db.js';
import { salesStats, reorderList } from '../services/reports.js';

export const reportsRouter = Router();
reportsRouter.use(requireAuth, requireRole(Role.OWNER));

// GET /api/reports/demand  R.7. requestCount > 0, descending.
reportsRouter.get('/demand', async (_req, res) => {
  const books = await prisma.book.findMany({
    where: { requestCount: { gt: 0 } },
    orderBy: { requestCount: 'desc' },
  });
  res.json(books);
});

// GET /api/reports/sales?from=&to=  R.8. 400 if from > to.
reportsRouter.get('/sales', async (req, res) => {
  const from = String(req.query.from ?? '');
  const to = String(req.query.to ?? '');
  if (!from || !to) return res.status(400).json({ error: 'from and to required (YYYY-MM-DD)' });
  if (from > to) return res.status(400).json({ error: 'from must not be after to' });
  res.json(await salesStats(from, to));
});

// GET /api/reports/reorder  R.9. Computed against server's current date.
reportsRouter.get('/reorder', async (_req, res) => {
  res.json(await reorderList());
});
