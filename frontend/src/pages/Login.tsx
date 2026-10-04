import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, errorText, setAuth, type Role } from '../api/client';
import { LogoMark } from '../components/Layout';

const HOME: Record<Role, string> = { CLERK: '/pos', EMPLOYEE: '/inventory', OWNER: '/reports/demand' };

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
      nav(HOME[role]);
    } catch (e) {
      setErr(e instanceof ApiError && e.status === 401 ? 'That username and password don’t match.' : errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card mx-auto mt-8 max-w-md space-y-5 p-8">
      <div className="text-center">
        <div className="mx-auto w-fit"><LogoMark /></div>
        <h1 className="mt-3 text-3xl font-semibold">Staff sign in</h1>
        <p className="mt-1 text-ink-muted">For the counter, the stockroom and the owner's desk.</p>
      </div>
      <div>
        <label htmlFor="username" className="label">Username</label>
        <input id="username" className="input" autoComplete="username" required value={username} onChange={(e) => setU(e.target.value)} />
      </div>
      <div>
        <label htmlFor="password" className="label">Password</label>
        <input id="password" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setP(e.target.value)} />
      </div>
      {err && <p className="notice-err" role="alert">{err}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      {/* Demo accounts only exist with these passwords in local development. */}
      {import.meta.env.DEV && (
        <p className="text-center text-sm text-ink-muted">
          Dev accounts: <b>clerk</b> · <b>employee</b> · <b>owner</b>, password <code>&lt;name&gt;123</code>
        </p>
      )}
    </form>
  );
}
