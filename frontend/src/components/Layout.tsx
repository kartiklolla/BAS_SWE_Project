import { Link, Outlet, useNavigate } from 'react-router-dom';
import { getRole, clearAuth } from '../api/client';

export function Layout() {
  const role = getRole();
  const nav = useNavigate();
  const logout = () => {
    clearAuth();
    nav('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="no-print bg-white border-b">
        <nav className="max-w-5xl mx-auto flex flex-wrap items-center gap-4 px-4 py-3 text-sm">
          <Link to="/" className="font-bold text-lg">BAS</Link>
          <Link to="/" className="hover:underline">Search</Link>
          {role === 'CLERK' && <Link to="/pos" className="hover:underline">POS</Link>}
          {(role === 'EMPLOYEE' || role === 'OWNER') && <Link to="/inventory" className="hover:underline">Inventory</Link>}
          {role === 'OWNER' && (
            <>
              <Link to="/reports/demand" className="hover:underline">Demand</Link>
              <Link to="/reports/sales" className="hover:underline">Sales Stats</Link>
              <Link to="/reports/reorder" className="hover:underline">Reorder</Link>
            </>
          )}
          <span className="ml-auto flex items-center gap-3">
            {role ? (
              <>
                <span className="text-gray-500">{role.toLowerCase()}</span>
                <button onClick={logout} className="text-blue-600 hover:underline">Logout</button>
              </>
            ) : (
              <Link to="/login" className="text-blue-600 hover:underline">Staff login</Link>
            )}
          </span>
        </nav>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
