import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  webServer: {
    // Tests run against a production build, like the deployed demo.
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/approvals`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    // Default suite: the chain is mocked, so results never depend on the public RPC.
    {
      name: "e2e",
      testIgnore: /\.live\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // Opt-in smoke test against real Base Sepolia: npm run test:live
    {
      name: "live",
      testMatch: /\.live\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
