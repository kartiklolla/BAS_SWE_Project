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
    <form onSubmit={submit} className="card p-6 max-w-sm mx-auto space-y-4 mt-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Staff sign-in</h1>
        <p className="text-sm text-slate-500">Access POS, inventory, and reports.</p>
      </div>
      <input className="input w-full" placeholder="Username" value={username} onChange={(e) => setU(e.target.value)} />
      <input className="input w-full" type="password" placeholder="Password" value={password} onChange={(e) => setP(e.target.value)} />
      {err && <p className="text-red-600 text-sm">{err}</p>}
      <button disabled={busy} className="btn-primary w-full">
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      <p className="text-xs text-slate-400">Seeded: clerk / employee / owner — password &lt;name&gt;123</p>
    </form>
  );
}
