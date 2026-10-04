import { Link } from 'react-router-dom';
import { rupees, type Book } from '../api/client';
import { Cover } from './Cover';
import { Status } from './Status';

export function BookCard({ book }: { book: Book }) {
  return (
    <li>
      <Link
        to={`/books/${book.isbn}`}
        className="group card flex h-full flex-col gap-3 p-3 transition hover:-translate-y-1 hover:shadow-lift"
      >
        <Cover book={book} />
        <div className="px-1">
          <h3 className="line-clamp-2 text-lg font-semibold leading-snug group-hover:underline group-hover:decoration-mustard-400 group-hover:decoration-2 group-hover:underline-offset-4">
            {book.title}
          </h3>
          <p className="line-clamp-1 text-sm text-ink-muted">{book.author}</p>
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 px-1 pb-1">
          <Status book={book} />
          {book.stocked && <span className="font-extrabold">{rupees(book.priceInPaise)}</span>}
        </div>
      </Link>
    </li>
  );
}
