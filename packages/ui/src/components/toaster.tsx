import { Toaster as Sonner, toast } from 'sonner';

/**
 * Where `toast()` shows, once per app: a short word on what just happened, never an error of a
 * field. At the top, clear of the tabs and of the session's composer; sonner's look left out for
 * the tokens (https://sonner.emilkowal.ski/styling, `unstyled`). Its description color needs the
 * important flag against sonner's own dark rule.
 */
function Toaster() {
  return (
    <Sonner
      theme="system"
      position="top-center"
      containerAriaLabel="Notifications"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-(--width) items-start gap-3 rounded-2xl border border-border bg-popover p-4 font-sans text-popover-foreground shadow-control',
          title: 'font-bold',
          description: 'text-sm text-muted-foreground!',
        },
      }}
    />
  );
}

export { Toaster, toast };
