import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, errorText, type Book } from '../api/client';
import { Cover } from '../components/Cover';
import { Sparkle, Status } from '../components/Status';

// R.7: titles customers asked for (requestCount > 0), most wanted first.
// Each row leads to the action that resolves it: stocking the title in Inventory.
export default function Demand() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['reports', 'demand'],
    queryFn: () => api<Book[]>('/reports/demand', { auth: true }),
  });

  return (
    <div className="pt-4">
      <p className="eyebrow">What readers are asking for</p>
      <h1 className="page-title">Demand</h1>
      <p className="lede">
        Every search that finds an out-of-stock title, every “I want this book”, and every new request lands here.
        Receiving stock for a title clears its count.
      </p>

      {isPending && <p className="py-10 text-center text-ink-muted">Loading…</p>}
      {isError && <p className="notice-err mt-6" role="alert">{errorText(error)}</p>}

      {data?.length === 0 && (
        <div className="card mt-8 p-10 text-center">
          <Sparkle className="mx-auto h-8 w-8 text-lagoon-400" />
          <p className="mt-3 text-lg font-bold">No open requests. Every wish has been granted.</p>
        </div>
      )}

      {data && data.length > 0 && (
        <ol className="mt-8 space-y-3">
          {data.map((b, i) => (
            <li key={b.isbn} className="card flex flex-wrap items-center gap-4 p-4">
              <span className="w-8 text-center font-display text-2xl font-semibold text-ink-muted" aria-hidden="true">{i + 1}</span>
              <Cover book={b} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold leading-snug">{b.title}</p>
                <p className="text-sm text-ink-muted">{b.author}{b.publisher && ` · ${b.publisher.name}`}</p>
                <div className="mt-1.5">
                  {b.stocked ? <Status book={b} /> : <span className="badge-req">New title — not catalogued yet</span>}
                </div>
              </div>
              <p className="text-center">
                <span className="block font-display text-3xl font-semibold">{b.requestCount}</span>
                <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">{b.requestCount === 1 ? 'request' : 'requests'}</span>
              </p>
              <Link to={`/inventory?isbn=${b.isbn}`} className="btn-primary btn-sm">
                {b.stocked ? 'Receive stock' : 'Stock this title'}<span className="sr-only">: {b.title}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
