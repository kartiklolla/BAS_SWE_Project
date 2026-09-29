import express from 'express';
import 'express-async-errors'; // forwards async handler rejections to the error middleware
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { booksRouter } from './routes/books.js';
import { salesRouter } from './routes/sales.js';
import { reportsRouter } from './routes/reports.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/auth', authRouter);
  app.use('/api/books', booksRouter);
  app.use('/api/sales', salesRouter);
  app.use('/api/reports', reportsRouter);

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // Fallback error handler -> 500 (spec standard codes).
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
