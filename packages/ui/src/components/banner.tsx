import * as React from 'react';
import { CircleAlertIcon, CircleCheckIcon, InfoIcon, TriangleAlertIcon, type LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

type Tone = 'info' | 'success' | 'warning' | 'error';

const TONES: Record<Tone, { icon: LucideIcon; frame: string; mark: string }> = {
  info: { icon: InfoIcon, frame: 'border-primary bg-card text-card-foreground', mark: 'text-primary' },
  success: { icon: CircleCheckIcon, frame: 'border-success bg-card text-card-foreground', mark: 'text-success' },
  warning: { icon: TriangleAlertIcon, frame: 'border-warning bg-warning text-warning-foreground', mark: 'text-warning-foreground' },
  error: { icon: CircleAlertIcon, frame: 'border-destructive bg-card text-card-foreground', mark: 'text-destructive' },
};

interface BannerProps {
  tone: Tone;
  /** What happened or what holds, in a few words: with the icon, the tone never rests on the color alone. */
  title: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * What a page has to say as a whole, at its top: one banner per page.
 *
 * An error is an alert, read out when it appears with its text
 * (https://www.w3.org/WAI/ARIA/apg/patterns/alert/). Any other tone is a region
 * named by its title, read where it stands, not announced: a live region announces a change of
 * its content only once it is in the page, and a status mounted with its text is not reliably
 * read out (https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions).
 * A confirmation that must be heard goes through `toast()`, whose region is there from the
 * page's load.
 */
function Banner({ tone, title, children, className }: BannerProps) {
  const titleId = React.useId();
  const { icon: Icon, frame, mark } = TONES[tone];
  const content = (
    <>
      <Icon aria-hidden="true" nonScalingStroke className={cn('size-6 shrink-0', mark)} />
      <div className="flex flex-col gap-1">
        <p id={titleId} className="font-bold">
          {title}
        </p>
        {children !== undefined && <div className="text-sm">{children}</div>}
      </div>
    </>
  );
  const classes = cn('flex gap-3 rounded-2xl border-2 p-4', frame, className);
  return tone === 'error' ? (
    <div role="alert" className={classes}>
      {content}
    </div>
  ) : (
    <section aria-labelledby={titleId} className={classes}>
      {content}
    </section>
  );
}

export { Banner };
