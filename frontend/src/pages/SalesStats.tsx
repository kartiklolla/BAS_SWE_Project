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
      <h1 className="text-2xl font-bold mb-4">Sales statistics</h1>
      <form onSubmit={run} className="flex flex-wrap gap-2 items-end mb-4">
        <label className="text-sm">From<input type="date" className="border rounded px-3 py-2 block" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-sm">To<input type="date" className="border rounded px-3 py-2 block" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button className="bg-blue-600 text-white rounded px-4 py-2">Run</button>
      </form>
      {err && <p className="text-red-600 text-sm mb-2">{err}</p>}
      {isFetching && <p>Loading…</p>}

      {data && (
        <table className="w-full bg-white rounded border text-sm">
          <thead className="text-left border-b">
            <tr><th className="p-2">Title</th><th className="p-2 text-right">Copies sold</th><th className="p-2 text-right">Revenue</th></tr>
          </thead>
          <tbody>
            {data.length === 0 && <tr><td colSpan={3} className="p-3 text-gray-400">No sales in this period.</td></tr>}
            {data.map((r) => (
              <tr key={r.isbn} className="border-b">
                <td className="p-2">{r.title}</td>
                <td className="p-2 text-right">{r.copiesSold}</td>
                <td className="p-2 text-right">{rupees(r.revenueInPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
