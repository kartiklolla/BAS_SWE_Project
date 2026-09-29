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
      <h1 className="text-2xl font-bold mb-4">Find a book</h1>
      <form onSubmit={submit} className="flex flex-wrap gap-2 mb-6">
        <input className="border rounded px-3 py-2" placeholder="Title" value={title} maxLength={200}
          onChange={(e) => setTitle(e.target.value)} />
        <input className="border rounded px-3 py-2" placeholder="Author" value={author} maxLength={200}
          onChange={(e) => setAuthor(e.target.value)} />
        <button className="bg-blue-600 text-white rounded px-4 py-2">Search</button>
      </form>

      {isFetching && <p>Searching…</p>}
      {isError && <p className="text-red-600">Search failed. Try again.</p>}
      {data && data.length === 0 && (
        <p>No matches. <Link className="text-blue-600 underline" to="/books/none">Request a new title</Link></p>
      )}
      <ul className="divide-y bg-white rounded border">
        {data?.map((b) => (
          <li key={b.isbn} className="p-3 hover:bg-gray-50">
            <Link to={`/books/${b.isbn}`} className="flex justify-between">
              <span>
                <span className="font-medium">{b.title}</span> <span className="text-gray-500">— {b.author}</span>
              </span>
              <span className={b.stock > 0 ? 'text-green-700' : 'text-gray-400'}>
                {b.stock > 0 ? `${b.stock} in stock · ${rupees(b.priceInPaise)}` : 'not available'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
