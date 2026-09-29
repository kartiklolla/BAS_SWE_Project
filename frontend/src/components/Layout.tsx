import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { getRole, clearAuth } from '../api/client';

function Tab({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-lg text-sm font-medium transition ${
          isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export function Layout() {
  const role = getRole();
  const nav = useNavigate();
  const logout = () => {
    clearAuth();
    nav('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="no-print sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
        <nav className="max-w-5xl mx-auto flex flex-wrap items-center gap-1 px-4 py-2.5">
          <Link to="/" className="flex items-center gap-2 mr-2">
            <span className="grid place-items-center h-8 w-8 rounded-lg bg-indigo-600 text-white font-bold">B</span>
            <span className="font-extrabold text-lg tracking-tight text-slate-900">BAS</span>
          </Link>
          <Tab to="/">Search</Tab>
          {role === 'CLERK' && <Tab to="/pos">POS</Tab>}
          {(role === 'EMPLOYEE' || role === 'OWNER') && <Tab to="/inventory">Inventory</Tab>}
          {role === 'OWNER' && (
            <>
              <Tab to="/reports/demand">Demand</Tab>
              <Tab to="/reports/sales">Sales</Tab>
              <Tab to="/reports/reorder">Reorder</Tab>
            </>
          )}
          <span className="ml-auto flex items-center gap-3">
            {role ? (
              <>
                <span className="hidden sm:inline text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600 capitalize">
                  {role.toLowerCase()}
                </span>
                <button onClick={logout} className="text-sm font-medium text-slate-500 hover:text-slate-900">Logout</button>
              </>
            ) : (
              <Link to="/login" className="btn-primary">Staff login</Link>
            )}
          </span>
        </nav>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>
      <footer className="no-print text-center text-xs text-slate-400 py-6">
        Book-shop Automation Software
      </footer>
    </div>
  );
}
