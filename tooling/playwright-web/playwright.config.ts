import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { DATABASE_URL } from './database';
import { SERVER_LOG } from './server-log';

const PORT = 3012;
const baseURL = `http://localhost:${String(PORT)}`;

// The suite runs against the built server, which serves the built web, as in production
// (https://turborepo.dev/docs/guides/tools/playwright), on its own database, recreated each run.
const environment = Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined));

// Phone first: every path is proven at phone width, on WebKit as on Chromium, then at a computer's.
export default defineConfig({
  testDir: './tests',
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  // The image's browsers render a screenshot alike on every host: the host's platform stays out of its
  // name. Animations stopped, caret hidden and fonts loaded are toHaveScreenshot's own defaults.
  expect: { toHaveScreenshot: { pathTemplate: '{testDir}/__screenshots__{/projectName}/{testFilePath}/{arg}{ext}' } },
  // The browsers are the official image's, served by `docker compose` (service `playwright`); they
  // reach the suite's server through the host's loopback. Without a timeout, a stopped service hangs
  // the run.
  use: {
    baseURL,
    trace: 'on-first-retry',
    connectOptions: { wsEndpoint: 'ws://127.0.0.1:3030/', exposeNetwork: '<loopback>', timeout: 10_000 },
  },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 15'] } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // The server's log goes to a file, its emails with it: a test reads there the code an address was sent.
    command: `bun ${resolve(import.meta.dirname, 'reset-database.ts')} ${DATABASE_URL} && bun --no-env-file dist/migrate.js && bun --no-env-file dist/main.js > ${SERVER_LOG}`,
    cwd: '../../apps/server',
    url: `${baseURL}/health/ready`,
    env: {
      ...environment,
      DATABASE_URL,
      // A test value: the suite's server holds no real account.
      BETTER_AUTH_SECRET: 'e2e-secret-of-the-test-suite-only-0123456789',
      PORT: String(PORT),
      BETTER_AUTH_URL: baseURL,
      WEB_DIST_DIR: resolve(import.meta.dirname, '../../apps/web/dist'),
      LOG_LEVEL: 'info',
      API_RATE_LIMIT: '10000',
    },
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
