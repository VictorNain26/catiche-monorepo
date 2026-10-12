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
  /** What happened, in a few words: with the icon, the tone never rests on the color alone. */
  title: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * What a whole page has to say, at its top: one banner per page. An error is read out at once,
 * the rest when it appears.
 */
function Banner({ tone, title, children, className }: BannerProps) {
  const { icon: Icon, frame, mark } = TONES[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-2xl border-2 p-4', frame, className)}>
      <Icon aria-hidden="true" nonScalingStroke className={cn('size-6 shrink-0', mark)} />
      <div className="flex flex-col gap-1">
        <p className="font-bold">{title}</p>
        {children !== undefined && <div className="text-sm">{children}</div>}
      </div>
    </div>
  );
}

export { Banner };
