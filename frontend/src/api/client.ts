// Thin fetch wrapper. Attaches JWT from localStorage; throws on non-2xx.
export type Role = 'CLERK' | 'EMPLOYEE' | 'OWNER';

export function getToken(): string | null {
  return localStorage.getItem('bas_token');
}
export function getRole(): Role | null {
  return localStorage.getItem('bas_role') as Role | null;
}
export function setAuth(token: string, role: Role) {
  localStorage.setItem('bas_token', token);
  localStorage.setItem('bas_role', role);
}
export function clearAuth() {
  localStorage.removeItem('bas_token');
  localStorage.removeItem('bas_role');
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, opts: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json', ...(opts.headers as any) };
  if (opts.auth) {
    const token = getToken();
    if (token) headers.authorization = `Bearer ${token}`;
  }
  const res = await fetch(`/api${path}`, { ...opts, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) clearAuth(); // token gone/expired -> force re-login
    throw new ApiError(res.status, body.error ?? res.statusText);
  }
  return body as T;
}

export interface Book {
  isbn: string;
  title: string;
  author: string;
  priceInPaise: number;
  rackNo: number | null;
  leadTimeDays: number;
  stock: number;
  requestCount: number;
  stocked: boolean;
}

export const rupees = (paise: number) => `₹${(paise / 100).toFixed(2)}`;
