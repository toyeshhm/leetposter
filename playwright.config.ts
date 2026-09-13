import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

// The specs reach the database directly (src/server/store) to move a persisted clock instead of waiting on it.
config({ path: ".env.local" });

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:3000", trace: "retain-on-failure", ...devices["Desktop Chrome"] },
  webServer: { command: "npm run dev", url: "http://127.0.0.1:3000", reuseExistingServer: true, timeout: 120_000 },
});
