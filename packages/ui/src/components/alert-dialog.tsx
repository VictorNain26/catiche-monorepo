import { AlertDialog as Base } from '@base-ui/react/alert-dialog';
import type * as React from 'react';

interface AlertDialogProps {
  /** What opens it, a button of the screen; none when the screen opens it itself (`open`). */
  trigger?: React.ReactElement;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  /** A question, or what happens. */
  title: string;
  description: string;
  /** The gesture failed: said above the buttons, the dialog left open to try again. */
  error?: React.ReactNode;
  /** Its buttons, the gesture first; the way out by `AlertDialogClose`. */
  children: React.ReactNode;
}

/**
 * A question the screen waits on before a gesture, or a warning the person answers: Base UI's
 * alert dialog (https://base-ui.com/react/components/alert-dialog), modal, read out with its title
 * and its text, the focus held inside until it closes, then back on what opened it. At the foot of
 * the screen on a phone, where the thumb is; in the middle on a computer.
 */
function AlertDialog({ trigger, open, onOpenChange, title, description, error, children }: AlertDialogProps) {
  return (
    <Base.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Base.Trigger render={trigger} />}
      <Base.Portal>
        <Base.Backdrop className="fixed inset-0 z-40 bg-overlay/50 transition-opacity duration-base ease-standard data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
        <Base.Viewport className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <Base.Popup className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-popover p-6 text-popover-foreground shadow-control outline-none transition-opacity duration-base ease-standard data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none">
            <Base.Title className="text-2xl text-popover-foreground">{title}</Base.Title>
            <Base.Description>{description}</Base.Description>
            {error}
            <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-start">{children}</div>
          </Base.Popup>
        </Base.Viewport>
      </Base.Portal>
    </Base.Root>
  );
}

/** The button that closes the dialog without its gesture: « Rester », « Annuler ». */
const AlertDialogClose = Base.Close;

export { AlertDialog, AlertDialogClose };
