// @vitest-environment node
import { expect, it, vi } from "vite-plus/test";
import { z } from "zod";
import { compileFunction } from "node:vm";
import { required } from "../assert.ts";
vi.mock("@cloudflare/vite-plugin", () => ({ cloudflare: vi.fn<() => []>(() => []) }));
vi.mock("@preact/preset-vite", () => ({ preact: vi.fn<() => []>(() => []) }));
vi.mock("vite-plus", () => ({
  defineConfig: vi.fn<(value: unknown) => unknown>((value) => value),
}));
vi.mock("@cloudflare/vitest-plugin", () => ({
  cloudflareTest: vi.fn<() => { name: string }>(() => ({ name: "test" })),
}));
type Factory = (options: { mode: string | undefined; isPreview: boolean }) => unknown;
function isExecutor(candidate: unknown): candidate is (...args: unknown[]) => unknown {
  return typeof candidate === "function";
}
const configs = import.meta.glob<{ default: object | Factory }>(
  "../../apps/*/cloudflare.config.ts",
);
it("local JWT fixture has a matching key ID", async () => {
  const { publicJwk, localToken } = await import("../../apps/08-access/local-fixture.ts");
  const header = z
    .object({ kid: z.string() })
    .parse(JSON.parse(Buffer.from(required(localToken.split(".")[0]), "base64url").toString()));
  expect(header.kid).toBe(publicJwk.kid);
});
it.each(Object.entries(configs))(
  "%s declares the compatibility date in every mode",
  async (_path, load) => {
    const { default: raw } = await load();
    for (const mode of ["development", "test", "production", undefined]) {
      const result: unknown = typeof raw === "function" ? raw({ mode, isPreview: false }) : raw;
      expect(result).toHaveProperty("worker.compatibilityDate", "2026-10-10");
    }
  },
);
it.each(["development", "test", "production", undefined])(
  "auth fixtures are restricted in %s mode",
  async (mode) => {
    const { default: access } = await import("../../apps/00-home/cloudflare.config.ts");
    const turnstile = access;
    const options = { mode, isPreview: false };
    const expected = mode === "development" || mode === "test" ? "local" : "production";
    expect(access(options).worker.env.MODE.value).toBe(expected);
    expect(turnstile(options).worker.env.MODE.value).toBe(expected);
    expect(turnstile(options).worker.env.SECRET.type).toBe(
      expected === "local" ? "text" : "secret",
    );
  },
);
const viteConfigs = import.meta.glob<{ default: unknown }>("../../apps/*/vite.config.ts");
it.each(Object.entries(viteConfigs))(
  "%s configures a local port and ESNext output",
  async (_path, load) => {
    const { default: config } = await load();
    const parsed = z
      .object({ server: z.object({ port: z.number() }), build: z.object({ target: z.string() }) })
      .parse(config);
    expect(parsed.server.port).toBeGreaterThanOrEqual(4100);
    expect(parsed.build.target).toBe("esnext");
  },
);
it("root tasks and browser/Worker configs are credential-free", async () => {
  expect((await import("../../vite.config.ts")).default).toHaveProperty(
    "run.tasks.dev.cache",
    false,
  );
  const { default: worker } = await import("../../apps/00-home/cloudflare.config.ts");
  expect(worker({ mode: "production", isPreview: false })).toHaveProperty(
    "worker.cache.enabled",
    true,
  );
  expect((await import("../../playwright.config.ts")).default.webServer).toHaveProperty("command");
  expect((await import("../workers/vitest.config.ts")).default).toHaveProperty(
    "test.maxWorkers",
    1,
  );
});
it("browser config uses bundled Chromium when system Chrome is absent", async () => {
  vi.resetModules();
  vi.doMock("node:fs", () => ({ existsSync: () => false }));
  const config = await import("../../playwright.config.ts");
  expect(config.default.use?.launchOptions?.executablePath).toBeUndefined();
});
it.each([[], ["--mode", "development"], ["build"]])("cf shim forwards %s", async (...args) => {
  const argv = process.argv;
  vi.doMock("vite-plus/bin", () => ({}));
  vi.resetModules();
  process.argv = ["node", "vite", ...args];
  await import("../../packages/vite-command/vite.mjs");
  expect(process.argv[2]).toBe(args[0] === "build" ? "build" : "dev");
  process.argv = argv;
});
it.each([
  ["../../vite.config.ts", "run.tasks.dev.cache", false],
  ["./vitest.config.ts", "test.coverage.provider", "istanbul"],
])("executes instrumented config %s", async (path, property, value) => {
  // Vitest 5 excludes config dependencies. Execute the same source with real Istanbul counters.
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const { createInstrumenter } = await import("@vitest/istanbul-lib-instrument");
  const filename = fileURLToPath(new URL(path, import.meta.url));
  const source = await readFile(filename, "utf8");
  const instrumented = createInstrumenter({
    esModules: true,
    compact: false,
    coverageVariable: "__VITEST_COVERAGE__",
    coverageGlobalScope: "globalThis",
    coverageGlobalScopeFunc: false,
  }).instrumentSync(source, filename);
  const executable = instrumented
    .replace(/^import .*;$/gm, "")
    .replace("export default config;", "return config;");
  const { defineConfig } = await import("vite-plus");
  const { preact } = await import("@preact/preset-vite");
  const execute = compileFunction(executable, ["defineConfig", "preact"]);
  const wrapped: unknown = execute;
  if (!isExecutor(wrapped)) throw new Error("config evaluator is missing");
  const result = wrapped(defineConfig, preact);
  expect(result).toHaveProperty(property, value);
});

it.each(Object.keys(viteConfigs))("instruments the executable Vite entry %s", async (path) => {
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const { createInstrumenter } = await import("@vitest/istanbul-lib-instrument");
  const { homeViteConfig } = await import("../../packages/tooling/vite.ts");
  const filename = fileURLToPath(new URL(path, import.meta.url));
  const code = createInstrumenter({
    esModules: true,
    coverageVariable: "__VITEST_COVERAGE__",
    coverageGlobalScope: "globalThis",
    coverageGlobalScopeFunc: false,
  }).instrumentSync(await readFile(filename, "utf8"), filename);
  const executable = code.replace(/import[^;]*;/g, "").replace("export default", "return");
  const execute: unknown = compileFunction(executable, ["homeViteConfig"]);
  if (!isExecutor(execute)) throw new Error("config evaluator is missing");
  expect(execute(homeViteConfig)).toHaveProperty("build.target", "esnext");
});
it("one config owns all exports and its internal binding points back to itself", async () => {
  expect(Object.keys(configs)).toEqual(["../../apps/00-home/cloudflare.config.ts"]);
  const { default: configure } = await import("../../apps/00-home/cloudflare.config.ts");
  const { worker } = configure({ mode: "production", isPreview: false });
  expect(worker.workersDev).toBe(true);
  expect(worker.assets).not.toHaveProperty("runWorkerFirst", true);
  expect(worker.env.INTERNAL.worker).toBe(worker.name);
  expect(Object.keys(worker.exports)).toEqual(["Counter", "ChatRoom", "OrderWorkflow", "Internal"]);
  expect(worker.env.MODE.value).toBe("production");
  expect(worker.env.SECRET.type).toBe("secret");
});

it("production resource IDs and auth values come from the deployment environment", async () => {
  const values = {
    CF_DB_ID: "db-production-id",
    CF_NOTICE_NAMESPACE_ID: "notice-production-id",
    CF_HISTORY_NAMESPACE_ID: "history-production-id",
    CF_TURNSTILE_SITEKEY: "sitekey-production",
    CF_ACCESS_ISSUER: "https://team.cloudflareaccess.com",
    CF_ACCESS_AUDIENCE: "production-audience",
  };
  for (const [key, value] of Object.entries(values)) vi.stubEnv(key, value);
  try {
    const { default: configure } = await import("../../apps/00-home/cloudflare.config.ts");
    const production = configure({ mode: "production", isPreview: false }).worker.env;
    expect(production.DB.id).toBe(values.CF_DB_ID);
    expect(production.NOTICE.id).toBe(values.CF_NOTICE_NAMESPACE_ID);
    expect(production.HISTORY.id).toBe(values.CF_HISTORY_NAMESPACE_ID);
    expect(production.SITEKEY.value).toBe(values.CF_TURNSTILE_SITEKEY);
    expect(production.ACCESS_ISSUER.value).toBe(values.CF_ACCESS_ISSUER);
    expect(production.ACCESS_AUDIENCE.value).toBe(values.CF_ACCESS_AUDIENCE);
    const local = configure({ mode: "development", isPreview: false }).worker.env;
    expect(local.DB.id).toBe("DB-cf-playground");
    expect(local.NOTICE.id).toBe("cf-learn-notice");
    expect(local.SITEKEY.value).toBe("1x00000000000000000000AA");
  } finally {
    vi.unstubAllEnvs();
  }
});
