import { describe, expect, it } from 'bun:test';
import { createMemoryHistory, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { preloading } from './preload';

// A real router on the app's preload options, over two screens: the loader of the second counts
// its calls, as the home's reads its query.
const routerCountingLoads = () => {
  const loads = { count: 0 };
  const rootRoute = createRootRoute();
  const start = createRoute({ getParentRoute: () => rootRoute, path: '/' });
  const screen = createRoute({
    getParentRoute: () => rootRoute,
    path: '/ecran',
    loader: () => {
      loads.count += 1;
    },
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([start, screen]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
    // Without a document the router would take itself for a server, which loads differently; a
    // client one reads its origin from the window, absent here.
    isServer: false,
    origin: 'http://localhost',
    ...preloading,
  });
  return { router, loads };
};

describe('preloading', () => {
  it('calls the loader again when a screen preloaded on a hover opens', async () => {
    const { router, loads } = routerCountingLoads();
    await router.load();

    await router.preloadRoute({ to: '/ecran' });
    expect(loads.count).toBe(1);

    await router.navigate({ to: '/ecran' });
    expect(loads.count).toBe(2);
  });

  it('calls the loader once for a screen opened without a hover', async () => {
    const { router, loads } = routerCountingLoads();
    await router.load();

    await router.navigate({ to: '/ecran' });
    expect(loads.count).toBe(1);
  });
});
