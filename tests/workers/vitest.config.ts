import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-plugin";
const config = defineConfig({
  plugins: [
    cloudflareTest({
      main: new URL("./main.ts", import.meta.url).pathname,
      miniflare: {
        compatibilityDate: "2026-10-10",
        compatibilityFlags: ["nodejs_compat"],
        kvNamespaces: ["NOTICE", "HISTORY"],
        d1Databases: ["DB"],
        r2Buckets: ["FILES"],
        queueProducers: { JOBS: "test-jobs" },
        durableObjects: {
          COUNTER: { className: "Counter", useSQLite: true },
          ROOMS: { className: "ChatRoom", useSQLite: true },
        },
        workflows: { ORDERS: { name: "test-orders", className: "OrderWorkflow" } },
      },
    }),
  ],
  oxc: { jsx: { runtime: "automatic", importSource: "preact" } },
  test: {
    include: ["./**/*.test.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    coverage: {
      provider: "istanbul",
      allowExternal: true,
      reportsDirectory: "../../coverage/workers",
      reporter: ["json", "text"],
      include: [
        new URL("../../apps", import.meta.url).pathname + "/**/src/index.ts",
        new URL("../../apps", import.meta.url).pathname + "/**/src/index.tsx",
        new URL("../../apps/08-access/src/auth.ts", import.meta.url).pathname,
        new URL("../../packages/ui/server.tsx", import.meta.url).pathname,
      ],
      exclude: [],
    },
  },
});

export default config;
