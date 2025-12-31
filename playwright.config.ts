import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 3,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'https://splitdumb.emilycogsdill.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Bypass rate limiting during E2E tests (only works in local dev, not production)
    extraHTTPHeaders: {
      'x-test-bypass-ratelimit': 'true',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
