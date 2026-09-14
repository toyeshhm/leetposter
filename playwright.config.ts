import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

// The specs reach the database directly (src/server/store) to move a persisted clock instead of waiting on it.
config({ path: ".env.local" });

/* The game and the shared editor run on every engine; the rest of the suite on Chromium only. */
const CROSS_ENGINE = ["**/game.spec.ts", "**/editor.spec.ts"];

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:3000", trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", testMatch: CROSS_ENGINE, use: { ...devices["Desktop Safari"] } },
    { name: "firefox", testMatch: CROSS_ENGINE, use: { ...devices["Desktop Firefox"] } },
  ],
  webServer: { command: "npm run dev", url: "http://127.0.0.1:3000", reuseExistingServer: true, timeout: 120_000 },
});
