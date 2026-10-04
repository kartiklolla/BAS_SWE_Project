import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, errorText, rupees } from '../api/client';

interface Row { isbn: string; title: string; copiesSold: number; revenueInPaise: number }
type Range = { from: string; to: string } | null; // null = server's "last 14 days"

const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// R.8. Opens on the last 14 days, computed by the server so a skewed client clock can't
// move the window; a custom range can be picked below.
export default function SalesStats() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [range, setRange] = useState<Range>(null);
  const [err, setErr] = useState('');

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ['reports', 'sales', range],
    queryFn: () => api<Row[]>(range ? `/reports/sales?${new URLSearchParams(range)}` : '/reports/sales', { auth: true }),
  });

  const run = (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!from || !to) return setErr('Pick both a start and an end date.');
    if (from > to) return setErr('The start date must be on or before the end date.');
    setRange({ from, to });
  };
  const reset = () => {
    setErr('');
    setFrom('');
    setTo('');
    setRange(null);
  };

  const copies = data?.reduce((s, r) => s + r.copiesSold, 0) ?? 0;
  const revenue = data?.reduce((s, r) => s + r.revenueInPaise, 0) ?? 0;
  const label = range ? `${fmt(range.from)} – ${fmt(range.to)}` : 'the last 14 days';

  return (
    <div className="pt-4">
      <p className="eyebrow">How the shelves are moving</p>
      <h1 className="page-title">Sales</h1>
      <p className="lede">Copies sold and revenue per title.</p>

      <form onSubmit={run} className="card mt-8 flex flex-wrap items-end gap-4 p-4">
        <div>
          <label htmlFor="from" className="label">From</label>
          <input id="from" type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} aria-invalid={!!err} aria-describedby={err ? 'range-err' : undefined} />
        </div>
        <div>
          <label htmlFor="to" className="label">To</label>
          <input id="to" type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} aria-invalid={!!err} aria-describedby={err ? 'range-err' : undefined} />
        </div>
        <button type="submit" className="btn-primary">Show range</button>
        {range && <button type="button" onClick={reset} className="btn-soft">Last 14 days</button>}
      </form>
      {err && <p id="range-err" className="notice-err mt-3" role="alert">{err}</p>}

      <h2 className="mt-8 text-2xl font-semibold" aria-live="polite">
        Sales for {label}{isFetching && <span className="ml-2 text-base font-normal text-ink-muted">updating…</span>}
      </h2>
      {isError && <p className="notice-err mt-3" role="alert">{errorText(error)}</p>}

      {data && (
        <div className="table-wrap mt-3">
          <table className="w-full min-w-[520px] text-[15px]">
            <caption className="sr-only">Copies sold and revenue per title for {label}</caption>
            <thead className="border-b border-cream-300 bg-cream-200/50">
              <tr>
                <th scope="col" className="th">Title</th>
                <th scope="col" className="th text-right">Copies sold</th>
                <th scope="col" className="th text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {data.length === 0 && (
                <tr><td colSpan={3} className="td py-10 text-center text-ink-muted">No sales in this period.</td></tr>
              )}
              {data.map((r) => (
                <tr key={r.isbn}>
                  <td className="td font-bold">{r.title}</td>
                  <td className="td text-right">{r.copiesSold}</td>
                  <td className="td text-right font-bold">{rupees(r.revenueInPaise)}</td>
                </tr>
              ))}
            </tbody>
            {data.length > 0 && (
              <tfoot className="border-t-2 border-ink/20">
                <tr>
                  <th scope="row" className="td text-left font-display text-lg font-semibold">Total</th>
                  <td className="td text-right font-extrabold">{copies}</td>
                  <td className="td text-right text-lg font-extrabold">{rupees(revenue)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
