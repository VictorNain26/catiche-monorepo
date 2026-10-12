import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './button';

// Base UI Dialog (https://base-ui.com/react/components/dialog): the focus kept inside while open,
// Escape and the backdrop close it, the focus goes back to the trigger. It locks the scroll through
// element.style, which the CSP of the server lets through, and writes no <style> element.
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

type ContentProps = Omit<DialogPrimitive.Popup.Props, 'title' | 'className'> & {
  /** Names the dialog for a screen reader, and heads it. */
  title: string;
  /** Read out with the title when it opens. */
  description?: string;
  className?: string;
};

function Layer({ title, description, className, children, ...props }: ContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-overlay/60 motion-safe:data-closed:animate-fade-out motion-safe:data-open:animate-fade-in" />
      <DialogPrimitive.Popup
        className={cn('fixed z-50 flex flex-col gap-4 overflow-y-auto bg-popover p-6 text-popover-foreground shadow-control', className)}
        {...props}
      >
        <div className="flex items-start justify-between gap-4">
          <DialogPrimitive.Title className="pt-2 text-xl text-foreground">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Close
            render={
              <Button variant="ghost" size="sm" className="shrink-0 px-3">
                <XIcon aria-hidden="true" nonScalingStroke className="size-6" />
                Fermer
              </Button>
            }
          />
        </div>
        {description !== undefined && <DialogPrimitive.Description className="text-muted-foreground">{description}</DialogPrimitive.Description>}
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

/** A question asked over the screen, centered; it fades in and out. */
function DialogContent({ className, ...props }: ContentProps) {
  return (
    <Layer
      className={cn(
        'inset-x-4 top-1/2 mx-auto max-h-dvh max-w-md -translate-y-1/2 rounded-2xl motion-safe:data-closed:animate-fade-out motion-safe:data-open:animate-fade-in',
        className,
      )}
      {...props}
    />
  );
}

/**
 * The same dialog set on an edge, like shadcn's Sheet: from the bottom of a phone, from the right
 * from `sm` on.
 */
function DrawerContent({ className, ...props }: ContentProps) {
  return (
    <Layer
      className={cn(
        'inset-x-0 bottom-0 max-h-dvh rounded-t-2xl pb-[max(--spacing(6),env(safe-area-inset-bottom))] motion-safe:data-closed:animate-slide-out-bottom motion-safe:data-open:animate-slide-in-bottom',
        'sm:inset-y-0 sm:left-auto sm:w-full sm:max-w-sm sm:rounded-t-none sm:rounded-l-2xl sm:motion-safe:data-closed:animate-slide-out-right sm:motion-safe:data-open:animate-slide-in-right',
        className,
      )}
      {...props}
    />
  );
}

export { Dialog, DialogClose, DialogContent, DialogTrigger, DrawerContent };
