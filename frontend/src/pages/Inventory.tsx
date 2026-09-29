import { useState } from 'react';
import { api, rupees, ApiError, type Book } from '../api/client';

export default function Inventory() {
  const [isbn, setIsbn] = useState('');
  const [book, setBook] = useState<Book | null>(null);
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState(''); // rupees in the input, converted to paise
  const [msg, setMsg] = useState('');

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setBook(null);
    try {
      setBook(await api<Book>(`/books/${isbn.trim()}`));
    } catch (err) {
      setMsg(err instanceof ApiError && err.status === 404 ? 'ISBN not found.' : 'Lookup failed.');
    }
  };

  const receive = async () => {
    const n = Number(qty);
    if (!Number.isInteger(n) || n <= 0) return setMsg('Quantity must be a positive whole number.');
    try {
      setBook(await api<Book>(`/books/${book!.isbn}/receive`, { method: 'POST', auth: true, body: JSON.stringify({ qty: n }) }));
      setQty('');
      setMsg('Stock received; request count cleared.');
    } catch { setMsg('Receive failed.'); }
  };

  const updatePrice = async () => {
    const paise = Math.round(Number(price) * 100);
    if (!Number.isFinite(paise) || paise <= 0) return setMsg('Price must be greater than zero.');
    try {
      setBook(await api<Book>(`/books/${book!.isbn}/price`, { method: 'PATCH', auth: true, body: JSON.stringify({ priceInPaise: paise }) }));
      setPrice('');
      setMsg('Price updated (applies to future sales only).');
    } catch { setMsg('Price update failed.'); }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Inventory</h1>
      <form onSubmit={lookup} className="flex gap-2 mb-4">
        <input className="input flex-1" placeholder="ISBN" value={isbn} onChange={(e) => setIsbn(e.target.value)} />
        <button className="btn-primary">Find</button>
      </form>
      {msg && <p className="text-sm text-slate-700 mb-3 bg-slate-100 rounded-lg p-2">{msg}</p>}

      {book && (
        <div className="card p-5 space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <p className="font-semibold text-slate-900">{book.title}</p>
            <p className="text-sm text-slate-500 mt-1">
              Stock {book.stock} · {rupees(book.priceInPaise)} · rack {book.rackNo ?? '—'} · {book.requestCount} requests
            </p>
          </div>
          <div className="flex gap-2 items-end">
            <label className="label flex-1">Receive qty
              <input type="number" min={1} className="input w-full mt-1" value={qty} onChange={(e) => setQty(e.target.value)} />
            </label>
            <button onClick={receive} className="btn-success">Receive</button>
          </div>
          <div className="flex gap-2 items-end">
            <label className="label flex-1">New price (₹)
              <input type="number" min={0.01} step={0.01} className="input w-full mt-1" value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
            <button onClick={updatePrice} className="btn-dark">Set price</button>
          </div>
        </div>
      )}
    </div>
  );
}
