import type { Book } from '../api/client';

// Where a title sits in its lifecycle (state diagram, CLAUDE.md section 8).
export function Status({ book }: { book: Pick<Book, 'stock' | 'stocked'> }) {
  if (!book.stocked) return <span className="badge-req">Requested</span>;
  if (book.stock > 0) return <span className="badge-in">{book.stock} on the shelf</span>;
  return <span className="badge-out">Out of stock</span>;
}

export function Sparkle({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="-20 -20 40 40" className={className} fill="currentColor" aria-hidden="true">
      <path d="M0-20C2.5-6 6-2.5 20 0 6 2.5 2.5 6 0 20-2.5 6-6 2.5-20 0-6-2.5-2.5-6 0-20Z" />
    </svg>
  );
}
