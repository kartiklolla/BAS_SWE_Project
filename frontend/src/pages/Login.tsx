import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setAuth, type Role } from '../api/client';

export default function Login() {
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const { token, role } = await api<{ token: string; role: Role }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setAuth(token, role);
      nav(role === 'CLERK' ? '/pos' : role === 'OWNER' ? '/reports/reorder' : '/inventory');
    } catch {
      setErr('Invalid username or password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded border p-6 max-w-sm mx-auto space-y-3">
      <h1 className="text-xl font-bold">Staff sign-in</h1>
      <input className="border rounded px-3 py-2 w-full" placeholder="Username" value={username} onChange={(e) => setU(e.target.value)} />
      <input className="border rounded px-3 py-2 w-full" type="password" placeholder="Password" value={password} onChange={(e) => setP(e.target.value)} />
      {err && <p className="text-red-600 text-sm">{err}</p>}
      <button disabled={busy} className="bg-blue-600 text-white rounded px-4 py-2 w-full disabled:opacity-50">
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      <p className="text-xs text-gray-400">Seeded: clerk / employee / owner — password &lt;name&gt;123</p>
    </form>
  );
}
