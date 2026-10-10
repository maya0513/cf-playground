// @vitest-environment node
import { afterEach, expect, it, vi } from "vite-plus/test";
import { readFile, rm, access } from "node:fs/promises";
import { gzipSync } from "node:zlib";
vi.mock("node:zlib", () => ({ gzipSync: vi.fn<() => Buffer>(() => Buffer.alloc(1)) }));
const command = vi.hoisted(() => vi.fn<(...args: unknown[]) => unknown>());
const directories = vi.hoisted(() => vi.fn<() => Promise<string[]>>(async () => ["default"]));
const localQuery = vi.hoisted(() => vi.fn<(...args: unknown[]) => unknown>());
vi.mock("../../scripts/process.ts", () => ({ root: "/repo", command }));
vi.mock("../../scripts/local-query.ts", () => ({ localQuery }));
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn<() => Promise<string>>(async () => "CREATE TABLE demo(id);"),
  rm: vi.fn<(...args: unknown[]) => unknown>(),
  access: vi.fn<(...args: unknown[]) => unknown>(),
  readdir: directories,
}));
const argv = process.argv;
afterEach(() => {
  process.argv = argv;
  vi.clearAllMocks();
  vi.resetModules();
});
it("builds all public apps and verifies output files", async () => {
  await import("../../scripts/build.ts");
  expect(command).toHaveBeenCalledTimes(1);
  expect(access).toHaveBeenCalledTimes(2);
});
it("rejects a bundle larger than the Workers Free limit", async () => {
  vi.mocked(gzipSync).mockReturnValueOnce(Buffer.alloc(3 * 1024 * 1024 + 1));
  await expect(import("../../scripts/build.ts")).rejects.toThrow("Workers Free");
});
it("generates runtime types from the cf config", async () => {
  await import("../../scripts/typegen.ts");
  expect(command).toHaveBeenCalledWith(["exec", "cf", "workers", "types"], "/repo/apps/00-home");
});
it("sets up only local D1 databases", async () => {
  process.argv = ["node", "local.ts", "setup"];
  await import("../../scripts/local.ts");
  expect(localQuery).toHaveBeenCalledTimes(1);
  expect(rm).not.toHaveBeenCalled();
  expect(readFile).toHaveBeenCalledTimes(3);
});
it("resets the single runtime and then applies all migrations", async () => {
  process.argv = ["node", "local.ts", "reset", "--"];
  await import("../../scripts/local.ts");
  expect(rm).toHaveBeenCalledWith("/repo/apps/00-home/.cloudflare/state", {
    recursive: true,
    force: true,
  });
  expect(localQuery).toHaveBeenCalledWith(
    "CREATE TABLE demo(id);\nCREATE TABLE demo(id);\nCREATE TABLE demo(id);",
    "/repo/apps/00-home",
    "DB-cf-playground",
  );
});
it.each([["unexpected"], ["default", "extra"]])(
  "rejects a build containing extra or misnamed Workers: %s",
  async (...workers) => {
    directories.mockResolvedValueOnce(workers);
    await expect(import("../../scripts/build.ts")).rejects.toThrow("出力Worker");
  },
);
it.each([["invalid"], ["reset", "99"]])("rejects invalid local operation %s", async (...args) => {
  process.argv = ["node", "local.ts", ...args];
  await expect(import("../../scripts/local.ts")).rejects.toThrow(/./);
});
