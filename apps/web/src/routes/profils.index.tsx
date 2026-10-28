import { Button, List, ListItem } from '@repo/ui';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Link, createFileRoute, redirect } from '@tanstack/react-router';
import { LockIcon } from 'lucide-react';
import { EntryPage, SHEET_ROWS } from '../components/page';
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
        <>
          <Button render={<Link to="/activer" />} variant="tonal" size="lg" className="min-h-14 w-full whitespace-normal text-center">
            Première fois ici ? J’ai un code de départ
          </Button>
          <Button render={<Link to="/connexion" />} variant="link" className="self-center">
            Je suis un adulte
          </Button>
        </>
      }
    >
      {data.profiles.length > 0 && (
        <List className={SHEET_ROWS}>
          {data.profiles.map((profile) => {
            const note = profileNote(profile.state, profile.name, profile.parents);
            // Blocked here or stopped everywhere: the line says whom to ask, and leads to E3, its keypad
            // closed, « J'ai oublié mon code » open.
            const closed = profile.state === 'blocked' || profile.state === 'locked';
            return (
              <ListItem
                key={profile.id}
                className="min-h-18 gap-4"
                leading={
                  <span
                    aria-hidden="true"
                    className="flex size-12 shrink-0 items-center justify-center self-start rounded-full bg-chip font-heading text-xl font-extrabold text-chip-foreground"
                  >
                    {profile.name.charAt(0).toUpperCase()}
                  </span>
                }
                title={<span className="font-heading text-2xl font-extrabold break-words">{profile.name}</span>}
                meta={
                  note === null ? undefined : closed ? (
                    <span className="flex items-start gap-2">
                      <LockIcon aria-hidden="true" nonScalingStroke className="mt-0.5 size-5 shrink-0" />
                      <span>{note}</span>
                    </span>
                  ) : (
                    note
                  )
                }
                render={<Link to="/profils/$studentId" params={{ studentId: profile.id }} />}
              />
            );
          })}
        </List>
      )}
    </EntryPage>
  );
}
