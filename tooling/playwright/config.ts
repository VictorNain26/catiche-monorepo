/** The settings every e2e suite of the repository shares in its playwright.config.ts. */

import type { PlaywrightTestConfig } from '@playwright/test';

/**
 * The browsers are the official image's, served by `docker compose` (service `playwright`); they
 * reach the suite's server through the host's loopback, on whatever port. Without a timeout, a
 * stopped service hangs the run.
 */
export const browsers = { wsEndpoint: 'ws://127.0.0.1:3030/', exposeNetwork: '<loopback>', timeout: 10_000 } as const;

/**
 * The image's browsers render a screenshot alike on every host: the host's platform stays out of
 * its name. Animations stopped, caret hidden and fonts loaded are toHaveScreenshot's own defaults.
 */
export const screenshots = {
  toHaveScreenshot: { pathTemplate: '{testDir}/__screenshots__{/projectName}/{testFilePath}/{arg}{ext}' },
} satisfies PlaywrightTestConfig['expect'];
