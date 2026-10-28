import { Button } from '@repo/ui';
import { buttonVariants, cn } from '@repo/ui/classes';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Link, createLink } from '@tanstack/react-router';
import { ChevronLeftIcon, LockIcon, MapPinIcon, Settings2Icon, ShieldCheckIcon, UserRoundIcon, type LucideIcon } from 'lucide-react';
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

/** The brand's name, at the head of a screen: in the brand's water, unless `className` gives it another ink. */
function Brand({ className }: { className?: string }) {
  return <span className={cn('block font-heading text-xl font-extrabold text-primary', className)}>Catiche</span>;
}

/** The landing's pages an adult's screen leads to, by a plain link: never a call (`CLAUDE.md`). */
const LANDING = { contact: 'https://catiche.fr/contact', privacy: 'https://catiche.fr/confidentialite' } as const;

const FOOTER_LINK = cn(buttonVariants({ variant: 'link' }), 'py-0 font-bold');

/** « Confidentialité », the landing's page: at the foot of an adult's screen, and wherever the adult reads what they see. */
export function PrivacyLink({ className }: { className?: string }) {
  return (
    <a href={LANDING.privacy} className={cn(FOOTER_LINK, className)}>
      Confidentialité
    </a>
  );
}

/** What the facts say, once: the band's foot repeats two of them (`AdultFoot`). */
const HOSTED = 'Hébergé en France';
const NOT_SOLD = 'Données jamais vendues';

/** What reassures an adult before they enter: true, and already public (`docs/charte.md`, « Le registre de l'adulte »). */
const FACTS = [
  [LockIcon, 'Votre enfant a son espace, protégé par son code'],
  [MapPinIcon, HOSTED],
  [ShieldCheckIcon, NOT_SOLD],
] as const;

/** A line led by its icon, in the brand's water, or white on its deep plane (`onPanel`): a fact, what the adult sees. */
export function IconLine({
  icon: Icon,
  onPanel = false,
  className,
  children,
}: {
  icon: LucideIcon;
  onPanel?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <Icon aria-hidden="true" nonScalingStroke className={cn('size-6 shrink-0', onPanel ? 'text-panel-foreground' : 'text-primary')} />
      {children}
    </div>
  );
}

/** The facts, each a line of a finger's height with its icon. */
function Facts({ onPanel = false, className }: { onPanel?: boolean; className?: string }) {
  return (
    <ul aria-label="Nos engagements" className={cn('flex flex-col', className)}>
      {FACTS.map(([icon, fact]) => (
        <li key={fact}>
          <IconLine icon={icon} onPanel={onPanel} className="min-h-11 items-center font-bold">
            {fact}
          </IconLine>
        </li>
      ))}
    </ul>
  );
}

/** The foot of an adult's screen: its note, then the landing's « Contact » and « Confidentialité ». */
function AdultFoot({ note, className }: { note: string; className?: string }) {
  return (
    <footer
      className={cn('flex flex-wrap items-center justify-between gap-x-6 border-t border-border pt-2 text-sm text-muted-foreground', className)}
    >
      <p className="py-2">{note}</p>
      <p className="flex flex-wrap gap-x-6">
        <a href={LANDING.contact} className={FOOTER_LINK}>
          Contact
        </a>
        <PrivacyLink />
      </p>
    </footer>
  );
}

/**
 * The band at the top of every adult's screen, on the brand's deep plane: Tom's head and the
 * brand's name, which lead home; who is signed in, which opens their account; and « Quitter ».
 */
function AdultBand() {
  const { data: me } = useSuspenseQuery(meQuery);
  return (
    <header className="bg-panel text-panel-foreground">
      <div className="mx-auto flex min-h-14 w-full max-w-5xl flex-wrap items-center justify-between gap-x-2 px-1 py-1.5 lg:px-4">
        <Button render={<Link to="/foyer" activeOptions={{ exact: true }} />} variant="on-panel" size="sm">
          <TomHead />
          <Brand className="text-panel-foreground" />
        </Button>
        <nav aria-label="Votre compte" className="ml-auto flex flex-wrap justify-end">
          <Button render={<Link to="/foyer/compte" />} variant="on-panel" size="sm" className="gap-1">
            <UserRoundIcon aria-hidden="true" nonScalingStroke className="size-6" />
            {me?.name} · Votre compte
          </Button>
          <Quit />
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
      <div className={cn('mx-auto w-full max-w-md px-4 pb-4', wide && WIDE)}>
        <AdultFoot note={`${HOSTED} · ${NOT_SOLD}`} />
      </div>
    </div>
  );
}

/**
 * The adult's way in (A1, A2): the brand's deep plane, its name, Tom and what Catiche is, at the top
 * on a phone; on a computer, on the left (5/12), Tom standing at its foot with the facts. Then the
 * column: the title, what the step asks, the facts on a phone, and the foot, who publishes Catiche
 * and the landing's pages.
 */
export function AdultEntryPage({ title, announce = false, children }: { title: string; announce?: boolean; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <header className="flex flex-col gap-4 bg-panel px-4 pt-7 pb-8 text-panel-foreground lg:w-5/12 lg:shrink-0 lg:gap-6 lg:px-14 lg:py-10">
        <Brand className="text-panel-foreground" />
        <TomFigure className="size-28 self-center xs:size-32 lg:order-last lg:mt-auto lg:size-90 lg:self-end" />
        <p className="text-lg">
          Catiche aide votre enfant à organiser ses devoirs du soir, avec Tom, une intelligence artificielle. Vous ne lisez pas ses échanges avec Tom
          : votre enfant vous dit où en sont ses devoirs.
        </p>
        <Facts onPanel className="hidden lg:flex" />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-4 lg:justify-center lg:py-10">
        <PageHeader title={title} announce={announce} display />
        {children}
        <Facts className="border-t border-border pt-3 lg:hidden" />
        <AdultFoot note="Catiche, par Victor Lenain" className="mt-auto justify-start lg:mt-0" />
      </main>
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
