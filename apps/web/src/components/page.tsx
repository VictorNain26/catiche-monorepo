import { buttonVariants, cn } from '@repo/ui/classes';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createLink } from '@tanstack/react-router';
import { ChevronLeftIcon, Settings2Icon, UserRoundIcon, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import { meQuery } from '../lib/me';
import { Quit, StudentQuit } from './sign-out';
import { TomHead } from './tom';

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

/** The brand's name, at the head of a screen. */
function Brand({ className }: { className?: string }) {
  return <p className={cn('font-heading text-xl font-extrabold text-primary', className)}>Catiche</p>;
}

/**
 * « Ce soir » (E4), the screen the student comes back to: « Régler mon espace » and « Quitter » at
 * the top, its title, which names them, larger on a computer, with the brand beside the header.
 */
export function StudentPage(page: Omit<PageProps, 'back' | 'action' | 'display'>) {
  return (
    <Page
      {...page}
      display
      back={<Brand className="hidden lg:block" />}
      action={
        <div className="flex flex-wrap items-center justify-end gap-x-6">
          <HeaderLink to="/espace" icon={Settings2Icon}>
            Régler mon espace
          </HeaderLink>
          <StudentQuit />
        </div>
      }
    />
  );
}

/**
 * The student's way in (C2, E1, E2, E3): one column on a phone; on a computer, the brand's panel on
 * the left, with Tom, and the screen on the right. A screen with a keypad (`pad`) lays it beside its
 * words on a computer, and under them on a phone, before what follows (`after`).
 */
export function EntryPage({
  title,
  subtitle,
  back,
  brand = false,
  announce = false,
  pad,
  after,
  children,
}: {
  title: ReactNode;
  subtitle?: string | undefined;
  back?: ReactNode;
  /** The brand's name above the title on a phone, on the first screen of the app. */
  brand?: boolean;
  announce?: boolean;
  pad?: ReactNode;
  after?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md lg:grid lg:max-w-none lg:grid-cols-12 lg:gap-16 lg:p-8">
      <aside className="hidden flex-col justify-between rounded-2xl bg-panel p-10 text-panel-foreground lg:col-span-5 lg:flex">
        <p className="font-heading text-2xl font-extrabold">Catiche</p>
        <TomHead className="size-56 self-center" />
        <span />
      </aside>
      <main
        className={cn(
          'flex w-full flex-col gap-6 p-4 lg:col-span-7 lg:justify-center lg:p-0 lg:pr-8',
          pad === undefined ? 'lg:max-w-xl' : 'lg:grid lg:grid-cols-2 lg:content-center lg:items-center lg:gap-x-12 lg:gap-y-6',
        )}
      >
        <div className="flex flex-col gap-6 lg:col-start-1">
          {brand && <Brand className="pt-6 lg:hidden" />}
          <PageHeader title={title} subtitle={subtitle} back={back} announce={announce} display />
        </div>
        {/* A failure that is not there, or no names yet, leaves no gap. */}
        {Boolean(children) && <div className="flex flex-col gap-6 lg:col-start-1">{children}</div>}
        {pad !== undefined && <div className="flex justify-center lg:col-start-2 lg:row-span-3 lg:row-start-1">{pad}</div>}
        {after !== undefined && <div className="flex flex-col gap-3 lg:col-start-1">{after}</div>}
      </main>
    </div>
  );
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

interface HeaderProps {
  /** A sentence, or a question; a word of it may be highlighted (`highlighter`). */
  title: ReactNode;
  /** A line that says more of the title, under it. */
  subtitle?: string | undefined;
  back?: ReactNode;
  action?: ReactNode;
  /** A screen reached by a step of a form, not a link: its title takes the focus, so it is read out. */
  announce?: boolean;
  /** A child's screen: its title larger on a computer, as the child's screens draw it. */
  display?: boolean;
}

interface PageProps extends HeaderProps {
  /** A screen laid out by its own parts on a computer, side by side, rather than one column. */
  wide?: boolean;
  children: ReactNode;
}

/** A screen's header: the way back, read before the title, and an action of the space on the right, when it has them. */
function PageHeader({ title, subtitle, back, action, announce = false, display = false }: HeaderProps) {
  const links = back !== undefined || action !== undefined;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (announce) headingRef.current?.focus();
  }, [announce]);
  return (
    <header className="flex flex-col gap-2 pt-4">
      {links ? (
        <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3">
          {back ?? <span />}
          {action}
        </div>
      ) : null}
      <h1
        ref={headingRef}
        tabIndex={-1}
        className={cn('text-3xl font-bold text-foreground outline-none', !links && 'pt-4', display && 'lg:pt-0 lg:text-5xl')}
      >
        {title}
      </h1>
      {subtitle !== undefined && <p className="text-muted-foreground">{subtitle}</p>}
    </header>
  );
}

/** A screen at phone width first, in one column. */
export function Page({ wide = false, children, ...header }: PageProps) {
  return (
    <main className={cn('mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 p-4', wide && 'lg:max-w-5xl lg:px-8')}>
      <PageHeader {...header} />
      {children}
    </main>
  );
}
