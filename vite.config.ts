import { defineConfig } from "vite-plus";
import { preact } from "@preact/preset-vite";
const config = defineConfig({
  plugins: [preact()],
  fmt: {
    ignorePatterns: [
      ".agents/**",
      "pnpm-lock.yaml",
      "**/.cloudflare/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  lint: {
    overrides: [
      {
        files: ["apps/**/src/*.tsx", "packages/ui/*.tsx", "tests/ui/*.tsx"],
        rules: { "react/react-in-jsx-scope": "off", "react/immutability": "off" },
      },
    ],
    options: { typeAware: true, typeCheck: true },
    plugins: ["typescript", "import", "promise", "unicorn", "react", "jsx-a11y", "vitest", "oxc"],
    categories: { correctness: "error", suspicious: "error", perf: "error" },
    rules: {
      "typescript/no-floating-promises": "error",
      "typescript/no-misused-promises": "error",
      "typescript/no-explicit-any": "error",
      "typescript/no-unsafe-argument": "error",
      "typescript/no-unsafe-assignment": "error",
      "typescript/no-unsafe-call": "error",
      "typescript/no-unsafe-member-access": "error",
      "typescript/no-unsafe-return": "error",
      "typescript/no-non-null-assertion": "error",
      "import/no-cycle": "error",
      "import/no-unassigned-import": ["error", { allow: ["**/*.css", "**/*.d.ts"] }],
      "react/rules-of-hooks": "error",
      "react/exhaustive-deps": "error",
    },
    ignorePatterns: [
      ".agents/**",
      "**/.cloudflare/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  run: {
    enablePrePostScripts: false,
    tasks: {
      dev: { command: "node scripts/dev.ts", cache: false },
      "setup:local": { command: "node scripts/local.ts setup", cache: false },
      "reset:local": { command: "node scripts/local.ts reset", cache: false },
      build: { command: "node scripts/build.ts", cache: false },
      "deploy:dry-run": {
        command: "pnpm --dir apps/00-home exec cf deploy --dry-run --provision=false",
        cache: false,
      },
      "deploy:check": {
        command: [
          "node scripts/build.ts",
          "pnpm --dir apps/00-home exec cf deploy --prebuilt --mode production --dry-run --provision=false",
        ],
        cache: false,
      },
      deploy: { command: "node scripts/deploy.ts", cache: false },
      format: { command: "vp fmt", cache: false },
      "format:check": { command: "vp fmt --check", cache: false },
      lint: { command: "vp lint --max-warnings 0", cache: false },
      typegen: { command: "node scripts/typegen.ts", cache: false },
      typecheck: { command: "tsc --noEmit", cache: false },
      "test:node": { command: "vp test run --config tests/node/vitest.config.ts", cache: false },
      "test:workers": { command: "pnpm --dir tests/workers exec vitest run", cache: false },
      test: { command: ["vp run test:node", "vp run test:workers"], cache: false },
      coverage: {
        command: [
          "vp test run --config tests/node/vitest.config.ts --coverage",
          "pnpm --dir tests/workers exec vitest run --coverage",
          "node scripts/coverage.ts",
        ],
        cache: false,
      },
      "test:e2e": { command: "playwright test", cache: false },
      "ci:check": {
        command: [
          "vp run format:check",
          "vp run typegen",
          "vp run lint",
          "vp run typecheck",
          "vp run coverage",
          "vp run build",
          "vp run test:e2e",
        ],
        cache: false,
      },
    },
  },
});

export default config;
