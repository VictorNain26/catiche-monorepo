import { defineConfig, devices } from '@playwright/test';
import { browsers } from './config';

// The helpers' own tests, on pages they write themselves: no server.
export default defineConfig({
  testDir: './tests',
  forbidOnly: !!process.env['CI'],
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { connectOptions: browsers },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
