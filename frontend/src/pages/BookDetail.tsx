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
    <div className="bg-white rounded border p-6 max-w-md">
      <h1 className="text-2xl font-bold">{b.title}</h1>
      <p className="text-gray-600 mb-4">{b.author}</p>
      {b.stock > 0 ? (
        <dl className="space-y-1">
          <div><dt className="inline font-medium">Available:</dt> {b.stock} copies</div>
          <div><dt className="inline font-medium">Rack:</dt> {b.rackNo ?? '—'}</div>
          <div><dt className="inline font-medium">Price:</dt> {rupees(b.priceInPaise)}</div>
        </dl>
      ) : (
        <p className="text-gray-500">Not currently available. Your interest has been recorded.</p>
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
    <form onSubmit={submit} className="bg-white rounded border p-6 max-w-md space-y-3">
      <h1 className="text-xl font-bold">Request this book</h1>
      <p className="text-sm text-gray-500">We don't have it yet. Tell us what to order.</p>
      {(['title', 'author', 'publisher', 'edition'] as const).map((k) => (
        <input key={k} className="border rounded px-3 py-2 w-full" placeholder={k[0].toUpperCase() + k.slice(1) + (k === 'edition' ? ' (optional)' : '')}
          value={f[k]} maxLength={200} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
      ))}
      {state === 'error' && <p className="text-red-600 text-sm">{msg}</p>}
      <button disabled={state === 'saving'} className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50">
        {state === 'saving' ? 'Submitting…' : 'Submit request'}
      </button>
    </form>
  );
}
