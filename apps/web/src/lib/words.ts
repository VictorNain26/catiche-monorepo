/** Words put into a French sentence. */

/** « lundi, mardi et jeudi », « Nadia ou à Karim »: words in a sentence, `last` before the last one. */
export const listWords = (words: readonly string[], last = ' et ') =>
  words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')}${last}${words.at(-1) ?? ''}`;

/** « la tablette » at the head of a sentence: « La tablette ». */
export const capitalised = (words: string) => `${words.charAt(0).toUpperCase()}${words.slice(1)}`;

/**
 * The student's parents as a sentence names them (`app-cible.md` § 5, « Les voix »): « Nadia et
 * Karim », « Nadia ou Karim », « à Nadia ou à Karim »; « tes parents » when the server gives no
 * first name. Each subject also at the head of a sentence (`Both`, `Either`, `They`), and its verb
 * agreed: `agree('voit', 'voient')`. A single parent's gender is unknown: « ils » stands for several,
 * a single one is named again.
 */
export function parentWords(parents: readonly string[]) {
  const named = parents.length > 0;
  const many = parents.length !== 1;
  const both = named ? listWords(parents) : 'tes parents';
  const either = named ? listWords(parents, ' ou ') : 'tes parents';
  const toEither = named
    ? listWords(
        parents.map((name) => `à ${name}`),
        ' ou ',
      )
    : 'à tes parents';
  const they = many ? 'ils' : both;
  return {
    both,
    either,
    toEither,
    they,
    Both: capitalised(both),
    Either: capitalised(either),
    They: capitalised(they),
    agree: (singular: string, plural: string) => (many ? plural : singular),
  };
}
