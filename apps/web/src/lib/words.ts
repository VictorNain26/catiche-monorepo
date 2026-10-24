/** Words put into a French sentence. */

/** « lundi, mardi et jeudi », « Nadia ou à Karim »: words in a sentence, `last` before the last one. */
export const listWords = (words: readonly string[], last = ' et ') =>
  words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')}${last}${words.at(-1) ?? ''}`;

/** « la tablette » at the head of a sentence: « La tablette ». */
export const capitalised = (words: string) => `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
