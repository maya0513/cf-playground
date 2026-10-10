// @vitest-environment node
import { afterEach, expect, it, vi } from "vite-plus/test";
import { readdir } from "node:fs/promises";
const state = vi.hoisted(() => ({ missing: false, percent: 100, totalPercent: 100 }));
vi.mock("../../scripts/process.ts", () => ({ root: "/repo" }));
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn<() => Promise<string>>(async () => "{}"),
  mkdir: vi.fn<(...args: unknown[]) => unknown>(),
  readdir: vi.fn<(path: string) => Promise<unknown>>(async (path: string) => [
    { name: "directory", parentPath: path, isFile: () => false },
    { name: "README.md", parentPath: path, isFile: () => true },
    { name: "types.d.ts", parentPath: path, isFile: () => true },
    { name: "dependency.ts", parentPath: path + "/node_modules", isFile: () => true },
    { name: "generated.ts", parentPath: path + "/.cloudflare/types", isFile: () => true },
    { name: "source.ts", parentPath: path, isFile: () => true },
  ]),
}));
const summary = () => ({
  lines: { pct: state.percent },
  statements: { pct: state.percent },
  functions: { pct: state.percent },
  branches: { pct: state.percent },
});
vi.mock("istanbul-lib-coverage", () => ({
  default: {
    createCoverageMap: () => ({
      merge: vi.fn<(...args: unknown[]) => unknown>(),
      files: () =>
        state.missing
          ? []
          : [
              "/repo/apps/source.ts",
              "/repo/packages/source.ts",
              "/repo/scripts/source.ts",
              "/repo/vite.config.ts",
              "/repo/playwright.config.ts",
              "/repo/tests/workers/vitest.config.ts",
              "/repo/tests/node/vitest.config.ts",
            ],
      getCoverageSummary: () => ({ ...summary(), lines: { pct: state.totalPercent } }),
      fileCoverageFor: () => ({ toSummary: summary }),
    }),
  },
}));
vi.mock("istanbul-lib-report", () => ({
  default: { createContext: vi.fn<(...args: unknown[]) => unknown>() },
}));
vi.mock("istanbul-reports", () => ({
  default: { create: () => ({ execute: vi.fn<(...args: unknown[]) => unknown>() }) },
}));
afterEach(() => {
  state.missing = false;
  state.percent = 100;
  state.totalPercent = 100;
  vi.resetModules();
});
it("merges both environments, checks the full inventory and every metric", async () => {
  await import("../../scripts/coverage.ts");
  expect(readdir).toHaveBeenCalledTimes(3);
});
it("rejects missing files", async () => {
  state.missing = true;
  await expect(import("../../scripts/coverage.ts")).rejects.toThrow("未計測");
});
it("rejects measured coverage below 100%", async () => {
  state.percent = 99;
  await expect(import("../../scripts/coverage.ts")).rejects.toThrow("required 100");
});
it("checks aggregate coverage as well as each file", async () => {
  state.totalPercent = 99;
  await expect(import("../../scripts/coverage.ts")).rejects.toThrow("TOTAL");
});
it("validates original Istanbul maps and restores optional line and infinite-column metadata", async () => {
  const { coverageSchema } = await import("../../scripts/coverage-schema.ts");
  const range = { start: { line: 1, column: 0 }, end: { line: 1, column: null } };
  const data = {
    path: "example.ts",
    statementMap: { 0: range },
    fnMap: { 0: { name: "run", decl: range, loc: range } },
    branchMap: { 0: { type: "if", loc: range, locations: [range] } },
    s: { 0: 1 },
    f: { 0: 1 },
    b: { 0: [1] },
  };
  expect(coverageSchema.parse({ "example.ts": data })).toHaveProperty(
    ["example.ts", "fnMap", "0", "line"],
    1,
  );
  expect(coverageSchema.parse({ "example.ts": data })).toHaveProperty(
    ["example.ts", "statementMap", "0", "end", "column"],
    Infinity,
  );
  const explicit = {
    ...data,
    fnMap: { 0: { ...data.fnMap[0], line: 2 } },
    branchMap: { 0: { ...data.branchMap[0], line: 2 } },
  };
  expect(coverageSchema.parse({ "example.ts": explicit })).toHaveProperty(
    ["example.ts", "branchMap", "0", "line"],
    2,
  );
  expect(() => coverageSchema.parse({ "example.ts": {} })).toThrow(/Invalid input/);
});
