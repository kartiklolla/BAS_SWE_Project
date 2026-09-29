# BAS — Book-shop Automation Software

Implements the spec in [CLAUDE.md](CLAUDE.md): enquiry, POS, inventory receiving, and owner reports.

## Run locally

```bash
# 1. Postgres
docker compose up -d db

# 2. Backend  (http://localhost:4000)
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run seed        # publishers, books, users: clerk / employee / owner (pw <name>123)
npm run dev

# 3. Frontend (http://localhost:5173, proxies /api -> backend)
cd frontend
npm install
npm run dev
```

## Test

```bash
cd backend && npm test    # money-path rules: oversell guard, idempotency, reorder
```

## Notes / deliberate scope

- Money is integer paise everywhere; ISBN is the `Book` PK.
- Owner inherits Employee access (enforced in `requireRole` and the frontend route guard).
- `/books/requests` derives a deterministic ISBN from title+author+edition so duplicate requests return `409`, not a second stub.
- Sales are atomic + idempotent (per-cart `Idempotency-Key`); receipts persist and are retrievable by `receiptNo`.
- Frontend is intentionally basic (no e2e/component test suites, no rack/lead-time edit UI — the documented API exposes only price + receive). Add those if needed.
