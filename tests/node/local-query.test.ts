// @vitest-environment node
import { ChildProcess } from "node:child_process";
import { PassThrough } from "node:stream";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
vi.mock("node:fs/promises", () => ({ rm: vi.fn<() => Promise<void>>(async () => {}) }));
vi.mock("node:child_process", async (original) => ({
  ...(await original<typeof import("node:child_process")>()),
  spawn: vi.fn<typeof spawn>(),
}));
import { localQuery } from "../../scripts/local-query.ts";
class Child extends ChildProcess {
  override stdout = new PassThrough();
  override pid: number | undefined = 123;
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
it("waits for complete successful JSON before terminating its own child", async () => {
  const child = new Child();
  vi.mocked(spawn).mockReturnValue(child);
  const kill = vi.spyOn(process, "kill").mockReturnValue(true);
  const promise = localQuery("SELECT 1", "/repo/apps/03-d1", "cf-learn-bookmarks");
  expect(vi.mocked(spawn).mock.calls.at(-1)?.[2]?.env?.["CLOUDFLARE_REGISTRY_PATH"]).toMatch(
    /^\/repo\/apps\/03-d1\/\.cloudflare\/query-registry\//,
  );
  child.stdout.emit("data", '\u001b[32m[{"success":');
  expect(kill).not.toHaveBeenCalled();
  child.stdout.emit("data", "true}]\u001b[39m");
  expect(kill).toHaveBeenCalledWith(-123, "SIGKILL");
  child.emit("close");
  await promise;
  expect(rm).toHaveBeenCalledWith(expect.stringContaining("/.cloudflare/query-registry/"), {
    recursive: true,
    force: true,
  });
});
it.each(["{}", "[]", '[{"success":false}]'])("rejects unverified output %s", async (output) => {
  const child = new Child();
  vi.mocked(spawn).mockReturnValue(child);
  const promise = localQuery("SELECT 1", "/repo", "cf-learn-bookmarks");
  child.stdout.emit("data", output);
  child.emit("close");
  await expect(promise).rejects.toThrow("成功");
});
it("surfaces launch errors", async () => {
  const child = new Child();
  vi.mocked(spawn).mockReturnValue(child);
  const promise = localQuery("SELECT 1", "/repo", "cf-learn-bookmarks");
  child.emit("error", new Error("spawn"));
  await expect(promise).rejects.toThrow("spawn");
});
it("times out safely even if no PID was assigned", async () => {
  vi.useFakeTimers();
  const child = new Child();
  child.pid = undefined;
  vi.mocked(spawn).mockReturnValue(child);
  const promise = localQuery("SELECT 1", "/repo", "cf-learn-bookmarks");
  const advancing = vi.advanceTimersByTimeAsync(30000);
  await expect(promise).rejects.toThrow("タイムアウト");
  await advancing;
});
