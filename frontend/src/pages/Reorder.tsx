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
        <h1 className="text-2xl font-bold">Daily reorder list</h1>
        <button onClick={() => window.print()} className="bg-gray-800 text-white rounded px-4 py-2">Print</button>
      </div>
      <table className="w-full bg-white rounded border text-sm">
        <thead className="text-left border-b">
          <tr>
            <th className="p-2">Title</th><th className="p-2 text-right">Stock</th>
            <th className="p-2 text-right">Sold (14d)</th><th className="p-2 text-right">Level</th>
            <th className="p-2 text-right">To procure</th><th className="p-2">Publisher</th>
          </tr>
        </thead>
        <tbody>
          {data?.length === 0 && <tr><td colSpan={6} className="p-3 text-gray-400">Nothing below threshold today.</td></tr>}
          {data?.map((r) => (
            <tr key={r.isbn} className="border-b align-top">
              <td className="p-2">{r.title}</td>
              <td className="p-2 text-right">{r.stock}</td>
              <td className="p-2 text-right">{r.copiesSoldLast14}</td>
              <td className="p-2 text-right">{r.inventoryLevel}</td>
              <td className="p-2 text-right font-medium">{r.toProcure}</td>
              <td className="p-2">{r.publisher}<br /><span className="text-gray-500 text-xs">{r.publisherAddress}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
