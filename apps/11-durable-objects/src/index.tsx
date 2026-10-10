import { topicRequestPath } from "../../../packages/catalog/urls.ts";
import { Hono } from "hono";
import type { Env as PlaygroundEnv } from "../../00-home/src/env.d.ts";
import { DurableObject } from "cloudflare:workers";
import { configureApp, finish, page, fail, jsonInput } from "../../../packages/ui/server.tsx";
import { View } from "./view.tsx";
export type Env = Pick<PlaygroundEnv, "ASSETS" | "COUNTER">;
export class Counter extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS counter (id INTEGER PRIMARY KEY CHECK(id=1), value INTEGER NOT NULL)",
    );
    this.ctx.storage.sql.exec("INSERT OR IGNORE INTO counter VALUES(1,0)");
  }
  read() {
    return this.ctx.storage.sql
      .exec<{ value: number }>("SELECT value FROM counter WHERE id=1")
      .one().value;
  }
  add(delta: number) {
    if (delta !== 1 && delta !== -1) throw new Error("delta must be +1 or -1");
    return this.ctx.storage.sql
      .exec<{ value: number }>("UPDATE counter SET value=value+? WHERE id=1 RETURNING value", delta)
      .one().value;
  }
}
const app = configureApp(new Hono<{ Bindings: Env }>({ getPath: topicRequestPath(11) }));
app.get("/", async (c) =>
  page(c.req.raw, c.env.ASSETS, View, {
    title: "Durable Objects：共有カウンター",
    value: await c.env.COUNTER.getByName("shared").read(),
  }),
);
app.get("/api/counter", async (c) =>
  c.json({ value: await c.env.COUNTER.getByName("shared").read() }),
);
app.post("/api/counter", async (c) => {
  const { delta } = await jsonInput(c.req.raw);
  if (delta !== 1 && delta !== -1) fail(400, "INPUT", "+1か-1を指定してください。");
  return c.json({ value: await c.env.COUNTER.getByName("shared").add(delta) });
});
export default finish(app);
