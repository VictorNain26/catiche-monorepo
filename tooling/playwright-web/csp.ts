import type { Page } from '@playwright/test';

/** What the CSP of the server blocks on the page, from its first script on: directive and URI. */
export async function recordCspViolations(page: Page) {
  await page.addInitScript(() => {
    const violations: string[] = [];
    Object.assign(window, { cspViolations: violations });
    document.addEventListener('securitypolicyviolation', (event) => violations.push(`${event.violatedDirective} ${event.blockedURI}`));
  });
  return () => page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations);
}
