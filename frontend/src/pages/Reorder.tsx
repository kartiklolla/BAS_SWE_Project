import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

interface Item {
  isbn: string; title: string; stock: number; copiesSoldLast14: number;
  inventoryLevel: number; toProcure: number; publisher: string; publisherAddress: string;
}

export default function Reorder() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['reorder'],
    queryFn: () => api<Item[]>('/reports/reorder', { auth: true }),
  });

  if (isLoading) return <p>Loading…</p>;
  if (isError) return <p className="text-red-600">Could not load report.</p>;

  return (
    <div>
      <div className="no-print flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Daily reorder list</h1>
        <button onClick={() => window.print()} className="btn-dark">Print</button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="th">Title</th><th className="th text-right">Stock</th>
              <th className="th text-right">Sold (14d)</th><th className="th text-right">Level</th>
              <th className="th text-right">To procure</th><th className="th">Publisher</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.length === 0 && <tr><td colSpan={6} className="td text-slate-400">Nothing below threshold today.</td></tr>}
            {data?.map((r) => (
              <tr key={r.isbn} className="align-top hover:bg-slate-50">
                <td className="td font-medium text-slate-800">{r.title}</td>
                <td className="td text-right">{r.stock}</td>
                <td className="td text-right">{r.copiesSoldLast14}</td>
                <td className="td text-right">{r.inventoryLevel}</td>
                <td className="td text-right font-semibold text-indigo-700">{r.toProcure}</td>
                <td className="td">{r.publisher}<br /><span className="text-slate-500 text-xs">{r.publisherAddress}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
