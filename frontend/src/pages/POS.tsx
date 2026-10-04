import { useRef, useState } from 'react';
import { api, ApiError, errorText, ISBN_RE, rupees, type Book, type Receipt } from '../api/client';
import { Cover } from '../components/Cover';
import { Sparkle } from '../components/Status';

interface CartLine { id: number; isbn: string; title: string; author: string; priceInPaise: number }

let nextId = 1;

export default function POS() {
  const [scan, setScan] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  // One key per cart: a retried commit (timeout, re-auth) can't sell twice (spec section 16).
  const [idemKey, setIdemKey] = useState(() => crypto.randomUUID());
  const [msg, setMsg] = useState<{ kind: 'ok' | 'warn' | 'err'; text: string } | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);

  const total = cart.reduce((s, l) => s + l.priceInPaise, 0);

  const addScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const isbn = scan.trim().toUpperCase();
    if (!ISBN_RE.test(isbn)) {
      setMsg({ kind: 'err', text: 'An ISBN is 10 or 13 digits (an ISBN-10 may end in X).' });
      return;
    }
    try {
      // Fetched fresh on every scan, so a copy another clerk just sold is never added from stale data.
      const b = await api<Book>(`/books/${isbn}`);
      const inCart = cart.filter((l) => l.isbn === b.isbn).length;
      if (b.stock - inCart <= 0) {
        setMsg({ kind: 'warn', text: inCart ? `No more copies of “${b.title}” left on the shelf.` : `“${b.title}” is out of stock.` });
      } else {
        setCart((c) => [...c, { id: nextId++, isbn: b.isbn, title: b.title, author: b.author, priceInPaise: b.priceInPaise }]);
        setMsg({ kind: 'ok', text: `Added “${b.title}”, ${rupees(b.priceInPaise)}.` });
        setScan('');
      }
    } catch (err) {
      setMsg({ kind: 'err', text: err instanceof ApiError && err.status === 404 ? 'That ISBN is not in the catalogue.' : errorText(err) });
    }
    scanRef.current?.focus();
  };

  const remove = (line: CartLine) => {
    setCart((c) => c.filter((l) => l.id !== line.id));
    setMsg({ kind: 'ok', text: `Removed “${line.title}”.` });
    scanRef.current?.focus();
  };

  const commit = async () => {
    if (!cart.length || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<Receipt>('/sales', {
        method: 'POST',
        auth: true,
        headers: { 'idempotency-key': idemKey },
        body: JSON.stringify({ items: cart.map((l) => l.isbn) }),
      });
      setReceipt(r);
      setCart([]);
    } catch (err) {
      // The cart stays put; retrying reuses the same key so nothing can be sold twice.
      setMsg({
        kind: 'err',
        text:
          err instanceof ApiError && err.status === 401
            ? 'Your session expired. Sign in again in a new tab, then press “Complete sale” — the cart is kept.'
            : `${errorText(err)} The cart is kept; press “Complete sale” to retry.`,
      });
    } finally {
      setBusy(false);
    }
  };

  const newSale = () => {
    setReceipt(null);
    setMsg(null);
    setIdemKey(crypto.randomUUID());
    setTimeout(() => scanRef.current?.focus());
  };

  if (receipt) return <ReceiptView receipt={receipt} onDone={newSale} />;

  return (
    <div className="pt-4">
      <p className="eyebrow">At the counter</p>
      <h1 className="page-title">Point of sale</h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section aria-labelledby="cart-heading">
          <form onSubmit={addScan} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="scan" className="label">Scan or type an ISBN</label>
              <input
                id="scan"
                ref={scanRef}
                autoFocus
                inputMode="numeric"
                autoComplete="off"
                className="input font-mono"
                placeholder="9780547928227"
                value={scan}
                onChange={(e) => setScan(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary">Add to sale</button>
          </form>

          <div aria-live="polite" className="mt-3 min-h-[3rem]">
            {msg && <p className={msg.kind === 'ok' ? 'notice-ok' : msg.kind === 'warn' ? 'notice-warn' : 'notice-err'}>{msg.text}</p>}
          </div>

          <h2 id="cart-heading" className="sr-only">Items in this sale</h2>
          <ul className="card divide-y divide-cream-300 overflow-hidden">
            {cart.length === 0 && (
              <li className="p-8 text-center text-ink-muted">
                <Sparkle className="mx-auto mb-2 h-6 w-6 text-lagoon-400" />
                Nothing scanned yet.
              </li>
            )}
            {cart.map((l) => (
              <li key={l.id} className="flex items-center gap-4 p-3">
                <Cover book={l} size="xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{l.title}</p>
                  <p className="font-mono text-xs text-ink-muted">{l.isbn}</p>
                </div>
                <span className="font-extrabold">{rupees(l.priceInPaise)}</span>
                <button type="button" onClick={() => remove(l)} className="btn-soft btn-sm" aria-label={`Remove ${l.title}`}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-6">
          <div className="card p-6">
            <p className="text-ink-muted">{cart.length} {cart.length === 1 ? 'item' : 'items'}</p>
            <p className="mt-1 flex items-baseline justify-between">
              <span className="font-display text-2xl font-semibold">Total</span>
              <span className="text-3xl font-extrabold" aria-live="polite">{rupees(total)}</span>
            </p>
            <button type="button" onClick={commit} disabled={busy || !cart.length} className="btn-fern mt-5 w-full">
              {busy ? 'Completing…' : 'Complete sale'}
            </button>
            <p className="hint text-center">Stock only changes when the sale is completed.</p>
          </div>
          <FindReceipt onFound={setReceipt} />
        </aside>
      </div>
    </div>
  );
}

// Reprint a receipt that was issued but never reached the clerk (spec section 16).
function FindReceipt({ onFound }: { onFound: (r: Receipt) => void }) {
  const [no, setNo] = useState('');
  const [err, setErr] = useState('');
  const find = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!/^\d+$/.test(no)) return setErr('Enter a receipt number.');
    try {
      onFound(await api<Receipt>(`/sales/${no}`, { auth: true }));
    } catch (e) {
      setErr(e instanceof ApiError && e.status === 404 ? 'No receipt with that number.' : errorText(e));
    }
  };
  return (
    <form onSubmit={find} className="card space-y-3 p-6">
      <h2 className="text-xl font-semibold">Reprint a receipt</h2>
      <div>
        <label htmlFor="receiptNo" className="label">Receipt number</label>
        <input id="receiptNo" inputMode="numeric" className="input" value={no} onChange={(e) => setNo(e.target.value)} />
      </div>
      {err && <p className="notice-err" role="alert">{err}</p>}
      <button type="submit" className="btn-outline btn-sm w-full">Find receipt</button>
    </form>
  );
}

function ReceiptView({ receipt, onDone }: { receipt: Receipt; onDone: () => void }) {
  return (
    <div className="mx-auto max-w-sm pt-4">
      <div className="card p-7" role="region" aria-label={`Receipt ${receipt.receiptNo}`}>
        <div className="border-b-2 border-dashed border-cream-300 pb-4 text-center">
          <p className="font-display text-2xl font-semibold">BAS Books</p>
          <h1 className="font-sans text-sm font-normal text-ink-muted">Receipt #{receipt.receiptNo} · {receipt.issuedOn}</h1>
        </div>
        <ul className="divide-y divide-cream-200 py-2">
          {receipt.lines.map((l, i) => (
            <li key={i} className="flex justify-between gap-4 py-2 text-[15px]">
              <span>{l.title}</span>
              <span className="font-bold">{rupees(l.unitPriceInPaise)}</span>
            </li>
          ))}
        </ul>
        <p className="flex justify-between border-t-2 border-dashed border-cream-300 pt-4 text-xl font-extrabold">
          <span>Total</span>
          <span>{rupees(receipt.totalInPaise)}</span>
        </p>
        {receipt.rejected.length > 0 && (
          <div className="notice-warn mt-4 text-sm" role="status">
            Not sold: {receipt.rejected.map((r) => `${r.isbn} (${r.reason})`).join(', ')}
          </div>
        )}
        <p className="mt-5 text-center font-hand text-2xl font-bold text-fern-800">Thank you for reading!</p>
      </div>
      <div className="no-print mt-5 flex gap-3">
        <button type="button" onClick={() => window.print()} className="btn-primary flex-1">Print receipt</button>
        <button type="button" onClick={onDone} className="btn-outline flex-1">New sale</button>
      </div>
    </div>
  );
}
