import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: "http://127.0.0.1:8787",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run db:migrate && npx wrangler dev --ip 127.0.0.1 --port 8787",
    reuseExistingServer: false,
    timeout: 120_000,
    url: "http://127.0.0.1:8787/health",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
