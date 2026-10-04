import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, errorText } from '../api/client';
import { Sparkle } from '../components/Status';

interface Item {
  isbn: string; title: string; stock: number; copiesSoldLast14: number; leadTimeDays: number;
  inventoryLevel: number; toProcure: number; publisher: string; publisherAddress: string;
}

// R.9: computed by the server against its own date. Rows arrive ordered by publisher, so
// the printed list reads as one purchase order per publisher.
export default function Reorder() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['reports', 'reorder'],
    queryFn: () => api<Item[]>('/reports/reorder', { auth: true }),
  });

  const groups = new Map<string, Item[]>();
  for (const it of data ?? []) groups.set(it.publisher, [...(groups.get(it.publisher) ?? []), it]);
  const copies = (data ?? []).reduce((s, it) => s + it.toProcure, 0);

  return (
    <div className="pt-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow no-print">Today's order</p>
          <h1 className="page-title">Reorder list</h1>
          <p className="lede">
            Titles whose stock is below their level (copies sold in the last 14 days × lead time).
            {data && data.length > 0 && <> <b className="text-ink">{data.length} titles, {copies} copies</b> to order.</>}
          </p>
        </div>
        {data && data.length > 0 && (
          <button type="button" onClick={() => window.print()} className="btn-primary no-print">Print list</button>
        )}
      </div>

      {isPending && <p className="py-10 text-center text-ink-muted">Working out today's list…</p>}
      {isError && <p className="notice-err mt-6" role="alert">{errorText(error)}</p>}

      {data?.length === 0 && (
        <div className="card mt-8 p-10 text-center">
          <Sparkle className="mx-auto h-8 w-8 text-lagoon-400" />
          <p className="mt-3 text-lg font-bold">Every shelf is comfortably stocked today.</p>
        </div>
      )}

      <div className="mt-8 space-y-8">
        {[...groups].map(([publisher, items]) => (
          <section key={publisher} aria-labelledby={`pub-${publisher}`}>
            <h2 id={`pub-${publisher}`} className="text-2xl font-semibold">{publisher}</h2>
            <p className="mb-3 text-ink-muted">{items[0].publisherAddress}</p>
            <div className="table-wrap">
              <table className="w-full min-w-[720px] text-[15px]">
                <caption className="sr-only">Titles to order from {publisher}</caption>
                <thead className="border-b border-cream-300 bg-cream-200/50">
                  <tr>
                    <th scope="col" className="th">Title</th>
                    <th scope="col" className="th text-right">In stock</th>
                    <th scope="col" className="th text-right">Sold (14 d)</th>
                    <th scope="col" className="th text-right">Lead time</th>
                    <th scope="col" className="th text-right">Level</th>
                    <th scope="col" className="th text-right">To order</th>
                    <th scope="col" className="th no-print"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-300">
                  {items.map((r) => (
                    <tr key={r.isbn}>
                      <td className="td">
                        <p className="font-bold">{r.title}</p>
                        <p className="font-mono text-xs text-ink-muted">{r.isbn}</p>
                      </td>
                      <td className="td text-right">{r.stock}</td>
                      <td className="td text-right">{r.copiesSoldLast14}</td>
                      <td className="td text-right">{r.leadTimeDays} d</td>
                      <td className="td text-right">{r.inventoryLevel}</td>
                      <td className="td text-right text-lg font-extrabold">{r.toProcure}</td>
                      <td className="td no-print text-right">
                        <Link to={`/inventory?isbn=${r.isbn}`} className="btn-outline btn-sm">
                          Receive<span className="sr-only"> {r.title}</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
