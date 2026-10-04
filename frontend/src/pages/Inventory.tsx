import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorText, ISBN_RE, rupees, type Book } from '../api/client';
import { Cover } from '../components/Cover';
import { Status } from '../components/Status';

type Filter = 'all' | 'attention' | 'requested' | 'out' | 'in';
const FILTERS: Record<Filter, [string, (b: Book) => boolean]> = {
  all: ['Everything', () => true],
  attention: ['Needs attention', (b) => b.stock === 0 || b.requestCount > 0],
  requested: ['Requested titles', (b) => !b.stocked],
  out: ['Out of stock', (b) => b.stocked && b.stock === 0],
  in: ['On the shelf', (b) => b.stock > 0],
};

export default function Inventory() {
  const [params, setParams] = useSearchParams();
  const open = params.get('isbn');
  const [text, setText] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  // A row is keyed by ISBN, so giving a stub its real ISBN remounts it; carry the confirmation across.
  const [renamed, setRenamed] = useState<string | null>(null);

  // Plain browse (no search term) so loading the stock list never counts as customer demand.
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: ['books', 'all'], queryFn: () => api<Book[]>('/books') });

  const rows = useMemo(() => {
    const t = text.trim().toLowerCase();
    return (data ?? []).filter(
      (b) => FILTERS[filter][1](b) && (!t || b.title.toLowerCase().includes(t) || b.author.toLowerCase().includes(t) || b.isbn.includes(t)),
    );
  }, [data, text, filter]);

  // Deep link from Demand / Reorder (?isbn=): once the list loads, bring that row into view.
  const [deepLink] = useState(open);
  const hasData = !!data;
  useEffect(() => {
    if (deepLink && hasData) {
      setTimeout(() => document.getElementById(`row-${deepLink}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    }
  }, [deepLink, hasData]);

  const toggle = (isbn: string) => setParams(open === isbn ? {} : { isbn }, { replace: true });

  return (
    <div className="pt-4">
      <p className="eyebrow">The stockroom</p>
      <h1 className="page-title">Inventory</h1>
      <p className="lede">Receive deliveries, keep prices, racks and lead times up to date, and bring requested titles onto the shelves.</p>

      <div className="card mt-8 flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="inv-search" className="label">Find a book</label>
          <input id="inv-search" type="search" className="input" placeholder="Title, author or ISBN" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div>
          <label htmlFor="inv-filter" className="label">Show</label>
          <select id="inv-filter" className="input sm:w-56" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
            {Object.entries(FILTERS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </div>
      </div>

      <p className="mt-4 text-sm font-bold text-ink-muted" role="status">
        {data && `${rows.length} of ${data.length} titles`}
      </p>

      {isPending && <p className="py-10 text-center text-ink-muted">Loading the catalogue…</p>}
      {isError && (
        <p className="notice-err mt-4 flex items-center justify-between gap-3" role="alert">
          {errorText(error)} <button type="button" className="btn-outline btn-sm" onClick={() => refetch()}>Try again</button>
        </p>
      )}

      {data && (
        <div className="table-wrap mt-3">
          <table className="w-full min-w-[760px] text-[15px]">
            <caption className="sr-only">Catalogue with stock levels</caption>
            <thead className="border-b border-cream-300 bg-cream-200/50">
              <tr>
                <th scope="col" className="th">Book</th>
                <th scope="col" className="th">Status</th>
                <th scope="col" className="th text-right">Price</th>
                <th scope="col" className="th text-right">Rack</th>
                <th scope="col" className="th text-right">Lead time</th>
                <th scope="col" className="th text-right">Requests</th>
                <th scope="col" className="th"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={7} className="td py-10 text-center text-ink-muted">No titles match.</td></tr>
              )}
              {rows.map((b) => (
                <BookRow
                  key={b.isbn}
                  book={b}
                  open={open === b.isbn}
                  onToggle={() => toggle(b.isbn)}
                  initialNote={renamed === b.isbn ? SAVED : null}
                  onIsbnChange={(isbn) => {
                    setRenamed(isbn);
                    setParams({ isbn }, { replace: true });
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BookRow({ book: b, open, onToggle, onIsbnChange, initialNote }: { book: Book; open: boolean; onToggle: () => void; onIsbnChange: (isbn: string) => void; initialNote: Note }) {
  const panelId = `manage-${b.isbn}`;
  return (
    <>
      <tr id={`row-${b.isbn}`} className={`border-b border-cream-300 ${open ? 'bg-mustard-100/50' : 'hover:bg-cream-200/40'}`}>
        <td className="td">
          <div className="flex items-center gap-3">
            <Cover book={b} size="xs" />
            <div className="min-w-0">
              <p className="font-bold leading-snug">{b.title}</p>
              <p className="text-sm text-ink-muted">{b.author} · <span className="font-mono text-xs">{b.isbn}</span></p>
            </div>
          </div>
        </td>
        <td className="td"><Status book={b} /></td>
        <td className="td text-right font-bold">{b.priceInPaise > 0 ? rupees(b.priceInPaise) : <span className="text-coral-800">Not set</span>}</td>
        <td className="td text-right">{b.rackNo ?? '—'}</td>
        <td className="td text-right">{b.leadTimeDays} d</td>
        <td className="td text-right font-bold">{b.requestCount || '—'}</td>
        <td className="td text-right">
          <button type="button" className={open ? 'btn-primary btn-sm' : 'btn-outline btn-sm'} aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
            {open ? 'Close' : 'Manage'}<span className="sr-only"> {b.title}</span>
          </button>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-cream-300 bg-mustard-100/30">
          <td colSpan={7} className="p-4 sm:p-6" id={panelId}>
            <ManagePanel book={b} onIsbnChange={onIsbnChange} initialNote={initialNote} />
          </td>
        </tr>
      )}
    </>
  );
}

type Note = { kind: 'ok' | 'err'; text: string } | null;
const SAVED: Note = { kind: 'ok', text: 'Details saved. Price changes apply to future sales only.' };

function ManagePanel({ book: b, onIsbnChange, initialNote }: { book: Book; onIsbnChange: (isbn: string) => void; initialNote: Note }) {
  const qc = useQueryClient();
  const isStub = !b.stocked;
  const [qty, setQty] = useState('');
  const [d, setD] = useState({
    price: b.priceInPaise > 0 ? String(b.priceInPaise / 100) : '',
    rack: b.rackNo != null ? String(b.rackNo) : '',
    lead: String(b.leadTimeDays),
    isbn: b.isbn,
    address: b.publisher?.address ?? '',
  });
  const [note, setNote] = useState<Note>(initialNote);
  const [busy, setBusy] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ['books'] });

  const saveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = Math.round(Number(d.price) * 100);
    const lead = Number(d.lead);
    const rack = d.rack.trim() === '' ? null : Number(d.rack);
    const isbn = d.isbn.trim().toUpperCase();
    if (!Number.isFinite(price) || price <= 0) return setNote({ kind: 'err', text: 'Price must be more than ₹0.' });
    if (!Number.isInteger(lead) || lead < 0 || lead > 365) return setNote({ kind: 'err', text: 'Lead time is a whole number of days (0–365).' });
    if (rack !== null && (!Number.isInteger(rack) || rack < 0)) return setNote({ kind: 'err', text: 'Rack is a whole number, or leave it empty.' });
    if (isStub && !ISBN_RE.test(isbn)) return setNote({ kind: 'err', text: 'ISBN must be 10 or 13 digits.' });

    const body: Record<string, unknown> = { priceInPaise: price, leadTimeDays: lead, rackNo: rack };
    if (isStub) {
      body.isbn = isbn;
      if (d.address.trim()) body.publisherAddress = d.address.trim();
    }
    setBusy(true);
    try {
      const updated = await api<Book>(`/books/${b.isbn}`, { method: 'PATCH', auth: true, body: JSON.stringify(body) });
      setNote(SAVED);
      await refresh();
      if (updated.isbn !== b.isbn) onIsbnChange(updated.isbn);
    } catch (err) {
      setNote({ kind: 'err', text: errorText(err) });
    } finally {
      setBusy(false);
    }
  };

  const receive = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(qty);
    if (!Number.isInteger(n) || n <= 0) return setNote({ kind: 'err', text: 'Quantity must be a whole number above zero.' });
    setBusy(true);
    try {
      const updated = await api<Book>(`/books/${b.isbn}/receive`, { method: 'POST', auth: true, body: JSON.stringify({ qty: n }) });
      setQty('');
      setNote({ kind: 'ok', text: `Received ${n}. ${updated.stock} on the shelf now; request count cleared.` });
      await refresh();
    } catch (err) {
      setNote({ kind: 'err', text: errorText(err) });
    } finally {
      setBusy(false);
    }
  };

  const id = (k: string) => `${b.isbn}-${k}`;
  return (
    <div className="space-y-4">
      {isStub && (
        <p className="notice-warn">
          A customer requested this title. To stock it: enter the ISBN from the delivered copy, set a price, save, then receive the copies.
        </p>
      )}
      <div aria-live="polite">{note && <p className={note.kind === 'ok' ? 'notice-ok' : 'notice-err'}>{note.text}</p>}</div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <form onSubmit={saveDetails} className="card space-y-4 p-5">
          <h2 className="text-xl font-semibold">Book details</h2>
          {isStub && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={id('isbn')} className="label">ISBN</label>
                <input id={id('isbn')} className="input font-mono" inputMode="numeric" value={d.isbn} onChange={(e) => setD({ ...d, isbn: e.target.value })} aria-describedby={id('isbn-hint')} />
                <p id={id('isbn-hint')} className="hint">Replace the placeholder with the real one.</p>
              </div>
              <div>
                <label htmlFor={id('addr')} className="label">{b.publisher?.name ?? 'Publisher'} address</label>
                <input id={id('addr')} className="input" value={d.address} onChange={(e) => setD({ ...d, address: e.target.value })} aria-describedby={id('addr-hint')} />
                <p id={id('addr-hint')} className="hint">Printed on the reorder list.</p>
              </div>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor={id('price')} className="label">Price (₹)</label>
              <input id={id('price')} type="number" min="0.01" step="0.01" className="input" value={d.price} onChange={(e) => setD({ ...d, price: e.target.value })} />
            </div>
            <div>
              <label htmlFor={id('rack')} className="label">Rack</label>
              <input id={id('rack')} type="number" min="0" step="1" className="input" value={d.rack} onChange={(e) => setD({ ...d, rack: e.target.value })} />
            </div>
            <div>
              <label htmlFor={id('lead')} className="label">Lead time (days)</label>
              <input id={id('lead')} type="number" min="0" max="365" step="1" className="input" value={d.lead} onChange={(e) => setD({ ...d, lead: e.target.value })} aria-describedby={id('lead-hint')} />
            </div>
          </div>
          <p id={id('lead-hint')} className="hint">Lead time sets the reorder level: copies sold in 14 days × lead time.</p>
          <button type="submit" disabled={busy} className="btn-primary">Save details</button>
        </form>

        <form onSubmit={receive} className="card space-y-4 p-5">
          <h2 className="text-xl font-semibold">Receive a delivery</h2>
          <p className="text-ink-muted">
            {b.stock} on the shelf{b.requestCount > 0 && `, ${b.requestCount} waiting`}.
          </p>
          <div>
            <label htmlFor={id('qty')} className="label">Copies received</label>
            <input id={id('qty')} type="number" min="1" step="1" className="input" value={qty} onChange={(e) => setQty(e.target.value)} disabled={b.priceInPaise <= 0} aria-describedby={b.priceInPaise <= 0 ? id('qty-hint') : undefined} />
            {b.priceInPaise <= 0 && <p id={id('qty-hint')} className="hint">Save a price first.</p>}
          </div>
          <button type="submit" disabled={busy || b.priceInPaise <= 0} className="btn-fern w-full">Add to stock</button>
        </form>
      </div>
    </div>
  );
}
