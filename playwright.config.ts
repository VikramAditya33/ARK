import { defineConfig } from "@playwright/test";

const inCi = process.env.CI === "true";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  forbidOnly: inCi,
  retries: inCi ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  outputDir: "artifacts/playwright",
  use: {
    browserName: "chromium",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "pnpm --filter @ark/demo-crm start",
      url: "http://127.0.0.1:3211/health",
      reuseExistingServer: !inCi,
      timeout: 30_000,
      env: {
        DEMO_CRM_ADMIN_TOKEN: "demo-crm-admin",
        DEMO_CRM_DATABASE_PATH: ".ark/tests/demo-crm-browser.sqlite",
        DEMO_CRM_HOST: "127.0.0.1",
        DEMO_CRM_PORT: "3211",
        DEMO_CRM_USER_TOKEN: "demo-crm-user",
      },
    },
    {
      command: "pnpm --filter @ark/demo-ops start",
      url: "http://127.0.0.1:3212/health",
      reuseExistingServer: !inCi,
      timeout: 30_000,
      env: {
        DEMO_OPS_ADMIN_TOKEN: "demo-ops-admin",
        DEMO_OPS_DATABASE_PATH: ".ark/tests/demo-ops-browser.sqlite",
        DEMO_OPS_HOST: "127.0.0.1",
        DEMO_OPS_PORT: "3212",
        DEMO_OPS_USER_TOKEN: "demo-ops-user",
      },
    },
  ],
});
