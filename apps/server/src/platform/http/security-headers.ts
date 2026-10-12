/**
 * Security headers of every response, the web client's pages included.
 */

import { secureHeaders } from 'hono/secure-headers';

/**
 * The CSP allows nothing but this origin: the Vite build of apps/web carries no inline script or
 * style and no data: asset (build.assetsInlineLimit: 0), and registers its service worker from a
 * file. One exception, `style-src-elem`: Radix Dialog locks the scroll by a <style> element it
 * writes at run time (react-remove-scroll-bar), and sonner inserts its stylesheet the same way, a
 * strict CSP it declines to support (https://github.com/emilkowalski/sonner/issues/449). A style
 * attribute in markup stays blocked: `style-src-attr` falls back to `default-src`
 * (https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src-elem).
 * `hsts` off where the origin is http://localhost.
 */
export function securityHeaders({ hsts }: { hsts: boolean }) {
  return secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      styleSrcElem: ["'self'", "'unsafe-inline'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
    },
    xFrameOptions: 'DENY',
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: { geolocation: [], microphone: [], camera: [] },
    strictTransportSecurity: hsts ? 'max-age=31536000; includeSubDomains' : false,
  });
}
