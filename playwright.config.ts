import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

import { assertSafeE2ETarget } from "./tests/e2e/support/assert-safe-e2e-target";

dotenv.config({
  path: path.resolve(process.cwd(), ".env.e2e.local"),
});

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  "http://localhost:3000";

const e2eTarget =
  process.env.E2E_TARGET ??
  "local-staging";

const validatedURL = assertSafeE2ETarget(
  baseURL,
  e2eTarget,
);

const isLocalTarget =
  e2eTarget === "local-staging";

export default defineConfig({
  testDir: "./tests/e2e",

  fullyParallel: false,
  workers: 1,

  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,

  timeout: 30_000,

  expect: {
    timeout: 5_000,
  },

  reporter: [
    ["list"],
    ["html", { open: "never" }],
  ],

  use: {
    baseURL: validatedURL.origin,

    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],

  webServer: isLocalTarget
    ? {
        command: "npm run dev:staging",
        url: validatedURL.origin,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});