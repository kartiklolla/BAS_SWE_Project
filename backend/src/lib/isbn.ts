import { createHash } from 'node:crypto';

// ISBN-13, or ISBN-10 (whose check digit may be X).
export const ISBN_RE = /^(\d{13}|\d{9}[\dX])$/;

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

// R.2: a requested title has no ISBN yet, so derive a deterministic 13-digit key from its
// details. Same details -> same key -> a duplicate request hits the primary key (409, not a
// second stub). Employees replace it with the real ISBN when the first copies arrive.
export function isbnFromDetails(title: string, author: string, edition?: string): string {
  const h = createHash('sha1').update(`${norm(title)}|${norm(author)}|${norm(edition ?? '')}`).digest();
  let digits = '';
  for (const b of h) digits += (b % 10).toString();
  return digits.slice(0, 13);
}
