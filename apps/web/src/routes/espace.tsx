import { Card } from '@repo/ui';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Link, createFileRoute, redirect } from '@tanstack/react-router';
import { ChevronRightIcon } from 'lucide-react';
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
          <section aria-labelledby="who-title" className="flex flex-col gap-2">
            <h2 id="who-title" className="text-xl text-foreground">
              Qui voit quoi
            </h2>
            <p>{whoSeesWhat(parents)}</p>
          </section>
          <section aria-labelledby="memory-title" className="flex flex-col gap-2">
            <h2 id="memory-title" className="text-xl text-foreground">
              Ce que Tom retient
            </h2>
            <Card
              render={<Link to="/memoire" />}
              className="flex min-h-14 items-center justify-between gap-3 transition-colors duration-fast ease-standard hover:bg-accent"
            >
              <span className="font-bold text-primary underline underline-offset-4">Ce que Tom retient</span>
              <ChevronRightIcon aria-hidden="true" nonScalingStroke className="size-6 shrink-0 text-primary" />
            </Card>
          </section>
        </div>
        <section aria-labelledby="devices-title" className="flex flex-col gap-2">
          <h2 id="devices-title" className="text-xl text-foreground">
            Tes appareils
          </h2>
          {/* Never empty: the device that shows this screen holds the profile. */}
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card text-card-foreground">
            {data.devices.map((device) => (
              <li key={device.id} className="p-4">
                {ownDeviceLine(device)}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">{unknownDevice(parents)}</p>
        </section>
      </div>
    </Page>
  );
}
