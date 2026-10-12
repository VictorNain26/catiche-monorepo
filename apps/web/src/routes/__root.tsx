import { Toaster } from '@repo/ui';
import type { QueryClient } from '@tanstack/react-query';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient; sessionLost: () => void }>()({ component: Root });

// The toasts' live region is in every page from its load: what appears in it later is read out.
function Root() {
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}
