// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { deploy } from "../../scripts/deployment.ts";

const command = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<void>>(async () => {}));
vi.mock("../../scripts/process.ts", () => ({ root: "/repo", command }));
vi.mock("node:fs/promises", () => ({
  mkdtemp: vi.fn<() => Promise<string>>(async () => "/tmp/test-cf-secrets"),
  writeFile: vi.fn<(...args: unknown[]) => Promise<void>>(async () => {}),
  rm: vi.fn<(...args: unknown[]) => Promise<void>>(async () => {}),
}));
const values = {
  CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
  CLOUDFLARE_API_TOKEN: "test-api-token-do-not-log",
  CF_DB_ID: "12345678-1234-4234-8234-123456789abc",
  CF_NOTICE_NAMESPACE_ID: "b".repeat(32),
  CF_HISTORY_NAMESPACE_ID: "c".repeat(32),
  CF_TURNSTILE_SITEKEY: "production-site-key",
  CF_TURNSTILE_SECRET: 'production-secret-"-\\-\n-do-not-log',
  CF_ACCESS_ISSUER: "https://example.cloudflareaccess.com",
  CF_ACCESS_AUDIENCE: "production-audience",
};
beforeEach(() => {
  for (const [key, value] of Object.entries(values)) vi.stubEnv(key, value);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.resetModules();
});
it("publishes the prebuilt production Worker with a private, safely encoded secret file", async () => {
  await import("../../scripts/deploy.ts");
  expect(command).toHaveBeenNthCalledWith(
    1,
    ["exec", "node", "scripts/build.ts"],
    "/repo",
    expect.objectContaining({
      CLOUDFLARE_API_TOKEN: undefined,
      CF_TURNSTILE_SECRET: undefined,
      CF_DB_ID: values.CF_DB_ID,
    }),
  );
  expect(command).toHaveBeenNthCalledWith(
    2,
    [
      "exec",
      "cf",
      "deploy",
      "--prebuilt",
      "--mode",
      "production",
      "--dry-run",
      "--provision=false",
    ],
    "/repo/apps/00-home",
    expect.objectContaining({ CLOUDFLARE_API_TOKEN: undefined, CF_TURNSTILE_SECRET: undefined }),
  );
  expect(writeFile).toHaveBeenCalledWith(
    "/tmp/test-cf-secrets/secrets.json",
    JSON.stringify({ SECRET: values.CF_TURNSTILE_SECRET }),
    { mode: 0o600 },
  );
  expect(command).toHaveBeenNthCalledWith(
    3,
    [
      "exec",
      "cf",
      "deploy",
      "--prebuilt",
      "--mode",
      "production",
      "--provision=false",
      "--secrets-file",
      "/tmp/test-cf-secrets/secrets.json",
    ],
    "/repo/apps/00-home",
  );
  expect(rm).toHaveBeenCalledWith("/tmp/test-cf-secrets", { recursive: true, force: true });
});
it.each(Object.keys(values))(
  "rejects missing %s before creating files or uploading",
  async (key) => {
    vi.stubEnv(key, undefined);
    await expect(deploy()).rejects.toThrow(key);
    expect(mkdtemp).not.toHaveBeenCalled();
    expect(command).not.toHaveBeenCalled();
  },
);
it.each([
  ["CF_DB_ID", "DB-cf-playground"],
  ["CF_NOTICE_NAMESPACE_ID", "cf-learn-notice"],
  ["CF_ACCESS_ISSUER", "http://example.cloudflareaccess.com"],
  ["CF_TURNSTILE_SITEKEY", "1x00000000000000000000AA"],
  ["CF_TURNSTILE_SECRET", "1x0000000000000000000000000000000AA"],
  ["CLOUDFLARE_API_TOKEN", " "],
])("rejects invalid production setting %s without leaking values", async (key, value) => {
  vi.stubEnv(key, value);
  await expect(deploy()).rejects.toThrow(`デプロイ設定が不正です: ${key}`);
  expect(command).not.toHaveBeenCalled();
});
it("removes the temporary secret after an upload failure", async () => {
  command
    .mockResolvedValueOnce()
    .mockResolvedValueOnce()
    .mockRejectedValueOnce(new Error("upload failed"));
  await expect(deploy()).rejects.toThrow("upload failed");
  expect(rm).toHaveBeenCalledWith("/tmp/test-cf-secrets", { recursive: true, force: true });
});
it("removes the temporary directory after a secret write failure", async () => {
  vi.mocked(writeFile).mockRejectedValueOnce(new Error("disk failed"));
  await expect(deploy()).rejects.toThrow("disk failed");
  expect(command).toHaveBeenCalledTimes(2);
  expect(rm).toHaveBeenCalledWith("/tmp/test-cf-secrets", { recursive: true, force: true });
});
it.each([1, 2])(
  "stops without creating a secret or publishing when preparation step %s fails",
  async (step) => {
    if (step === 2) command.mockResolvedValueOnce();
    command.mockRejectedValueOnce(new Error("preparation failed"));
    await expect(deploy()).rejects.toThrow("preparation failed");
    expect(command).toHaveBeenCalledTimes(step);
    expect(mkdtemp).not.toHaveBeenCalled();
  },
);
