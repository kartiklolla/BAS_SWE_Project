import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getRole, clearAuth, type Role } from '../api/client';
import { ErrorBoundary } from './ErrorBoundary';
import { Sparkle } from './Status';

const STAFF_LINKS: { to: string; label: string; roles: Role[] }[] = [
  { to: '/pos', label: 'Point of sale', roles: ['CLERK'] },
  { to: '/inventory', label: 'Inventory', roles: ['EMPLOYEE', 'OWNER'] },
  { to: '/reports/demand', label: 'Demand', roles: ['OWNER'] },
  { to: '/reports/sales', label: 'Sales', roles: ['OWNER'] },
  { to: '/reports/reorder', label: 'Reorder', roles: ['OWNER'] },
];

function Tab({ to, children }: { to: string; children: React.ReactNode }) {
  // NavLink sets aria-current="page" on the active link for screen readers.
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `rounded-full px-3.5 py-2 text-[15px] font-bold transition ${
          isActive
            ? 'bg-cream-200 text-ink underline decoration-mustard-400 decoration-[3px] underline-offset-[6px]'
            : 'text-ink-soft hover:bg-cream-200 hover:text-ink'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export function LogoMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-9 w-9" aria-hidden="true">
      <rect x="4" y="20" width="24" height="7" rx="2" fill="#EF6F6C" />
      <rect x="6" y="13" width="21" height="7" rx="2" fill="#1F9E89" />
      <rect x="5" y="6" width="19" height="7" rx="2" fill="#2E86A8" />
      <rect x="18" y="7.5" width="5" height="4" rx="1" fill="#FFFBF0" />
      <rect x="20" y="14.5" width="6" height="4" rx="1" fill="#FFFBF0" />
      <rect x="21" y="21.5" width="6" height="4" rx="1" fill="#FFFBF0" />
    </svg>
  );
}

export function Layout() {
  const role = getRole();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const signOut = () => {
    clearAuth();
    nav('/login');
  };

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-ink px-4 py-2 font-bold text-cream-50 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <header className="no-print">
        <nav aria-label="Main" className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-5 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 rounded-xl" aria-label="BAS Books, home">
            <LogoMark />
            <span className="font-display text-2xl font-semibold tracking-tight" style={{ fontVariationSettings: "'SOFT' 100" }}>
              BAS <span className="font-hand text-[28px] font-bold text-fern-800">books</span>
            </span>
          </Link>

          <ul className="order-3 flex w-full flex-wrap items-center gap-1 md:order-none md:mx-auto md:w-auto">
            <li><Tab to="/">Home</Tab></li>
            <li><Tab to="/request">Request a book</Tab></li>
            {role &&
              STAFF_LINKS.filter((l) => l.roles.includes(role)).map((l) => (
                <li key={l.to}><Tab to={l.to}>{l.label}</Tab></li>
              ))}
          </ul>

          <div className="ml-auto flex items-center gap-3">
            {role ? (
              <>
                <span className="hidden rounded-full bg-cream-200 px-3 py-1 text-xs font-extrabold capitalize text-ink-soft sm:inline">
                  {role.toLowerCase()}
                </span>
                <button type="button" onClick={signOut} className="btn-outline btn-sm">Sign out</button>
              </>
            ) : (
              <Link to="/login" className="btn-primary btn-sm">Staff sign in</Link>
            )}
          </div>
        </nav>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-4 outline-none sm:px-6">
        <ErrorBoundary resetKey={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      <footer className="no-print border-t border-cream-300/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-ink-muted sm:px-6">
          <span>BAS · Book-shop Automation Software</span>
          <span className="flex items-center gap-1.5 font-hand text-xl font-bold text-fern-800">
            <Sparkle className="h-3.5 w-3.5 text-lagoon-400" /> happy reading
          </span>
        </div>
      </footer>
    </div>
  );
}
