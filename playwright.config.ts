import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
const config = defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  projects: [
    { name: "development", testMatch: "playground.spec.ts" },
    { name: "production", testMatch: "production.spec.ts", dependencies: ["development"] },
  ],
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    browserName: "chromium",
    trace: "retain-on-failure",
    launchOptions: existsSync("/opt/google/chrome/chrome")
      ? { executablePath: "/opt/google/chrome/chrome" }
      : {},
  },
  webServer: {
    command: "pnpm exec vp run setup:local && pnpm exec vp run dev",
    url: "http://127.0.0.1:4100/",
    reuseExistingServer: false,
    gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
    timeout: 180000,
  },
});

export default config;
