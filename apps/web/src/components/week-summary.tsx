import { Banner, List, ListItem, Section, Skeleton } from '@repo/ui';
import { lastTime } from '../lib/memory';
import { STUDENT_FAILED } from '../lib/student';
import { minutesText, questionFor, sameSummary, subjectLabel, type WeekSummary as Week } from '../lib/summary';
import { MessageBanner } from './message-banner';

// The guardian's summary names no parent.
const NO_PARENTS: readonly string[] = [];

/**
 * The summary of the week (`docs/tuteur.md` § 8): the subjects and the time, what resists with the
 * help given, a question for the parent. The same content for the guardian and the student, said
 * to each; never a mark nor a rate. It holds its place while it loads, and says when it failed.
 */
export function WeekSummary({
  week,
  failed,
  name,
  reader,
  parents = NO_PARENTS,
}: {
  week: Week | undefined;
  failed: boolean;
  name: string;
  reader: 'guardian' | 'student';
  /** For the student: their parents, who read it too. */
  parents?: readonly string[];
}) {
  const title = reader === 'guardian' ? 'Sa semaine' : 'Ta semaine';

  return (
    <Section title={title}>
      {week ? (
        <Week week={week} name={name} reader={reader} parents={parents} />
      ) : failed ? (
        reader === 'guardian' ? (
          <Banner tone="error" title="Le résumé de la semaine n’a pas pu se charger. Réessayez dans un instant." />
        ) : (
          <MessageBanner message={STUDENT_FAILED} />
        )
      ) : (
        <>
          <p className="sr-only">Chargement…</p>
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-2/3" />
        </>
      )}
      {reader === 'student' && <p className="text-sm text-muted-foreground">{sameSummary(parents)}</p>}
    </Section>
  );
}

function Week({ week, name, reader, parents }: { week: Week; name: string; reader: 'guardian' | 'student'; parents: readonly string[] }) {
  if (week.sessions === 0) {
    return (
      <p className="text-muted-foreground">
        {reader === 'guardian' ? `${name} n’a pas ouvert de séance ces sept derniers jours.` : 'Pas de séance ces sept derniers jours.'}
      </p>
    );
  }
  const [first] = week.resisting;
  const sessions = `${String(week.sessions)} séance${week.sessions > 1 ? 's' : ''}`;
  return (
    <>
      <p>
        {reader === 'guardian' ? `${name} a travaillé` : 'Tu as travaillé'} {minutesText(week.minutes)}, en {sessions}, ces sept derniers jours.
      </p>
      <ul className="flex flex-col gap-1 text-muted-foreground">
        {week.subjects.map(({ subject, minutes }) => (
          <li key={subject}>
            {subjectLabel(subject)} : {minutesText(minutes)}
          </li>
        ))}
      </ul>
      <h3 className="font-bold text-foreground">Ce qui résiste</h3>
      {week.resisting.length === 0 ? (
        <p className="text-muted-foreground">Rien qui résiste ces sept derniers jours.</p>
      ) : (
        <List>
          {week.resisting.map((notion) => (
            <ListItem key={notion.notionId} title={notion.label} meta={lastTime(notion)} />
          ))}
        </List>
      )}
      {first && <p>{questionFor(reader, name, first.label, parents)}</p>}
    </>
  );
}
