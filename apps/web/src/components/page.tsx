import { cn } from '@repo/ui/classes';
import { createLink } from '@tanstack/react-router';
import { ChevronLeftIcon, type LucideIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

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

interface PageProps {
  title: string;
  back?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

/**
 * A screen at phone width first: one column on the exercise book's red margin; its header holds the
 * way back, read before the title, and an action of the space on the right, when it has them.
 */
export function Page({ title, back, action, children }: PageProps) {
  const links = back !== undefined || action !== undefined;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 border-l-2 border-margin p-4">
      <header className="flex flex-col gap-2 pt-4">
        {links ? (
          <div className="flex min-h-11 items-center justify-between gap-3">
            {back ?? <span />}
            {action}
          </div>
        ) : null}
        <h1 className={cn('text-3xl font-bold text-foreground', !links && 'pt-4')}>{title}</h1>
      </header>
      {children}
    </main>
  );
}
