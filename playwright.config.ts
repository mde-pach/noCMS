import { defineConfig, devices } from "@playwright/test";

// Smoke layer over the real editor: the vitest matrices prove every control's logic and widget in
// isolation; these few specs prove the whole path still wires together in a browser — selection →
// props/style write → live canvas update, with the actual Tailwind engine compiling. Kept out of
// `bun run verify` (it needs a browser + dev server); run with `bun run test:e2e`.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
