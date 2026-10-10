import { expect, it, vi } from "vitest";
vi.mock("cloudflare:workers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("cloudflare:workers")>()),
  cache: { purge: vi.fn<(...args: unknown[]) => unknown>() },
}));
import { cache } from "cloudflare:workers";
const purgeMock = vi.spyOn(cache, "purge");
import app from "../../apps/06-cache/src/index.tsx";
import { createExecutionContext } from "cloudflare:test";
it("purge success contract and rejected platform operation (controlled API response)", async () => {
  const assets = {
    fetch: vi.fn<(...args: unknown[]) => unknown>(),
    connect: vi.fn<(...args: unknown[]) => unknown>(),
  };
  const response = await app.fetch(
    new Request("https://cache.local/api/purge", { method: "POST" }),
    { ASSETS: assets },
    createExecutionContext(),
  );
  expect(await response.json()).toEqual({ purged: true });
  purgeMock.mockRejectedValueOnce(new Error("purge unavailable"));
  expect(
    (
      await app.fetch(
        new Request("https://cache.local/api/purge", { method: "POST" }),
        { ASSETS: assets },
        createExecutionContext(),
      )
    ).status,
  ).toBe(500);
});
