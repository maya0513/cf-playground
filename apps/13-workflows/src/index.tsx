import { topicRequestPath } from "../../../packages/catalog/urls.ts";
import { Hono } from "hono";
import type { Env as PlaygroundEnv } from "../../00-home/src/env.d.ts";
import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import {
  configureApp,
  finish,
  page,
  fail,
  jsonInput,
  textField,
} from "../../../packages/ui/server.tsx";
import { View } from "./view.tsx";
export type Env = Pick<PlaygroundEnv, "ASSETS" | "DB" | "ORDERS">;
export class OrderWorkflow extends WorkflowEntrypoint<Env, { item: string }> {
  override async run(event: WorkflowEvent<{ item: string }>, step: WorkflowStep) {
    const item = await step.do("注文確認", async () => event.payload.item);
    await step.sleep("処理待ち", "2 seconds");
    await step.do(
      "発送",
      { retries: { limit: 2, delay: "1 second", backoff: "constant" } },
      async () => {
        const order = await this.env.DB.prepare("SELECT should_fail FROM orders WHERE id=?")
          .bind(event.instanceId)
          .first<{ should_fail: number }>();
        if (!order || order.should_fail === 1)
          throw new Error("意図した発送失敗。解除して再実行してください。");
        await this.env.DB.prepare("UPDATE orders SET stage='shipped' WHERE id=?")
          .bind(event.instanceId)
          .run();
        return "発送しました";
      },
    );
    return { item, status: "complete" };
  }
}
const app = configureApp(new Hono<{ Bindings: Env }>({ getPath: topicRequestPath(13) }));
app.get("/", (c) => page(c.req.raw, c.env.ASSETS, View, { title: "Workflows：模擬注文" }));
app.post("/api/orders", async (c) => {
  const input = await jsonInput(c.req.raw);
  const item = textField(input["item"], 200);
  if (typeof input["fail"] !== "boolean") fail(400, "INPUT", "failはbooleanです。");
  const id = crypto.randomUUID();
  const inserted = await c.env.DB.prepare(
    "INSERT INTO orders(id,item,should_fail,stage) SELECT ?,?,?,'pending' WHERE (SELECT count(*) FROM orders)<100 RETURNING id",
  )
    .bind(id, item, Number(input["fail"]))
    .first();
  if (!inserted) fail(429, "LIMIT", "注文は100件までです。");
  await c.env.ORDERS.create({ id, params: { item } });
  return c.json({ id }, 202);
});
app.get("/api/orders/:id", async (c) => {
  if (!(await c.env.DB.prepare("SELECT id FROM orders WHERE id=?").bind(c.req.param("id")).first()))
    fail(404, "NOT_FOUND", "注文がありません。");
  return c.json(await (await c.env.ORDERS.get(c.req.param("id"))).status());
});
app.post("/api/orders/:id/:action", async (c) => {
  const id = c.req.param("id");
  if (!(await c.env.DB.prepare("SELECT id FROM orders WHERE id=?").bind(id).first()))
    fail(404, "NOT_FOUND", "注文がありません。");
  const instance = await c.env.ORDERS.get(id);
  switch (c.req.param("action")) {
    case "pause":
      await instance.pause();
      break;
    case "resume":
      await instance.resume();
      break;
    case "release":
      await c.env.DB.prepare("UPDATE orders SET should_fail=0 WHERE id=?").bind(id).run();
      break;
    case "restart":
      await instance.restart();
      break;
    default:
      fail(400, "INPUT", "pause/resume/release/restartを指定してください。");
  }
  return c.json({ id, action: c.req.param("action") });
});
export default finish(app);
