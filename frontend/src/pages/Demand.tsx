import { useQuery } from '@tanstack/react-query';
import { api, type Book } from '../api/client';

export default function Demand() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['demand'],
    queryFn: () => api<Book[]>('/reports/demand', { auth: true }),
  });

  if (isLoading) return <p>Loading…</p>;
  if (isError) return <p className="text-red-600">Could not load report.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Demand report</h1>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr><th className="th">Title</th><th className="th">Author</th><th className="th text-right">Requests</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.length === 0 && <tr><td colSpan={3} className="td text-slate-400">No requests recorded.</td></tr>}
            {data?.map((b) => (
              <tr key={b.isbn} className="hover:bg-slate-50">
                <td className="td font-medium text-slate-800">{b.title}</td><td className="td text-slate-500">{b.author}</td>
                <td className="td text-right font-semibold">{b.requestCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
