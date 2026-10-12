import * as React from 'react';
import { useRender } from '@base-ui/react/use-render';
import type { LucideIcon } from 'lucide-react';

interface Destination {
  icon: LucideIcon;
  /** One word, always shown beside the icon. */
  label: string;
  /** The link without content, the router's or an anchor; it says itself when it is the current page. */
  link: React.ReactElement;
}

/** Two to five destinations: under two there is nothing to navigate, past five a bar no longer reads. */
type Destinations =
  | readonly [Destination, Destination]
  | readonly [Destination, Destination, Destination]
  | readonly [Destination, Destination, Destination, Destination]
  | readonly [Destination, Destination, Destination, Destination, Destination];

interface AppShellProps {
  logo: React.ReactNode;
  /** The active profile, on the right of the header. */
  profile?: React.ReactNode;
  navigationLabel: string;
  destinations: Destinations;
  children: React.ReactNode;
}

/**
 * The frame of a signed-in space (`docs/experience.md`): the header with the logo and the active
 * profile, the destinations always visible. The viewport places them: tabs at the bottom of a
 * phone, a rail from `sm`, a side bar from `lg`.
 */
function AppShell({ logo, profile, navigationLabel, destinations, children }: AppShellProps) {
  return (
    <div className="min-h-dvh sm:grid sm:grid-cols-[auto_1fr] sm:grid-rows-[auto_1fr]">
      <header className="sticky top-0 z-20 flex min-h-14 items-center justify-between gap-4 border-b border-border bg-background px-4 sm:col-span-2">
        <div className="flex items-center">{logo}</div>
        {profile}
      </header>
      <nav
        aria-label={navigationLabel}
        className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] sm:static sm:border-t-0 sm:border-r sm:bg-background sm:pb-0"
      >
        <ul className="flex sm:sticky sm:top-14 sm:flex-col sm:gap-1 sm:p-2 lg:w-60">
          {destinations.map((destination) => (
            <li key={destination.label} className="flex-1 sm:flex-none">
              <DestinationLink {...destination} />
            </li>
          ))}
        </ul>
      </nav>
      <main className="min-w-0 pb-24 sm:pb-0">{children}</main>
    </div>
  );
}

function DestinationLink({ icon: Icon, label, link }: Destination) {
  return useRender({
    render: link,
    defaultTagName: 'a',
    props: {
      className:
        'group flex min-h-14 flex-col items-center justify-center gap-1 rounded-control px-2 py-1 text-xs font-bold text-muted-foreground focus-visible:ring-inset focus-visible:ring-offset-0 aria-[current=page]:text-foreground sm:w-20 lg:w-full lg:flex-row lg:justify-start lg:gap-3 lg:text-base',
      children: (
        <>
          <span className="flex h-8 w-14 items-center justify-center rounded-full group-hover:bg-accent group-aria-[current=page]:bg-highlight lg:w-10">
            <Icon aria-hidden="true" nonScalingStroke className="size-6" />
          </span>
          <span>{label}</span>
        </>
      ),
    },
  });
}

export { AppShell, type Destination };
