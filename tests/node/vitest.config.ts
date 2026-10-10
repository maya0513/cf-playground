import { defineConfig } from "vite-plus";
import { preact } from "@preact/preset-vite";
// Deliberately load only the test section here: Vitest excludes its own config
// dependencies from instrumentation. The real root config is imported by tests.
const config = defineConfig({
  plugins: [preact()],
  test: {
    include: ["tests/node/**/*.test.ts", "tests/ui/**/*.test.tsx"],
    environment: "happy-dom",
    coverage: {
      provider: "istanbul",
      reportsDirectory: "coverage/node",
      reporter: ["json", "text"],
      include: [
        "apps/**/src/view.tsx",
        "apps/**/src/client.tsx",
        "packages/catalog/**/*.ts",
        "packages/tooling/**/*.ts",
        "apps/**/cloudflare.config.ts",
        "apps/**/vite.config.ts",
        "apps/**/local-fixture.ts",
        "packages/ui/client.tsx",
        "packages/ui/initial.ts",
        "packages/ui/layout.tsx",
        "packages/vite-command/vite.mjs",
        "packages/vite-command/command.ts",
        "scripts/**/*.ts",
        "*vite.config.ts",
        "playwright.config.*",
        "tests/workers/vitest.config.*",
      ],
      exclude: [],
    },
  },
});

export default config;
