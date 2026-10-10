import { stringId } from "../json.ts";
import { sequential } from "../../packages/catalog/sequential.ts";
import { beforeAll, expect, it, vi } from "vitest";
import { env, createExecutionContext, introspectWorkflowInstance } from "cloudflare:test";
import app from "../../apps/13-workflows/src/index.tsx";
const bindings = () => ({
  ...env,
  ASSETS: {
    fetch: vi.fn<(...args: unknown[]) => unknown>(),
    connect: vi.fn<(...args: unknown[]) => unknown>(),
  },
});
async function request(path: string, method = "GET", body?: unknown) {
  return app.fetch(
    new Request("https://orders.local" + path, {
      method,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    bindings(),
    createExecutionContext(),
  );
}
beforeAll(async () => {
  await env.DB.exec(
    "CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,item TEXT,should_fail INTEGER,stage TEXT);",
  );
});
it("runs real durable steps, retries failures, releases and restarts", async () => {
  await sequential([false, true], async (failure) => {
    const id = crypto.randomUUID();
    await using probe = await introspectWorkflowInstance(env.ORDERS, id);
    await probe.modify(async (m) => {
      await m.disableSleeps();
      await m.disableRetryDelays();
    });
    await env.DB.prepare("INSERT INTO orders VALUES(?,'book',?,'pending')")
      .bind(id, Number(failure))
      .run();
    await env.ORDERS.create({ id, params: { item: "book" } });
    await probe.waitForStatus(failure ? "errored" : "complete");
    const actions: number[] = [];
    if (failure) {
      actions.push((await request(`/api/orders/${id}/release`, "POST")).status);
      actions.push((await request(`/api/orders/${id}/restart`, "POST")).status);
      await probe.waitForStatus("complete");
    }
    expect(actions).toEqual(failure ? [200, 200] : []);
    expect(await probe.getOutput()).toEqual({ item: "book", status: "complete" });
    expect((await request(`/api/orders/${id}`)).status).toBe(200);
  });
  const missing = crypto.randomUUID();
  await using probe = await introspectWorkflowInstance(env.ORDERS, missing);
  await probe.modify(async (m) => {
    await m.disableSleeps();
    await m.disableRetryDelays();
  });
  await env.ORDERS.create({ id: missing, params: { item: "missing" } });
  await probe.waitForStatus("errored");
});
it("API creates, pauses, resumes, validates, caps and denies missing orders", async () => {
  const response = await request("/api/orders", "POST", { item: "book", fail: false });
  expect(response.status).toBe(202);
  const { id } = stringId.parse(await response.json());
  expect((await request(`/api/orders/${id}/pause`, "POST")).status).toBe(200);
  expect((await request(`/api/orders/${id}/resume`, "POST")).status).toBe(200);
  expect((await request(`/api/orders/${id}/invalid`, "POST")).status).toBe(400);
  expect((await request("/api/orders/missing")).status).toBe(404);
  expect((await request("/api/orders/missing/restart", "POST")).status).toBe(404);
  expect((await request("/api/orders", "POST", { item: "book", fail: "yes" })).status).toBe(400);
  await env.DB.exec("DELETE FROM orders");
  await env.DB.batch(
    Array.from({ length: 100 }, (_, i) =>
      env.DB.prepare("INSERT INTO orders VALUES(?,'x',0,'pending')").bind(String(i)),
    ),
  );
  expect((await request("/api/orders", "POST", { item: "over", fail: false })).status).toBe(429);
  await (await env.ORDERS.get(id)).terminate();
});
