import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, rupees, ApiError, type Book } from '../api/client';

export default function BookDetail() {
  const { isbn } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ['book', isbn],
    retry: false,
    queryFn: () => api<Book>(`/books/${isbn}`),
  });

  if (isLoading) return <p>Loading…</p>;

  // 404 -> uncatalogued: offer the procurement request form (R.2).
  if (error instanceof ApiError && error.status === 404) return <RequestForm />;
  if (error) return <p className="text-red-600">Could not load this book.</p>;

  const b = data!;
  return (
    <div className="card p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">{b.title}</h1>
      <p className="text-slate-500 mb-4">{b.author}</p>
      {b.stock > 0 ? (
        <>
          <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 mb-4">
            {b.stock} in stock
          </span>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="label">Copies available</dt><dd className="text-right font-medium">{b.stock}</dd>
            <dt className="label">Rack</dt><dd className="text-right font-medium">{b.rackNo ?? '—'}</dd>
            <dt className="label">Price</dt><dd className="text-right font-semibold text-lg">{rupees(b.priceInPaise)}</dd>
          </dl>
        </>
      ) : (
        <p className="text-slate-500">Not currently available. Your interest has been recorded.</p>
      )}
    </div>
  );
}

function RequestForm() {
  const [f, setF] = useState({ title: '', author: '', publisher: '', edition: '' });
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'saving') return; // double-click guard: no duplicate stub
    if (!f.title.trim() || !f.author.trim() || !f.publisher.trim()) return;
    setState('saving');
    try {
      await api('/books/requests', { method: 'POST', body: JSON.stringify(f) });
      setState('done');
      setMsg('Request recorded. We will stock this title based on demand.');
    } catch (err) {
      setState('error');
      setMsg(err instanceof ApiError && err.status === 409 ? 'This title is already on record.' : 'Something went wrong.');
    }
  };

  if (state === 'done') return <p className="text-green-700">{msg}</p>;

  return (
    <form onSubmit={submit} className="card p-6 max-w-md mx-auto space-y-3">
      <h1 className="text-xl font-bold text-slate-900">Request this book</h1>
      <p className="text-sm text-slate-500">We don't have it yet. Tell us what to order.</p>
      {(['title', 'author', 'publisher', 'edition'] as const).map((k) => (
        <input key={k} className="input w-full" placeholder={k[0].toUpperCase() + k.slice(1) + (k === 'edition' ? ' (optional)' : '')}
          value={f[k]} maxLength={200} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
      ))}
      {state === 'error' && <p className="text-red-600 text-sm">{msg}</p>}
      <button disabled={state === 'saving'} className="btn-primary">
        {state === 'saving' ? 'Submitting…' : 'Submit request'}
      </button>
    </form>
  );
}
