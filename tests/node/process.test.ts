// @vitest-environment node
import { ChildProcess } from "node:child_process";
import { PassThrough } from "node:stream";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { spawn } from "node:child_process";
vi.mock("node:child_process", async (original) => ({
  ...(await original<typeof import("node:child_process")>()),
  spawn: vi.fn<typeof spawn>(),
}));
import { command } from "../../scripts/process.ts";
import { startDev } from "../../scripts/development.ts";
class Child extends ChildProcess {
  override stdout = new PassThrough();
  override pid: number | undefined = 123;
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  process.exitCode = 0;
});
it("command resolves successful children", async () => {
  const child = new Child();
  vi.mocked(spawn).mockReturnValue(child);
  const promise = command(["exec", "cf", "build"]);
  child.emit("exit", 0);
  await expect(promise).resolves.toBeUndefined();
});
it("command passes a restricted environment without reintroducing parent secrets", async () => {
  vi.stubEnv("CLOUDFLARE_API_TOKEN", "parent-token-do-not-inherit");
  const child = new Child();
  vi.mocked(spawn).mockReturnValue(child);
  try {
    const promise = command(["exec", "cf", "build"], "/repo/apps/00-home", {
      CLOUDFLARE_API_TOKEN: undefined,
      CF_DB_ID: "production-id",
    });
    child.emit("exit", 0);
    await promise;
    expect(vi.mocked(spawn).mock.calls[0]?.[2]).toMatchObject({
      cwd: "/repo/apps/00-home",
      env: { CLOUDFLARE_API_TOKEN: undefined, CF_DB_ID: "production-id" },
    });
  } finally {
    vi.unstubAllEnvs();
  }
});
it.each([1, null])("command rejects exit %s", async (code) => {
  const child = new Child();
  vi.mocked(spawn).mockReturnValue(child);
  const promise = command(["exec", "cf", "build"]);
  child.emit("exit", code);
  await expect(promise).rejects.toThrow("failed");
});
it("command rejects launch errors", async () => {
  const child = new Child();
  vi.mocked(spawn).mockReturnValue(child);
  const promise = command(["exec", "cf", "build"]);
  child.emit("error", new Error("spawn failed"));
  await expect(promise).rejects.toThrow("spawn failed");
});
it("rejects individual startup arguments", () => {
  expect(() => startDev(["3"])).toThrow("個別起動");
});
it("dev stops process groups, removes signal handlers and is idempotent", () => {
  const child = new Child();
  vi.mocked(spawn).mockReturnValue(child);
  const kill = vi.spyOn(process, "kill").mockReturnValue(true);
  const before = process.listenerCount("SIGINT");
  const stop = startDev([]);
  expect(process.listenerCount("SIGINT")).toBe(before + 1);
  stop();
  stop();
  child.emit("exit", 0);
  expect(kill).toHaveBeenCalledTimes(1);
  expect(kill).toHaveBeenCalledWith(-123, "SIGKILL");
  expect(process.listenerCount("SIGINT")).toBe(before);
});
it.each([0, 1, null])("child exit %s stops other servers", (code) => {
  const child = new Child();
  vi.mocked(spawn).mockImplementation(() => child);
  vi.spyOn(process, "kill").mockReturnValue(true);
  startDev([]);
  child.emit("exit", code);
  expect(process.exitCode).toBe(code === 0 ? 0 : 1);
});
it("spawn error stops all servers", () => {
  const child = new Child();
  vi.mocked(spawn).mockImplementation(() => child);
  vi.spyOn(process, "kill").mockReturnValue(true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  startDev([]);
  child.emit("error", new Error("spawn"));
  expect(process.exitCode).toBe(1);
});
it("handles already-exited groups and surfaces other kill failures", () => {
  vi.mocked(spawn).mockImplementation(() => new Child());
  const kill = vi.spyOn(process, "kill").mockImplementation(() => {
    throw Object.assign(new Error("gone"), { code: "ESRCH" });
  });
  startDev([])();
  kill.mockImplementation(() => {
    throw Object.assign(new Error("denied"), { code: "EPERM" });
  });
  const stop = startDev([]);
  expect(stop).toThrow("denied");
  process.off("SIGINT", stop);
  process.off("SIGTERM", stop);
});
it("dev entry passes CLI arguments to the launcher", async () => {
  const mock = vi.fn<(...args: unknown[]) => unknown>();
  vi.doMock("../../scripts/development.ts", () => ({ startDev: mock }));
  await import("../../scripts/dev.ts");
  expect(mock).toHaveBeenCalledWith(process.argv.slice(2));
});

it("dev tolerates a child without a pid and accepts the argument separator", () => {
  const child = new Child();
  child.pid = undefined;
  vi.mocked(spawn).mockReturnValue(child);
  expect(() => startDev(["--"])()).not.toThrow();
});
