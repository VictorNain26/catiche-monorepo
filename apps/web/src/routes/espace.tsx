import { List, ListItem, Section } from '@repo/ui';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Link, createFileRoute, redirect } from '@tanstack/react-router';
import { BackLink, Page } from '../components/page';
import { ownDeviceLine } from '../lib/device';
import { meQuery, ownDevicesQuery, parentsOfMe, unknownDevice, whoSeesWhat } from '../lib/me';

/**
 * E6, « Règle ton espace », from the top of « Ce soir »: who sees what, what Tom keeps (E7), and
 * the devices that hold the student's profile, in the order they are looked for. Two columns on a
 * computer.
 */
export const Route = createFileRoute('/espace')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.query(meQuery);
    if (me?.role !== 'student') throw redirect({ to: '/' });
  },
  loader: ({ context }) => context.queryClient.query(ownDevicesQuery),
  component: Space,
});

function Space() {
  const { data: me } = useSuspenseQuery(meQuery);
  const { data } = useSuspenseQuery(ownDevicesQuery);
  const parents = parentsOfMe(me);

  return (
    <Page title="Règle ton espace" back={<BackLink to="/">Tes devoirs du soir</BackLink>} display wide>
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:gap-10">
        <div className="flex flex-col gap-6 lg:gap-8">
          <Section title="Qui voit quoi" className="gap-2">
            <p>{whoSeesWhat(parents)}</p>
          </Section>
          <Section title="Ce que Tom retient" className="gap-2">
            <List>
              <ListItem render={<Link to="/memoire" />} title="Ce que Tom retient" />
            </List>
          </Section>
        </div>
        <Section title="Tes appareils" className="gap-2">
          {/* Never empty: the device that shows this screen holds the profile. */}
          <List>
            {data.devices.map((device) => (
              <ListItem key={device.id} title={ownDeviceLine(device)} />
            ))}
          </List>
          <p className="text-sm text-muted-foreground">{unknownDevice(parents)}</p>
        </Section>
      </div>
    </Page>
  );
}
