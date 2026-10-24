import { Banner, List, ListItem, Skeleton } from '@repo/ui';
import { useQuery } from '@tanstack/react-query';
import { formatDate } from '../lib/device';
import { historyLine, historyQuery } from '../lib/history';
import type { Student } from '../lib/household';

/**
 * « Historique » (A7): what the adults did of the child, the 90 last days, the newest first: who,
 * what, when. It holds its place while it loads, and says when it failed.
 */
export function ChildHistory({ child }: { child: Student }) {
  const history = useQuery(historyQuery(child.id));
  if (history.isPending) {
    return (
      <>
        <p className="sr-only">Chargement…</p>
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-2/3" />
      </>
    );
  }
  if (history.isError) return <Banner tone="error" title="L’historique n’a pas pu se charger. Réessayez dans un instant." />;
  if (history.data.length === 0) return <p className="text-muted-foreground">Personne n’a rien changé ces 90 derniers jours.</p>;
  return (
    <List>
      {history.data.map((line) => (
        <ListItem key={line.id} title={historyLine(line, child.name)} meta={formatDate(line.createdAt)} />
      ))}
    </List>
  );
}
