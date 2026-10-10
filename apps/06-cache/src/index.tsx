import { topicRequestPath } from "../../../packages/catalog/urls.ts";
import { Hono } from "hono";
import type { Env as PlaygroundEnv } from "../../00-home/src/env.d.ts";
import { cache } from "cloudflare:workers";
import { configureApp, finish, page, fail } from "../../../packages/ui/server.tsx";
import { View } from "./view.tsx";
export type Env = Pick<PlaygroundEnv, "ASSETS">;
const app = configureApp(new Hono<{ Bindings: Env }>({ getPath: topicRequestPath(6) }));
app.get("/", (c) => page(c.req.raw, c.env.ASSETS, View, { title: "Workers Cache：時刻API" }));
app.get("/api/time", (c) => {
  const cached = c.req.query("cached") === "1";
  c.header("Cache-Control", cached ? "public, max-age=0, s-maxage=10" : "no-store");
  c.header("Cache-Tag", "clock");
  return c.json({ generatedAt: new Date().toISOString(), cached, ttl: cached ? 10 : 0 });
});
app.post("/api/purge", async (c) => {
  await purge(cache);
  return c.json({ purged: true });
});
export async function purge(context: Pick<CacheContext, "purge"> | undefined) {
  if (!context || typeof context.purge !== "function")
    fail(
      502,
      "LOCAL_UNSUPPORTED",
      "このローカルランタイムではWorkers Cacheのパージは未対応です。公開後に確認してください。",
    );
  await context.purge({ tags: ["clock"] });
}
export default finish(app);
