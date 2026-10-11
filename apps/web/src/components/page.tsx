import { createLink } from '@tanstack/react-router';
import { ChevronLeftIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

function BackAnchor({ children, ...anchor }: ComponentProps<'a'>) {
  return (
    <a {...anchor} className="inline-flex min-h-11 items-center gap-1 text-sm text-primary underline underline-offset-4">
      <ChevronLeftIcon aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
      {children}
    </a>
  );
}

/** The way back to the screen above, with its words: an icon alone says nothing to a child. */
export const BackLink = createLink(BackAnchor);

interface PageProps {
  title: string;
  back?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

/**
 * A screen at phone width first: one column on the exercise book's red margin; its header holds the
 * way back, read before the title, and an action of the space on the right.
 */
export function Page({ title, back, action, children }: PageProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 border-l-2 border-margin p-4">
      <header className="flex flex-col gap-2 pt-4">
        <div className="flex min-h-11 items-center justify-between gap-3">
          {back ?? <span />}
          {action}
        </div>
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
      </header>
      {children}
    </main>
  );
}
