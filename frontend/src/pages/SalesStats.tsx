import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, rupees } from '../api/client';

interface Row { isbn: string; title: string; copiesSold: number; revenueInPaise: number }

export default function SalesStats() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [err, setErr] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['sales', range],
    enabled: !!range,
    queryFn: () => api<Row[]>(`/reports/sales?from=${range!.from}&to=${range!.to}`, { auth: true }),
  });

  const run = (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!from || !to) return setErr('Pick both dates.');
    if (from > to) return setErr('"From" date must not be after "To" date.');
    setRange({ from, to });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Sales statistics</h1>
      <form onSubmit={run} className="card p-3 flex flex-wrap gap-3 items-end mb-4">
        <label className="label">From<input type="date" className="input block mt-1" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="label">To<input type="date" className="input block mt-1" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button className="btn-primary">Run</button>
      </form>
      {err && <p className="text-red-600 text-sm mb-2">{err}</p>}
      {isFetching && <p className="text-slate-500">Loading…</p>}

      {data && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr><th className="th">Title</th><th className="th text-right">Copies sold</th><th className="th text-right">Revenue</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.length === 0 && <tr><td colSpan={3} className="td text-slate-400">No sales in this period.</td></tr>}
              {data.map((r) => (
                <tr key={r.isbn} className="hover:bg-slate-50">
                  <td className="td font-medium text-slate-800">{r.title}</td>
                  <td className="td text-right">{r.copiesSold}</td>
                  <td className="td text-right font-semibold">{rupees(r.revenueInPaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
