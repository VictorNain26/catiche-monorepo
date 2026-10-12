/**
 * Security headers of every response, the web client's pages included.
 */

import { secureHeaders } from 'hono/secure-headers';

/**
 * The CSP allows nothing but this origin: the Vite build of apps/web carries no inline script or
 * style and no data: asset (build.assetsInlineLimit: 0), and registers its service worker from a
 * file. No exception for styles: the components of @repo/ui (Base UI) set their styles through
 * the CSSOM, which the CSP does not block
 * (https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src),
 * and write no <style> element. A nonce is no way out: the service worker serves a precached
 * index.html, whose nonce would never change. `hsts` off where the origin is http://localhost.
 */
export function securityHeaders({ hsts }: { hsts: boolean }) {
  return secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
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
