import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Role } from '@prisma/client';
import { recordSale, getReceipt } from '../services/sales.js';

export const salesRouter = Router();

// POST /api/sales  R.5 (Clerk). Body {items:[isbn,...]}. Optional Idempotency-Key header.
salesRouter.post('/', requireAuth, requireRole(Role.CLERK), async (req, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items) || items.some((i) => typeof i !== 'string')) {
    return res.status(400).json({ error: 'items must be an array of ISBN strings' });
  }
  const key =
    (typeof req.headers['idempotency-key'] === 'string' ? req.headers['idempotency-key'] : undefined) ??
    (typeof req.body?.idempotencyKey === 'string' ? req.body.idempotencyKey : undefined);

  const result = await recordSale(items, key);
  res.status(201).json(result);
});

// GET /api/sales/:receiptNo  reprint-safe retrieval of an existing receipt.
salesRouter.get('/:receiptNo', requireAuth, requireRole(Role.CLERK), async (req, res) => {
  const receipt = await getReceipt(Number(req.params.receiptNo));
  if (!receipt) return res.status(404).json({ error: 'Not found' });
  res.json(receipt);
});
