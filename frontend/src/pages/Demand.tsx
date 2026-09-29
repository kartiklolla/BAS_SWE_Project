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
      <h1 className="text-2xl font-bold mb-4">Demand report</h1>
      <table className="w-full bg-white rounded border text-sm">
        <thead className="text-left border-b">
          <tr><th className="p-2">Title</th><th className="p-2">Author</th><th className="p-2 text-right">Requests</th></tr>
        </thead>
        <tbody>
          {data?.length === 0 && <tr><td colSpan={3} className="p-3 text-gray-400">No requests recorded.</td></tr>}
          {data?.map((b) => (
            <tr key={b.isbn} className="border-b">
              <td className="p-2">{b.title}</td><td className="p-2 text-gray-500">{b.author}</td>
              <td className="p-2 text-right font-medium">{b.requestCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
