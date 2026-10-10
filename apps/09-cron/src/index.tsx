import { topicRequestPath } from "../../../packages/catalog/urls.ts";
import { Hono } from "hono";
import type { Env as PlaygroundEnv } from "../../00-home/src/env.d.ts";
import { configureApp, finish, page } from "../../../packages/ui/server.tsx";
import { View } from "./view.tsx";
export type Env = Pick<PlaygroundEnv, "ASSETS" | "HISTORY">;
const app = configureApp(new Hono<{ Bindings: Env }>({ getPath: topicRequestPath(9) }));
export async function history(kv: KVNamespace): Promise<{ at: string; source: string }[]> {
  return (await kv.get("history", "json")) ?? [];
}
export async function run(env: Env, source: string, time: number) {
  const records = await history(env.HISTORY);
  records.unshift({ at: new Date(time).toISOString(), source });
  await env.HISTORY.put("history", JSON.stringify(records.slice(0, 100)));
  return records.slice(0, 100);
}
app.get("/", async (c) =>
  page(c.req.raw, c.env.ASSETS, View, {
    title: "Cron Triggers：実行履歴",
    records: await history(c.env.HISTORY),
  }),
);
app.get("/api/history", async (c) => c.json(await history(c.env.HISTORY)));
app.post("/api/run", async (c) => c.json(await run(c.env, "manual", Date.now())));
const handler = finish(app);
export default {
  fetch: handler.fetch,
  async scheduled(this: void, event: ScheduledController, env: Env) {
    await run(env, event.cron, event.scheduledTime);
  },
} satisfies ExportedHandler<Env>;
