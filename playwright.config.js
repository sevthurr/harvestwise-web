// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for HarvestWise Interface and Device Compatibility Testing.
 * Configured specifically for local testing against http://localhost:5173 and local backend.
 * @see https://playwright.dev/docs/test-configuration
 */

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './tests',
  /* Run tests in parallel or sequentially when debugging */
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  /* 30 seconds per test */
  timeout: 30 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  /* Reporter configuration: terminal list reporter and HTML report */
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL,
    /* Capture screenshots only on failure */
    screenshot: 'only-on-failure',
    /* Collect trace only on failure */
    trace: 'retain-on-failure',
  },

  /* Internal test artifacts directory so test-results/evidence is preserved */
  outputDir: './test-results/.playwright-artifacts',

  /* Automatically start/reuse local Vite dev server on http://localhost:5173 */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },

  /* Projects for formal Interface and Device Compatibility Testing */
  projects: [
    {
      name: 'farmer-mobile-chrome',
      use: {
        channel: 'chrome',
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
      grep: /@farmer|@dftc-mobile|@smoke/,
      grepInvert: /@desktop|@admin|@data-consistency/,
    },
    {
      name: 'mobile-safari-webkit',
      use: {
        ...devices['iPhone 13'],
      },
      grep: /@farmer|@dftc-mobile|@smoke/,
      grepInvert: /@desktop|@admin|@data-consistency/,
    },
    {
      name: 'chrome-desktop',
      use: {
        channel: 'chrome',
        viewport: { width: 1366, height: 768 },
      },
      grep: /@desktop|@compat|@smoke/,
    },
    {
      name: 'edge-desktop',
      use: {
        channel: 'msedge',
        viewport: { width: 1366, height: 768 },
      },
      grep: /@compat|@smoke/,
      grepInvert: /@data-consistency/,
    },
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1366, height: 768 },
      },
      grep: /@compat|@smoke/,
      grepInvert: /@data-consistency/,
    },
  ],
});
