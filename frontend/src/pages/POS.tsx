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
      <div>
        <div className="bg-white rounded border p-6 max-w-sm">
          <h1 className="text-lg font-bold">Receipt #{receipt.receiptNo}</h1>
          <p className="text-sm text-gray-500 mb-3">{receipt.issuedOn}</p>
          <ul className="divide-y">
            {receipt.lines.map((l, i) => (
              <li key={i} className="py-1 flex justify-between text-sm">
                <span>{l.title}</span><span>{rupees(l.unitPriceInPaise)}</span>
              </li>
            ))}
          </ul>
          <p className="border-t mt-2 pt-2 flex justify-between font-bold">
            <span>Total</span><span>{rupees(receipt.totalInPaise)}</span>
          </p>
          {receipt.rejected.length > 0 && (
            <p className="text-xs text-amber-700 mt-2">
              Rejected: {receipt.rejected.map((r) => `${r.isbn} (${r.reason})`).join(', ')}
            </p>
          )}
        </div>
        <div className="no-print mt-4 flex gap-2">
          <button onClick={() => window.print()} className="bg-gray-800 text-white rounded px-4 py-2">Print</button>
          <button onClick={() => location.reload()} className="border rounded px-4 py-2">New sale</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-4">Point of sale</h1>
      <form onSubmit={addScan} className="flex gap-2 mb-2">
        <input autoFocus className="border rounded px-3 py-2 flex-1" placeholder="Scan / type ISBN"
          value={scan} onChange={(e) => setScan(e.target.value)} />
        <button className="bg-blue-600 text-white rounded px-4 py-2">Add</button>
      </form>
      {msg && <p className="text-amber-700 text-sm mb-2">{msg}</p>}

      <ul className="bg-white rounded border divide-y mb-3">
        {cart.length === 0 && <li className="p-3 text-gray-400">Cart is empty.</li>}
        {cart.map((l, i) => (
          <li key={i} className="p-3 flex justify-between text-sm">
            <span>{l.title}</span><span>{rupees(l.priceInPaise)}</span>
          </li>
        ))}
      </ul>
      <div className="flex justify-between items-center">
        <span className="font-bold text-lg">Total: {rupees(running)}</span>
        <button onClick={commit} disabled={committing || cart.length === 0}
          className="bg-green-600 text-white rounded px-6 py-2 disabled:opacity-50">
          {committing ? 'Committing…' : 'Commit & print'}
        </button>
      </div>
    </div>
  );
}
