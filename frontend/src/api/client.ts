// Thin fetch wrapper. Attaches the staff JWT from localStorage; throws ApiError on failure.
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
  constructor(
    public status: number,
    message: string,
    public body: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export async function api<T>(path: string, opts: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json', ...(opts.headers as Record<string, string>) };
  if (opts.auth) {
    const token = getToken();
    if (token) headers.authorization = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...opts, headers });
  } catch {
    // status 0 = never reached the server (offline, DNS, dropped connection).
    throw new ApiError(0, 'Could not reach the shop. Check your connection and try again.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && opts.auth) clearAuth(); // expired/invalid token -> sign in again
    throw new ApiError(res.status, body.error ?? res.statusText, body);
  }
  return body as T;
}

export const errorText = (e: unknown, fallback = 'Something went wrong. Please try again.') =>
  e instanceof ApiError && e.message ? e.message : fallback;

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
  publisher?: { name: string; address: string };
}

export interface Receipt {
  receiptNo: number;
  issuedOn: string;
  lines: { isbn: string; title: string; unitPriceInPaise: number }[];
  rejected: { isbn: string; reason: string }[];
  totalInPaise: number;
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
export const rupees = (paise: number) => inr.format(paise / 100);

export const ISBN_RE = /^(\d{13}|\d{9}[\dX])$/;
