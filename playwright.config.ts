import { defineConfig, devices } from '@playwright/test';
import { assertSafeE2ETarget } from "./tests/e2e/support/assert-safe-e2e-target";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */


import dotenv from "dotenv";
import path from "path";



dotenv.config({
  path: path.resolve(
    process.cwd(),
    ".env.e2e.local",
  ),
});

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  "http://localhost:3000";

assertSafeE2ETarget(baseURL);

const isLocalTarget = [
  "localhost",
  "127.0.0.1",
].includes(new URL(baseURL).hostname);



export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),

  timeout: 30_000,
  expect:{timeout: 5_000},
  retries: process.env.CI ? 1 : 0,

  reporter: [["list"],['html',{open: "never"}]],

    use: {
    
    baseURL:
      baseURL,

    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",

   
  },
    
    

 
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev:staging',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
