import { Button, Card } from '@repo/ui';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Link, createFileRoute, redirect } from '@tanstack/react-router';
import { EntryPage } from '../components/page';
import { meQuery } from '../lib/me';
import { profileNote, profilesQuery } from '../lib/student';

/**
 * C2, « Qui fait ses devoirs ? », the way in: the profiles a parent's code put on this device, each
 * opened by its student's own code; then the starting code, and the adult's way in. A device that
 * holds none shows these two alone.
 */
export const Route = createFileRoute('/profils/')({
  beforeLoad: async ({ context }) => {
    // Someone's space open: the profile is closed by « Quitter », never left behind.
    if (await context.queryClient.query(meQuery)) throw redirect({ to: '/' });
  },
  loader: ({ context }) => context.queryClient.query(profilesQuery),
  component: Profiles,
});

// The two ways in beside the names: large, as the names are, and side by side on a computer.
const WAY_IN = 'min-h-14 whitespace-normal text-center';

function Profiles() {
  const { data } = useSuspenseQuery(profilesQuery);

  return (
    <EntryPage
      brand
      title={
        <>
          Qui fait ses <span className="highlighter">devoirs</span> ?
        </>
      }
      after={
        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-6">
          <Button render={<Link to="/activer" />} variant="outline" size="lg" className={WAY_IN}>
            Première fois ici ? J’ai un code de départ
          </Button>
          <Button render={<Link to="/connexion" />} variant="outline" size="lg" className={WAY_IN}>
            Je suis un adulte
          </Button>
        </div>
      }
    >
      {data.profiles.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 lg:gap-6">
          {data.profiles.map((profile) => {
            const note = profileNote(profile.state, profile.parents);
            return (
              <li key={profile.id}>
                <Card
                  render={<Link to="/profils/$studentId" params={{ studentId: profile.id }} />}
                  className="group flex h-full min-h-32 flex-col justify-center gap-1 shadow-control transition-colors duration-fast ease-standard hover:bg-accent hover:text-accent-foreground lg:min-h-44 lg:p-6"
                >
                  <span className="text-2xl font-bold break-words lg:text-3xl">{profile.name}</span>
                  {note && <span className="text-sm text-muted-foreground group-hover:text-accent-muted-foreground">{note}</span>}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </EntryPage>
  );
}
