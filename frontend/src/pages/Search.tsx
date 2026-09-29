import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, rupees, type Book } from '../api/client';

export default function Search() {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [q, setQ] = useState<{ title: string; author: string } | null>(null);

  const { data, isFetching, isError } = useQuery({
    queryKey: ['books', q],
    enabled: !!q,
    queryFn: () => {
      const p = new URLSearchParams();
      if (q!.title) p.set('title', q!.title);
      if (q!.author) p.set('author', q!.author);
      return api<Book[]>(`/books?${p.toString()}`);
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !author.trim()) return; // empty search: do nothing
    setQ({ title: title.trim(), author: author.trim() });
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">Find your next book</h1>
        <p className="text-slate-500 mt-2">Search the shop's catalogue by title or author.</p>
      </div>

      <form onSubmit={submit} className="card p-2 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto">
        <input className="input flex-1" placeholder="Title" value={title} maxLength={200}
          onChange={(e) => setTitle(e.target.value)} />
        <input className="input flex-1" placeholder="Author" value={author} maxLength={200}
          onChange={(e) => setAuthor(e.target.value)} />
        <button className="btn-primary sm:w-auto">Search</button>
      </form>

      <div className="max-w-2xl mx-auto mt-6">
        {isFetching && <p className="text-slate-500 text-center py-6">Searching…</p>}
        {isError && <p className="text-red-600 text-center py-6">Search failed. Try again.</p>}
        {data && data.length === 0 && (
          <div className="card p-8 text-center text-slate-600">
            <p className="mb-3">No matches found.</p>
            <Link className="btn-primary" to="/books/none">Request a new title</Link>
          </div>
        )}
        <ul className="space-y-2">
          {data?.map((b) => (
            <li key={b.isbn}>
              <Link to={`/books/${b.isbn}`} className="card p-4 flex items-center justify-between gap-4 hover:border-indigo-300 hover:shadow transition">
                <span className="min-w-0">
                  <span className="font-semibold text-slate-900 block truncate">{b.title}</span>
                  <span className="text-sm text-slate-500">{b.author}</span>
                </span>
                {b.stock > 0 ? (
                  <span className="shrink-0 text-right">
                    <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      {b.stock} in stock
                    </span>
                    <span className="block mt-1 font-semibold text-slate-900">{rupees(b.priceInPaise)}</span>
                  </span>
                ) : (
                  <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                    not available
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
