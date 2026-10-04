import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, errorText, rupees, type Book } from '../api/client';
import { Cover } from '../components/Cover';
import { Sparkle, Status } from '../components/Status';

export default function BookDetail() {
  const { isbn = '' } = useParams();
  const { data: b, isPending, error } = useQuery({
    queryKey: ['book', isbn],
    retry: false,
    queryFn: () => api<Book>(`/books/${encodeURIComponent(isbn)}`),
  });

  if (isPending) return <p role="status" className="py-16 text-center text-lg text-ink-muted">Finding that book…</p>;
  // Enquiry diagram, "no match" branch: offer the procurement request (R.2).
  if (error instanceof ApiError && error.status === 404) {
    return <RequestForm heading="We don't have this book yet" />;
  }
  if (error || !b) return <p role="alert" className="notice-err">{errorText(error, 'Could not load this book.')}</p>;

  return (
    <article className="pt-4">
      <Link to="/" className="link text-sm">← Back to the shelves</Link>
      <div className="mt-6 grid gap-10 md:grid-cols-[minmax(0,300px)_1fr]">
        <div className="mx-auto w-56 md:w-full">
          <Cover book={b} size="lg" />
        </div>
        <div>
          <p className="eyebrow">{b.author}</p>
          <h1 className="mt-1 text-4xl font-semibold leading-tight sm:text-5xl">{b.title}</h1>
          <div className="mt-4"><Status book={b} /></div>

          {b.stock > 0 ? (
            <dl className="card mt-6 grid max-w-md grid-cols-2 gap-x-6 gap-y-4 p-6">
              <dt className="text-ink-muted">Price</dt>
              <dd className="text-right text-2xl font-extrabold">{rupees(b.priceInPaise)}</dd>
              <dt className="text-ink-muted">Copies available</dt>
              <dd className="text-right font-bold">{b.stock}</dd>
              <dt className="text-ink-muted">Find it on</dt>
              <dd className="text-right font-bold">{b.rackNo != null ? `Rack ${b.rackNo}` : 'Ask at the counter'}</dd>
              {b.publisher && (
                <>
                  <dt className="text-ink-muted">Publisher</dt>
                  <dd className="text-right font-bold">{b.publisher.name}</dd>
                </>
              )}
              <dt className="text-ink-muted">ISBN</dt>
              <dd className="text-right font-mono text-sm">{b.isbn}</dd>
            </dl>
          ) : (
            <AskForIt book={b} />
          )}
        </div>
      </div>
    </article>
  );
}

// Enquiry diagram, "stock = 0" branch: the customer tells the shop they want it (R.3).
function AskForIt({ book }: { book: Book }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const ask = async () => {
    if (state === 'sending' || state === 'done') return;
    setState('sending');
    try {
      const r = await api<{ requestCount: number }>(`/books/${encodeURIComponent(book.isbn)}/interest`, { method: 'POST' });
      setState('done');
      setMsg(`Thank you! ${r.requestCount} ${r.requestCount === 1 ? 'reader is' : 'readers are'} waiting for this one, and the shop can see it.`);
    } catch (e) {
      setState('error');
      setMsg(errorText(e));
    }
  };

  return (
    <div className="card mt-6 max-w-md p-6">
      <h2 className="text-2xl font-semibold">
        {book.stocked ? 'Not on the shelf right now' : 'Readers have asked for this one'}
      </h2>
      <p className="mt-2 text-ink-muted">
        {book.stocked
          ? 'Every copy has found a home. Let us know you want it and we will restock sooner.'
          : `The shop hasn't stocked it yet. ${book.requestCount} ${book.requestCount === 1 ? 'reader has' : 'readers have'} requested it so far.`}
      </p>
      <div aria-live="polite">
        {state === 'done' && <p className="notice-ok mt-4">{msg}</p>}
        {state === 'error' && <p className="notice-err mt-4" role="alert">{msg}</p>}
      </div>
      {state !== 'done' && (
        <button type="button" onClick={ask} disabled={state === 'sending'} className="btn-primary mt-5">
          {state === 'sending' ? 'Letting them know…' : 'I want this book'}
        </button>
      )}
    </div>
  );
}

export function RequestPage() {
  return <RequestForm heading="Request a book" />;
}

const FIELDS = [
  { key: 'title', label: 'Title', required: true },
  { key: 'author', label: 'Author', required: true },
  { key: 'publisher', label: 'Publisher', required: true },
  { key: 'edition', label: 'Edition', required: false },
] as const;

// R.2: register a procurement request for a title the shop doesn't carry.
function RequestForm({ heading }: { heading: string }) {
  const [params] = useSearchParams();
  const qc = useQueryClient();
  const [f, setF] = useState({ title: params.get('title') ?? '', author: '', publisher: '', edition: '' });
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState<React.ReactNode>('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'saving') return; // double-click guard: no duplicate stub
    setState('saving');
    try {
      await api('/books/requests', { method: 'POST', body: JSON.stringify(f) });
      setState('done');
      setMsg("Request recorded! The shop will see it on their demand report.");
    } catch (err) {
      // 409: someone already asked for (or the shop already has) this title. Count this reader too.
      const isbn = err instanceof ApiError && err.status === 409 ? (err.body.isbn as string | undefined) : undefined;
      if (!isbn) {
        setState('error');
        setMsg(errorText(err));
        return;
      }
      try {
        const r = await api<{ requestCount: number }>(`/books/${isbn}/interest`, { method: 'POST' });
        setState('done');
        setMsg(`Someone already asked for this one, so we've added your vote. ${r.requestCount} readers are waiting.`);
      } catch {
        setState('done');
        setMsg(<>Good news: we already have it. <Link className="link" to={`/books/${isbn}`}>See availability</Link></>);
      }
    }
    qc.invalidateQueries({ queryKey: ['books'] });
  };

  if (state === 'done') {
    return (
      <div className="card mx-auto mt-6 max-w-lg p-8 text-center">
        <Sparkle className="mx-auto h-9 w-9 text-mustard-400" />
        <h1 className="mt-3 text-3xl font-semibold">Thank you!</h1>
        <p className="mt-3 text-ink-soft" role="status">{msg}</p>
        <Link to="/" className="btn-primary mt-6">Back to the shelves</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card mx-auto mt-6 max-w-lg space-y-5 p-8">
      <div>
        <p className="eyebrow">Can't find it?</p>
        <h1 className="text-3xl font-semibold sm:text-4xl">{heading}</h1>
        <p className="mt-2 text-ink-muted">Tell us what to look for and we'll try to bring it to the shelves.</p>
      </div>
      {FIELDS.map(({ key, label, required }) => (
        <div key={key}>
          <label htmlFor={`req-${key}`} className="label">
            {label} {required ? <span aria-hidden="true" className="text-coral-800">*</span> : <span className="font-semibold text-ink-muted">(optional)</span>}
          </label>
          <input
            id={`req-${key}`}
            className="input"
            required={required}
            maxLength={200}
            value={f[key]}
            onChange={(e) => setF({ ...f, [key]: e.target.value })}
          />
        </div>
      ))}
      {state === 'error' && <p className="notice-err" role="alert">{msg}</p>}
      <button type="submit" disabled={state === 'saving'} className="btn-primary w-full">
        {state === 'saving' ? 'Sending your request…' : 'Send request'}
      </button>
    </form>
  );
}
