import { CONTACT_EMAIL } from './brand';

// A plain text of the page (an answer of the FAQ, which the page's FAQPage data reads too), cut into what the HTML
// shows differently: a class, « 6ᵉ », as its number and a raised e (the site's fonts have no ᵉ), and our address,
// which becomes a link.
export interface Part {
  kind: 'text' | 'ordinal' | 'email';
  value: string;
}

const PARTS = new RegExp(`(\\d+)ᵉ|(${CONTACT_EMAIL.replaceAll('.', '\\.')})`, 'gu');

export function inline(text: string): Part[] {
  const parts: Part[] = [];
  let last = 0;
  for (const match of text.matchAll(PARTS)) {
    if (match.index > last) parts.push({ kind: 'text', value: text.slice(last, match.index) });
    const [whole, number, email] = match;
    if (number) parts.push({ kind: 'ordinal', value: number });
    else if (email) parts.push({ kind: 'email', value: email });
    last = match.index + whole.length;
  }
  if (last < text.length) parts.push({ kind: 'text', value: text.slice(last) });
  return parts;
}
