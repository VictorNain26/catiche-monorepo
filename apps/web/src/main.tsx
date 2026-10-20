import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { Failure } from './components/failure';
import { isProblem } from './lib/api';
import { preloading } from './lib/preload';
import { listenForProfileChange, tabChannel } from './lib/student';
import { routeTree } from './routeTree.gen';
// The variable fonts on their weight axis alone (the packages' index.css).
import '@fontsource-variable/atkinson-hyperlegible-next';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource/atkinson-hyperlegible-mono/700.css';
import './styles.css';

// A session gone while a screen is open (ten minutes unused on a shared device, revoked
// elsewhere): back to the profiles of the device, or the sign-in, then nothing cached, so that no
// query of the screen left asks again.
const sessionLost = () => {
  void router.navigate({ to: '/profils' }).then(() => {
    queryClient.clear();
  });
};
// A profile signed in or out in another tab: this one starts afresh, never on a space left open.
listenForProfileChange(tabChannel(), () => {
  window.location.reload();
});
const onError = (error: unknown) => {
  if (isProblem(error, 'UNAUTHENTICATED')) sessionLost();
};
const queryClient = new QueryClient({ queryCache: new QueryCache({ onError }), mutationCache: new MutationCache({ onError }) });
const router = createRouter({
  routeTree,
  context: { queryClient, sessionLost },
  ...preloading,
  defaultErrorComponent: Failure,
  // A session places itself on its last message (routes/seance.$sessionId.tsx).
  scrollRestoration: ({ location }) => !location.pathname.startsWith('/seance/'),
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const root = document.getElementById('app');
if (!root) throw new Error('#app is missing from index.html');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
