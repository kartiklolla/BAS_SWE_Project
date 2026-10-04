import { useState } from 'react';
import type { Book } from '../api/client';
import { Sparkle } from './Status';

// [background, text] pairs from the storybook palette, each >= 5:1 contrast (WCAG AA).
const PALETTE: [string, string][] = [
  ['#EF6F6C', '#211D17'], // 5.7:1
  ['#F4B740', '#211D17'], // 9.3:1
  ['#1F9E89', '#211D17'], // 5.0:1
  ['#26324D', '#F4B740'], // 7.1:1
  ['#1F6A87', '#FFFDF6'], // 6.0:1
  ['#F39243', '#211D17'], // 7.2:1
];

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const SIZES = {
  xs: { box: 'w-10', title: 'text-[5px]', author: 'hidden' },
  sm: { box: 'w-14', title: 'text-[7px]', author: 'hidden' },
  md: { box: 'w-full', title: 'text-base sm:text-lg', author: 'text-xs' },
  lg: { box: 'w-full', title: 'text-2xl sm:text-3xl', author: 'text-sm' },
};

// Real cover art from Open Library when it exists; otherwise (or while it loads, or if the
// shared rate limit is hit) an illustrated cover drawn underneath. Decorative: the title is
// always rendered as text next to it, so alt is empty.
export function Cover({ book, size = 'md' }: { book: Pick<Book, 'isbn' | 'title' | 'author'>; size?: keyof typeof SIZES }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [bg, fg] = PALETTE[hash(book.isbn) % PALETTE.length];
  const s = SIZES[size];

  return (
    <div
      className={`relative aspect-[2/3] shrink-0 overflow-hidden rounded-l-md rounded-r-xl shadow-soft ${s.box}`}
      style={{ background: bg, color: fg }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 flex flex-col justify-between py-[12%] pl-[16%] pr-[9%]">
        <Sparkle className="w-[18%] opacity-80" />
        <p className={`font-display font-semibold leading-[1.1] ${s.title}`}>{book.title}</p>
        <p className={`font-bold ${s.author}`}>{book.author}</p>
      </div>
      {/* spine shading + page edge */}
      <span className="absolute inset-y-0 left-0 w-[8%] bg-black/15" />
      <span className="absolute inset-y-0 left-[8%] w-px bg-white/30" />
      {!failed && (
        <img
          src={`https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg?default=false`}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          // Invisible until decoded: no broken-image glyph while a slow 404 is pending.
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
}
