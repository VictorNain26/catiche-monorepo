/**
 * What Tom reads of the official programme, when he asks for it: the themes of the student's class,
 * then the entries of one theme, as the texts word them. No search over the texts: the referential
 * is short enough to list (`referential/`).
 */

import { LEVEL_SHORT_LABELS, type SchoolLevel } from '../../../domain/levels';
import type { Entry, NotionsFor } from '../../../referential';

export type { NotionsFor };

const themeOf = ({ domain, subtheme }: Entry) => (subtheme ? `${domain} › ${subtheme}` : domain);

interface Lookup {
  level: SchoolLevel;
  subject: 'mathematiques' | 'francais';
  schoolYear: number;
  /** A theme of the list, or a word of one; null for the list. */
  theme: string | null;
}

export function programmeText(notionsFor: NotionsFor, { level, subject, schoolYear, theme }: Lookup): string {
  const notions = notionsFor(level, subject, schoolYear);
  if (!notions) return 'Pas de programme pour cette matière.';
  const programme = `programme de ${LEVEL_SHORT_LABELS[level]} en ${subject}`;
  if (theme === null) return [`Thèmes du ${programme} :`, ...new Set(notions.entries.map((entry) => `- ${themeOf(entry)}`))].join('\n');

  const asked = theme.toLocaleLowerCase('fr');
  const inTheme = (entry: Entry) => themeOf(entry).toLocaleLowerCase('fr').includes(asked);
  const entries = notions.entries.filter(inTheme);
  if (entries.length === 0) return `Aucun thème « ${theme} » dans le ${programme}.`;
  // The later classes' texts cut their domains otherwise: their entries of the same domain.
  const domains = new Set(entries.map(({ domain }) => domain));
  const later = notions.later.filter(({ domain }) => domains.has(domain));
  return [
    `${theme}, ${programme} :`,
    ...entries.map((entry) => `- ${entry.text}`),
    ...(later.length > 0 ? ['Des classes suivantes, à ne pas utiliser :', ...later.map((entry) => `- ${entry.text}`)] : []),
  ].join('\n');
}
