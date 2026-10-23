import { buttonVariants, cn } from '@repo/ui/classes';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createLink } from '@tanstack/react-router';
import { ChevronLeftIcon, UserRoundIcon, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import { meQuery } from '../lib/me';
import { ChangeProfile, Quit } from './sign-out';

function HeaderAnchor({ icon: Icon, className, children, ...anchor }: ComponentProps<'a'> & { icon: LucideIcon }) {
  return (
    // A header link always leads away from the screen: never announced as the current page, which
    // the router's prefix matching would do for a parent route.
    <a {...anchor} aria-current={undefined} className={cn(buttonVariants({ variant: 'link' }), 'gap-1 py-0', className)}>
      <Icon aria-hidden="true" nonScalingStroke className="size-6" />
      {children}
    </a>
  );
}

/** A link of the screen's header, with its words: an icon alone says nothing to a child. */
const HeaderLink = createLink(HeaderAnchor);

function BackAnchor(props: ComponentProps<'a'>) {
  return <HeaderAnchor {...props} icon={ChevronLeftIcon} />;
}

/** The way back to the screen above; a link of the router's, its params typed by its route. */
export const BackLink = createLink(BackAnchor);

/**
 * The student's profile, on each of their screens: whose space is open shows, and a tap on it
 * closes it and goes back to « Qui fait ses devoirs ? ».
 */
export function ProfileAction() {
  const { data: me } = useSuspenseQuery(meQuery);
  if (!me) return null;
  return <ChangeProfile name={me.name} />;
}

/**
 * A screen of the adult's, its header the same everywhere: « ← Vos enfants », named by the home's
 * title, except on the home itself, or the way back to a screen below it, named by it; who is
 * signed in, which opens their account; and « Quitter ».
 */
export function AdultPage({ withBack = true, back, ...page }: Omit<PageProps, 'action'> & { withBack?: boolean }) {
  const { data: me } = useSuspenseQuery(meQuery);
  return (
    <Page
      {...page}
      back={back ?? (withBack ? <BackLink to="/foyer">Vos enfants</BackLink> : undefined)}
      action={
        <div className="flex flex-wrap items-center justify-end gap-x-4">
          <HeaderLink to="/foyer/compte" icon={UserRoundIcon}>
            {me?.name} · Votre compte
          </HeaderLink>
          <Quit />
        </div>
      }
    />
  );
}

interface PageProps {
  title: string;
  /** A line that says more of the title, under it. */
  subtitle?: string;
  back?: ReactNode;
  action?: ReactNode;
  /** A screen reached by a step of a form, not a link: its title takes the focus, so it is read out. */
  announce?: boolean;
  /** A screen laid out by its own parts on a computer, side by side, rather than one column. */
  wide?: boolean;
  children: ReactNode;
}

/**
 * A screen at phone width first, in one column; its header holds the way back, read before the
 * title, and an action of the space on the right, when it has them.
 */
export function Page({ title, subtitle, back, action, announce = false, wide = false, children }: PageProps) {
  const links = back !== undefined || action !== undefined;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (announce) headingRef.current?.focus();
  }, [announce]);
  return (
    <main className={cn('mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 p-4', wide && 'lg:max-w-5xl lg:px-8')}>
      <header className="flex flex-col gap-2 pt-4">
        {links ? (
          <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3">
            {back ?? <span />}
            {action}
          </div>
        ) : null}
        <h1 ref={headingRef} tabIndex={-1} className={cn('text-3xl font-bold text-foreground outline-none', !links && 'pt-4')}>
          {title}
        </h1>
        {subtitle !== undefined && <p className="text-muted-foreground">{subtitle}</p>}
      </header>
      {children}
    </main>
  );
}
