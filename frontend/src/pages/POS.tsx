import { useState } from 'react';
import { api, rupees, ApiError, type Book } from '../api/client';

interface CartLine { isbn: string; title: string; priceInPaise: number }
interface Receipt {
  receiptNo: number;
  issuedOn: string;
  lines: { isbn: string; title: string; unitPriceInPaise: number }[];
  rejected: { isbn: string; reason: string }[];
  totalInPaise: number;
}

export default function POS() {
  const [scan, setScan] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [idemKey] = useState(() => crypto.randomUUID()); // one key per cart -> retry-safe
  const [msg, setMsg] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [committing, setCommitting] = useState(false);

  const running = cart.reduce((s, l) => s + l.priceInPaise, 0);

  const addScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const isbn = scan.trim();
    setMsg('');
    if (!/^\d{10,13}$/.test(isbn)) {
      setMsg('ISBN must be 10–13 digits.');
      return;
    }
    try {
      // Fetch fresh each scan so we never add against a stale/sold-out cached stock.
      const b = await api<Book>(`/books/${isbn}`);
      if (b.stock <= 0) {
        setMsg(`"${b.title}" is out of stock.`);
      } else {
        setCart((c) => [...c, { isbn: b.isbn, title: b.title, priceInPaise: b.priceInPaise }]);
        setScan('');
      }
    } catch (err) {
      setMsg(err instanceof ApiError && err.status === 404 ? 'ISBN not in catalogue.' : 'Lookup failed.');
    }
  };

  const commit = async () => {
    if (cart.length === 0 || committing) return;
    setCommitting(true);
    setMsg('');
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
      if (err instanceof ApiError && err.status === 401) {
        // Cart is kept in state; clerk re-authenticates and can retry with the same key.
        setMsg('Session expired. Log in again in another tab — your cart is preserved, press Commit to retry.');
      } else {
        setMsg('Commit failed. Your cart is preserved; try again.');
      }
    } finally {
      setCommitting(false);
    }
  };

  if (receipt) {
    return (
      <div className="max-w-sm mx-auto">
        <div className="card p-6">
          <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
            <h1 className="text-lg font-bold text-slate-900">Receipt #{receipt.receiptNo}</h1>
            <p className="text-sm text-slate-500">{receipt.issuedOn}</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {receipt.lines.map((l, i) => (
              <li key={i} className="py-1.5 flex justify-between text-sm">
                <span className="text-slate-700">{l.title}</span><span className="font-medium">{rupees(l.unitPriceInPaise)}</span>
              </li>
            ))}
          </ul>
          <p className="border-t border-slate-200 mt-2 pt-3 flex justify-between font-bold text-lg">
            <span>Total</span><span>{rupees(receipt.totalInPaise)}</span>
          </p>
          {receipt.rejected.length > 0 && (
            <p className="text-xs text-amber-700 mt-3 bg-amber-50 rounded-lg p-2">
              Rejected: {receipt.rejected.map((r) => `${r.isbn} (${r.reason})`).join(', ')}
            </p>
          )}
        </div>
        <div className="no-print mt-4 flex gap-2">
          <button onClick={() => window.print()} className="btn-dark">Print</button>
          <button onClick={() => location.reload()} className="btn-ghost">New sale</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Point of sale</h1>
      <form onSubmit={addScan} className="flex gap-2 mb-2">
        <input autoFocus className="input flex-1" placeholder="Scan / type ISBN"
          value={scan} onChange={(e) => setScan(e.target.value)} />
        <button className="btn-primary">Add</button>
      </form>
      {msg && <p className="text-amber-700 text-sm mb-2 bg-amber-50 rounded-lg p-2">{msg}</p>}

      <ul className="card divide-y divide-slate-100 my-3 overflow-hidden">
        {cart.length === 0 && <li className="p-4 text-slate-400 text-center">Cart is empty — scan an ISBN to begin.</li>}
        {cart.map((l, i) => (
          <li key={i} className="p-3 flex justify-between text-sm">
            <span className="text-slate-700">{l.title}</span><span className="font-medium">{rupees(l.priceInPaise)}</span>
          </li>
        ))}
      </ul>
      <div className="flex justify-between items-center">
        <span className="font-bold text-lg text-slate-900">Total: {rupees(running)}</span>
        <button onClick={commit} disabled={committing || cart.length === 0} className="btn-success px-6">
          {committing ? 'Committing…' : 'Commit & print'}
        </button>
      </div>
    </div>
  );
}
