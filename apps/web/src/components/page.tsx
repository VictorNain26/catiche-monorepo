import { buttonVariants, cn } from '@repo/ui/classes';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Link, createLink } from '@tanstack/react-router';
import { ChevronLeftIcon, Settings2Icon, UserRoundIcon, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import { meQuery } from '../lib/me';
import { Quit, StudentQuit } from './sign-out';
import { TomFigure, TomHead } from './tom';

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

/** The brand's name, at the head of a screen: in the brand's water, or white on its deep plane (`panel`). */
export function Brand({ tone = 'primary', className }: { tone?: 'primary' | 'panel'; className?: string }) {
  return (
    <span className={cn('block font-heading text-xl font-extrabold', tone === 'primary' ? 'text-primary' : 'text-panel-foreground', className)}>
      Catiche
    </span>
  );
}

/** The landing's pages an adult's screen leads to, by a plain link: never a call (`CLAUDE.md`). */
export const LANDING = { contact: 'https://catiche.fr/contact', privacy: 'https://catiche.fr/confidentialite' } as const;

const FOOTER_LINK = cn(buttonVariants({ variant: 'link' }), 'py-0 font-bold');

/** « Contact » and « Confidentialité », the landing's pages, at the foot of an adult's screen. */
export function LandingLinks() {
  return (
    <>
      <a href={LANDING.contact} className={FOOTER_LINK}>
        Contact
      </a>
      <a href={LANDING.privacy} className={FOOTER_LINK}>
        Confidentialité
      </a>
    </>
  );
}

/** A link or a button of the adult's band: white on the deep plane, its ring white too, where the ring's water would vanish. */
const BAND_LINK =
  'px-2 font-bold text-panel-foreground no-underline hover:underline focus-visible:ring-panel-foreground focus-visible:ring-offset-panel';

/**
 * The band at the top of every adult's screen, on the brand's deep plane: Tom's head and the
 * brand's name, which lead home; who is signed in, which opens their account; and « Quitter ».
 */
function AdultBand() {
  const { data: me } = useSuspenseQuery(meQuery);
  return (
    <header className="bg-panel text-panel-foreground">
      <div className="mx-auto flex min-h-14 w-full max-w-5xl flex-wrap items-center justify-between gap-x-2 py-1.5 pr-2 pl-4 lg:px-8">
        <Link
          to="/foyer"
          activeOptions={{ exact: true }}
          className="flex min-h-11 items-center gap-2 rounded-control focus-visible:ring-2 focus-visible:ring-panel-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-panel focus-visible:outline-none"
        >
          <TomHead className="size-8 shrink-0" />
          <Brand tone="panel" />
        </Link>
        <nav aria-label="Votre compte" className="ml-auto flex flex-wrap justify-end">
          <HeaderLink to="/foyer/compte" icon={UserRoundIcon} className={BAND_LINK}>
            {me?.name} · Votre compte
          </HeaderLink>
          <Quit className={BAND_LINK} />
        </nav>
      </div>
    </header>
  );
}

/** A screen reached by a step of a form, not a link: its title takes the focus, so it is read out. */
function useAnnounce(announce: boolean) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (announce) headingRef.current?.focus();
  }, [announce]);
  return headingRef;
}

interface StageProps {
  title: ReactNode;
  subtitle?: string | undefined;
  back?: ReactNode;
  /** The links of the student's space: at the top of the stage on a phone, of the sheet on a computer. */
  nav?: ReactNode;
  /** The brand's name above the title on a phone, on the first screen of the app; on a computer, it always heads the stage. */
  brand?: boolean;
  announce?: boolean;
  /** Under the title, on the stage: Tom's sentence and the main action, seen in the first screen. */
  lead?: ReactNode;
  children: ReactNode;
}

/**
 * The student's screens (C2, E1 to E4): the stage, in the light water, holds the title, Tom and the
 * main action; the sheet, the card, holds the rest. On a phone, the sheet overlaps the stage from
 * below; on a computer, the stage stands on the left, Tom whole at its foot, and the sheet on the right.
 */
function StudentStage({ title, subtitle, back, nav, brand = false, announce = false, lead, children }: StageProps) {
  const headingRef = useAnnounce(announce);
  return (
    <main className="relative flex min-h-dvh flex-col bg-stage lg:flex-row">
      {/* A grid on a phone, the title and Tom side by side; a column on a computer, Tom last. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] content-start items-end gap-x-2 gap-y-4 px-4 pt-4 pb-10 text-stage-foreground lg:flex lg:w-5/12 lg:shrink-0 lg:flex-col lg:items-stretch lg:gap-6 lg:px-14 lg:py-10">
        {nav !== undefined && (
          <div className="col-span-2 flex flex-wrap items-center justify-end gap-x-6 lg:absolute lg:top-8 lg:right-12 lg:z-20">{nav}</div>
        )}
        <Brand className={cn('col-span-2 lg:block', !brand && 'hidden')} />
        {back !== undefined && <div className="col-span-2 flex min-h-11 items-center">{back}</div>}
        {/* Beside Tom on a phone, a column of some 120 px: a long word breaks, hyphenated in French. */}
        <h1 ref={headingRef} tabIndex={-1} className="pb-4 text-3xl break-words hyphens-auto outline-none lg:pt-8 lg:pb-0 lg:text-5xl">
          {title}
        </h1>
        <TomFigure className="size-28 xs:size-40 lg:order-last lg:mt-auto lg:size-90 lg:self-end" />
        {subtitle !== undefined && <p className="col-span-2 text-stage-muted-foreground">{subtitle}</p>}
        {lead !== undefined && <div className="col-span-2 flex flex-col gap-4 lg:gap-6">{lead}</div>}
      </div>
      <div
        className={cn(
          // Its side margin in a variable, which the lines laid on it reach past (`SHEET_ROWS`).
          'relative z-10 -mt-6 flex flex-1 flex-col rounded-t-2xl bg-card px-(--sheet-px) pt-6 pb-8 text-card-foreground shadow-sheet [--sheet-px:--spacing(4)] lg:mt-0 lg:-ml-6 lg:rounded-tr-none lg:rounded-bl-2xl lg:py-10 lg:[--sheet-px:--spacing(12)]',
          nav !== undefined && 'lg:pt-24',
        )}
      >
        <div className="flex w-full max-w-2xl flex-1 flex-col gap-6">{children}</div>
      </div>
    </main>
  );
}

/**
 * A list laid on the sheet: its lines, without a sheet of their own, which would be a card in a
 * card; they reach past the sheet's margin, so that a line under the pointer fills the column, and
 * their words keep that margin, aligned with the rest of the sheet.
 */
export const SHEET_ROWS = '-mx-(--sheet-px) rounded-none border-0 bg-transparent shadow-none *:*:px-(--sheet-px)';

/**
 * « Ce soir » (E4), the screen the student comes back to: « Régler mon espace » and « Quitter » at
 * the top; on the stage, its title, which names them, Tom and the way into his help (`lead`).
 */
export function StudentPage({ title, lead, children }: { title: ReactNode; lead: ReactNode; children: ReactNode }) {
  return (
    <StudentStage
      title={title}
      lead={lead}
      nav={
        <>
          <HeaderLink to="/espace" icon={Settings2Icon}>
            Régler mon espace
          </HeaderLink>
          <StudentQuit />
        </>
      }
    >
      {children}
    </StudentStage>
  );
}

/**
 * The student's way in (C2, E1, E2, E3), on the stage and the sheet: the sheet holds what the screen
 * asks, then a keypad (`pad`), then what follows (`after`); on a computer, in the sheet's middle.
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
}: Omit<StageProps, 'nav' | 'lead' | 'children'> & { pad?: ReactNode; after?: ReactNode; children?: ReactNode }) {
  return (
    <StudentStage title={title} subtitle={subtitle} back={back} brand={brand} announce={announce}>
      <div className="flex flex-col gap-6 lg:my-auto">
        {/* A failure that is not there, or no names yet, leaves no gap. */}
        {Boolean(children) && <div className="flex flex-col gap-6">{children}</div>}
        {pad !== undefined && <div className="flex justify-center">{pad}</div>}
        {after !== undefined && <div className="flex flex-col gap-3">{after}</div>}
      </div>
    </StudentStage>
  );
}

/**
 * A screen of the adult's: the band at its top; « ← Vos enfants », named by the home's title,
 * except on the home itself, or the way back to a screen below it, named by it; the title, as large
 * as the child's; and the foot, which says where the data lives and leads to the landing.
 */
export function AdultPage({ withBack = true, back, wide = false, children, ...header }: Omit<PageProps, 'display'> & { withBack?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AdultBand />
      <main className={cn(COLUMN, 'flex-1', wide && WIDE)}>
        <PageHeader {...header} back={back ?? (withBack ? <BackLink to="/foyer">Vos enfants</BackLink> : undefined)} display />
        {children}
      </main>
      <footer className={cn(COLUMN, 'gap-0 pt-0', wide && WIDE)}>
        <div className="flex flex-col gap-x-6 border-t border-border pt-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="py-2">Hébergé en France · Données jamais vendues</p>
          <p className="flex flex-wrap gap-x-6">
            <LandingLinks />
          </p>
        </div>
      </footer>
    </div>
  );
}

interface HeaderProps {
  /** A sentence, or a question; a word of it may be highlighted (`highlighter`). */
  title: ReactNode;
  /** A line that says more of the title, under it. */
  subtitle?: string | undefined;
  back?: ReactNode;
  /** A screen reached by a step of a form, not a link: its title takes the focus, so it is read out. */
  announce?: boolean;
  /** Its title larger on a computer, as the child's and the adult's screens draw it. */
  display?: boolean;
}

interface PageProps extends HeaderProps {
  /** A screen laid out by its own parts on a computer, side by side, rather than one column. */
  wide?: boolean;
  children: ReactNode;
}

/** The column of a screen, at phone width first; `WIDE`, a screen laid out by its parts on a computer. */
const COLUMN = 'mx-auto flex w-full max-w-md flex-col gap-6 p-4';
const WIDE = 'lg:max-w-5xl lg:px-8';

/** A screen's header: the way back, read before the title, when it has one. */
function PageHeader({ title, subtitle, back, announce = false, display = false }: HeaderProps) {
  const headingRef = useAnnounce(announce);
  return (
    <header className="flex flex-col gap-2 pt-4">
      {back !== undefined && <div className="flex min-h-11 items-center">{back}</div>}
      <h1
        ref={headingRef}
        tabIndex={-1}
        className={cn('text-3xl text-foreground outline-none', back === undefined && 'pt-4', display && 'lg:pt-0 lg:text-5xl')}
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
    <main className={cn(COLUMN, 'min-h-dvh', wide && WIDE)}>
      <PageHeader {...header} />
      {children}
    </main>
  );
}
