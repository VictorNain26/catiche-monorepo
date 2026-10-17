// How the router preloads a screen, given to createRouter (main.tsx).
export const preloading = {
  defaultPreload: 'intent',
  // TanStack Query holds the data: a screen preloaded on a hover still calls its loader when it
  // opens, which reads the query afresh, rather than showing what the hover read
  // (https://tanstack.com/router/latest/docs/framework/react/guide/external-data-loading).
  defaultPreloadStaleTime: 0,
} as const;
