import { bindings, defineConfig, exports, triggers } from "cf/config";

// 公開するWorkerはこれ一つ。学習用の処理は各題材のsrcに残す。
const config = defineConfig(({ mode }) => {
  const local = mode === "development" || mode === "test";
  return {
    worker: {
      name: "cf-playground",
      entrypoint: "./src/index.tsx",
      compatibilityDate: "2026-10-10",
      compatibilityFlags: ["nodejs_compat"],
      workersDev: true,
      observability: { enabled: true, traces: { enabled: true } },
      assets: { htmlHandling: "none" },
      exports: {
        Counter: exports.durableObject({ storage: "sqlite" }),
        ChatRoom: exports.durableObject({ storage: "sqlite" }),
        OrderWorkflow: exports.workflow({ name: "cf-learn-orders" }),
        Internal: exports.worker(),
      },
      triggers: [
        triggers.scheduled({ schedule: "0 * * * *" }),
        triggers.queue({
          name: "cf-learn-jobs",
          maxBatchSize: 10,
          maxBatchTimeout: 1,
          maxRetries: 3,
        }),
      ],
      env: {
        ASSETS: bindings.assets(),
        DB: bindings.d1({
          name: "cf-playground",
          id: local ? "DB-cf-playground" : (process.env["CF_DB_ID"] ?? "DB-cf-playground"),
        }),
        NOTICE: bindings.kv({
          id: local
            ? "cf-learn-notice"
            : (process.env["CF_NOTICE_NAMESPACE_ID"] ?? "cf-learn-notice"),
        }),
        HISTORY: bindings.kv({
          id: local ? "cf-learn-cron" : (process.env["CF_HISTORY_NAMESPACE_ID"] ?? "cf-learn-cron"),
        }),
        FILES: bindings.r2({ name: "cf-learn-files" }),
        JOBS: bindings.queue<{ id: string; text: string }>({ name: "cf-learn-jobs" }),
        COUNTER: bindings.durableObject({ worker: "cf-playground", exportName: "Counter" }),
        ROOMS: bindings.durableObject({ worker: "cf-playground", exportName: "ChatRoom" }),
        ORDERS: bindings.workflow({
          name: "cf-learn-orders",
          worker: "cf-playground",
          exportName: "OrderWorkflow",
        }),
        INTERNAL: bindings.worker({ worker: "cf-playground", exportName: "Internal" }),
        MODE: bindings.text<string>(local ? "local" : "production"),
        SITEKEY: bindings.text<string>(
          local ? "1x00000000000000000000AA" : (process.env["CF_TURNSTILE_SITEKEY"] ?? ""),
        ),
        SECRET: local ? bindings.text("1x0000000000000000000000000000000AA") : bindings.secret(),
        ACCESS_ISSUER: bindings.text<string>(
          local ? "https://local.access.invalid" : (process.env["CF_ACCESS_ISSUER"] ?? ""),
        ),
        ACCESS_AUDIENCE: bindings.text<string>(
          local ? "local-learning" : (process.env["CF_ACCESS_AUDIENCE"] ?? ""),
        ),
      },
    },
  };
});
export default config;
