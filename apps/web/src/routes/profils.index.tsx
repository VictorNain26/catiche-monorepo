import { Button, Card } from '@repo/ui';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Link, createFileRoute, redirect } from '@tanstack/react-router';
import { Page } from '../components/page';
import { meQuery } from '../lib/me';
import { profileNote, profilesQuery } from '../lib/student';

/**
 * « Qui fait ses devoirs ? »: the profiles a guardian's code put on this device, each opened by its
 * student's own code, and the parent's way in. A device that holds none leads to the sign-in.
 */
export const Route = createFileRoute('/profils/')({
  beforeLoad: async ({ context }) => {
    // Someone's space open: the profile is closed by « Changer de profil », never left behind.
    if (await context.queryClient.query(meQuery)) throw redirect({ to: '/' });
    const { profiles } = await context.queryClient.query(profilesQuery);
    if (profiles.length === 0) throw redirect({ to: '/connexion' });
  },
  component: Profiles,
});

function Profiles() {
  const { data } = useSuspenseQuery(profilesQuery);

  return (
    <Page title="Qui fait ses devoirs ?" wide>
      <ul className="grid grid-cols-2 gap-3 lg:flex lg:flex-wrap lg:justify-center lg:gap-6 lg:pt-8">
        {data.profiles.map((profile) => {
          const note = profileNote(profile.state);
          return (
            <li key={profile.id} className="lg:w-56">
              <Card
                render={<Link to="/profils/$studentId" params={{ studentId: profile.id }} />}
                className="flex min-h-28 flex-col justify-center gap-1 text-center transition-colors duration-fast ease-standard hover:bg-accent hover:text-accent-foreground lg:min-h-44"
              >
                <span className="text-2xl font-bold break-words lg:text-3xl">{profile.name}</span>
                {note && <span className="text-sm text-muted-foreground">{note}</span>}
              </Card>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-1 lg:items-center">
        <p className="text-muted-foreground">
          {data.shared ? 'Sur cet appareil partagé, ton profil se ferme après 10 minutes sans rien faire.' : 'Touche ton prénom, puis tape ton code.'}
        </p>
        <Button render={<Link to="/activer" />} variant="link">
          Nouvel appareil ou code oublié ? Entre le code de ton parent
        </Button>
        <Button render={<Link to="/connexion" />} variant="link">
          Vous êtes le parent ? Entrer dans votre espace
        </Button>
      </div>
    </Page>
  );
}
