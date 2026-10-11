import { cn } from '@repo/ui/classes';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createLink } from '@tanstack/react-router';
import { ChevronLeftIcon, UsersRoundIcon, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import { meQuery } from '../lib/me';

function HeaderAnchor({ icon: Icon, className, children, ...anchor }: ComponentProps<'a'> & { icon: LucideIcon }) {
  return (
    // A header link always leads away from the screen: never announced as the current page, which
    // the router's prefix matching would do for a parent route.
    <a
      {...anchor}
      aria-current={undefined}
      className={cn('inline-flex min-h-11 items-center gap-1 text-sm text-primary underline underline-offset-4', className)}
    >
      <Icon aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
      {children}
    </a>
  );
}

/** A link of the screen's header, with its words: an icon alone says nothing to a child. */
export const HeaderLink = createLink(HeaderAnchor);

/** The way back to the screen above. */
export function BackLink(props: Omit<ComponentProps<typeof HeaderLink>, 'icon'>) {
  return <HeaderLink {...props} icon={ChevronLeftIcon} />;
}

/**
 * The student's profile, on each of their screens: on the family's phone, who uses Tom shows, and
 * changing it is a tap on it, to « Qui utilise Tom ? ».
 */
export function ProfileLink() {
  const { data: me } = useSuspenseQuery(meQuery);
  if (!me) return null;
  return (
    <HeaderLink to="/connexion" icon={UsersRoundIcon} aria-label={`${me.name}, changer de profil`}>
      {me.name}
    </HeaderLink>
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
  children: ReactNode;
}

/**
 * A screen at phone width first, in one column; its header holds the way back, read before the
 * title, and an action of the space on the right, when it has them.
 */
export function Page({ title, subtitle, back, action, announce = false, children }: PageProps) {
  const links = back !== undefined || action !== undefined;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (announce) headingRef.current?.focus();
  }, [announce]);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 p-4">
      <header className="flex flex-col gap-2 pt-4">
        {links ? (
          <div className="flex min-h-11 items-center justify-between gap-3">
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
