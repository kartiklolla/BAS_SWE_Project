import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import { Layout } from './components/Layout';
import { getRole, type Role } from './api/client';
import Search from './pages/Search';
import BookDetail from './pages/BookDetail';
import Login from './pages/Login';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Demand from './pages/Demand';
import SalesStats from './pages/SalesStats';
import Reorder from './pages/Reorder';

const qc = new QueryClient();

function Guard({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const role = getRole();
  if (!role) return <Navigate to="/login" replace />;
  // Owner inherits Employee access (spec section 3).
  const ok = roles.includes(role) || (roles.includes('EMPLOYEE') && role === 'OWNER');
  if (!ok) return <Navigate to="/" replace />;
  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Search />} />
            <Route path="/books/:isbn" element={<BookDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/pos" element={<Guard roles={['CLERK']}><POS /></Guard>} />
            <Route path="/inventory" element={<Guard roles={['EMPLOYEE']}><Inventory /></Guard>} />
            <Route path="/reports/demand" element={<Guard roles={['OWNER']}><Demand /></Guard>} />
            <Route path="/reports/sales" element={<Guard roles={['OWNER']}><SalesStats /></Guard>} />
            <Route path="/reports/reorder" element={<Guard roles={['OWNER']}><Reorder /></Guard>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
