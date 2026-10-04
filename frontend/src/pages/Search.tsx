import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, errorText, type Book } from '../api/client';
import { HeroBooks } from '../components/HeroBooks';
import { BookCard } from '../components/BookCard';
import { Sparkle } from '../components/Status';

export default function Search() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q')?.trim() ?? '';
  const [draft, setDraft] = useState(q);
  useEffect(() => setDraft(q), [q]); // keep the box in step with Back/Forward

  // Browsing the shelves: no search term, so no R.3 side effect server-side.
  const shelves = useQuery({
    queryKey: ['books', 'all'],
    enabled: !q,
    queryFn: () => api<Book[]>('/books'),
  });
  // One box searches title OR author. Cached per term, so revisiting a term doesn't re-count demand.
  const results = useQuery({
    queryKey: ['books', 'search', q],
    enabled: !!q,
    staleTime: 5 * 60_000,
    queryFn: () => api<Book[]>(`/books?${new URLSearchParams({ title: q, author: q })}`),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = draft.trim();
    if (!term) return; // empty search: stay on the shelves
    setParams({ q: term });
    document.getElementById('shelves')?.scrollIntoView({ behavior: 'smooth' });
  };
  const clear = () => {
    setDraft('');
    setParams({});
  };

  const active = q ? results : shelves;
  const books = q ? results.data : shelves.data?.filter((b) => b.stocked);

  return (
    <>
      <section className="grid items-center gap-8 pb-10 pt-4 md:grid-cols-[1.05fr_1fr] md:pt-10">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <Sparkle className="h-5 w-5 text-mustard-400" /> Start your reading journey today
          </p>
          <h1 className="mt-3 text-5xl font-light leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            Where every page is a new <em className="font-normal text-fern-800">adventure</em>
          </h1>
          <p className="lede">
            From classics to contemporary, our shelves hold a book for every taste. Search by title or author to see
            what's in stock, where it sits, and what it costs.
          </p>

          <form role="search" onSubmit={submit} className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
            <label htmlFor="q" className="sr-only">Search books by title or author</label>
            <div className="relative flex-1">
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                id="q"
                type="search"
                className="input rounded-full py-3 pl-11"
                placeholder="Try “Tolkien” or “The Little Prince”"
                value={draft}
                maxLength={200}
                onChange={(e) => setDraft(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary px-7">Search books</button>
          </form>
        </div>
        <HeroBooks className="mx-auto w-full max-w-[540px]" />
      </section>

      <section id="shelves" aria-labelledby="shelves-heading" className="scroll-mt-6 pt-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">{q ? 'Search results' : 'Browse'}</p>
            <h2 id="shelves-heading" className="text-3xl font-semibold sm:text-4xl">
              {q ? <>Books matching “{q}”</> : 'On our shelves'}
            </h2>
          </div>
          {q && (
            <button type="button" onClick={clear} className="btn-soft btn-sm">
              Clear search
            </button>
          )}
        </div>

        <p className="sr-only" role="status" aria-live="polite">
          {active.isFetching ? 'Loading books' : books ? `${books.length} ${books.length === 1 ? 'book' : 'books'} found` : ''}
        </p>

        {active.isPending && active.fetchStatus !== 'idle' && (
          <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <li key={i} className="card h-80 animate-pulse bg-cream-200/60" />
            ))}
          </ul>
        )}

        {active.isError && (
          <div className="notice-err flex flex-wrap items-center justify-between gap-3" role="alert">
            {errorText(active.error)}
            <button type="button" className="btn-outline btn-sm" onClick={() => active.refetch()}>Try again</button>
          </div>
        )}

        {books && books.length === 0 && (
          <div className="card mx-auto max-w-xl p-8 text-center">
            <Sparkle className="mx-auto h-8 w-8 text-lagoon-400" />
            <h3 className="mt-3 text-2xl font-semibold">We don't have that one… yet</h3>
            <p className="mt-2 text-ink-muted">Tell us about it and we'll try to bring it to the shelves.</p>
            <Link to={`/request?title=${encodeURIComponent(q)}`} className="btn-primary mt-5">Request this book</Link>
          </div>
        )}

        {books && books.length > 0 && (
          <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {books.map((b) => <BookCard key={b.isbn} book={b} />)}
          </ul>
        )}
      </section>
    </>
  );
}
