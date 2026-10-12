import { Toast } from '@base-ui/react/toast';

// Base UI Toast (https://base-ui.com/react/components/toast): one manager for the app, so that
// `toast()` is called from anywhere, a handler or a mutation, outside React.
const manager = Toast.createToastManager();

/** Says what just happened, in a few words; never the error of a field, which stays at the field. */
function toast(title: string, options: { description?: string } = {}) {
  manager.add({ title, ...options });
}

/**
 * Where `toast()` shows, once per app, at the top, clear of the tabs and of the session's composer.
 * Its viewport is a polite live region from the page's load on: what appears in it is read out,
 * which a status mounted with its text is not reliably.
 */
function Toaster() {
  return (
    <Toast.Provider toastManager={manager}>
      <Toast.Portal>
        <Toast.Viewport className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-sm flex-col gap-2 outline-none">
          <Toasts />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

function Toasts() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((item) => (
    <Toast.Root
      key={item.id}
      toast={item}
      className="flex flex-col gap-1 rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-control transition-opacity duration-base ease-standard data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none"
    >
      <Toast.Title className="font-bold" />
      <Toast.Description className="text-sm text-muted-foreground" />
    </Toast.Root>
  ));
}

export { Toaster, toast };
