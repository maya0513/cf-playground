import { topicRequestPath } from "../../../packages/catalog/urls.ts";
import { Hono } from "hono";
import type { Env as PlaygroundEnv } from "../../00-home/src/env.d.ts";
import { configureApp, finish, page, fail, boundedBody } from "../../../packages/ui/server.tsx";
import { View } from "./view.tsx";
export type Env = Pick<PlaygroundEnv, "ASSETS" | "FILES">;
const app = configureApp(new Hono<{ Bindings: Env }>({ getPath: topicRequestPath(5) }));
app.get("/", (c) => page(c.req.raw, c.env.ASSETS, View, { title: "R2：ファイル置き場" }));
app.use("/api/files/:slot", async (c, next) => {
  if (!/^[0-9]$/.test(c.req.param("slot"))) fail(400, "INPUT", "スロットは0〜9です。");
  await next();
});
app.put("/api/files/:slot", async (c) => {
  const bytes = await boundedBody(c.req.raw, 256 * 1024);
  await c.env.FILES.put(c.req.param("slot"), bytes, {
    httpMetadata: { contentType: "application/octet-stream" },
  });
  return c.json({ slot: c.req.param("slot"), size: bytes.length });
});
app.get("/api/files/:slot", async (c) => {
  const object = await c.env.FILES.get(c.req.param("slot"));
  if (!object) fail(404, "NOT_FOUND", "ファイルがありません。");
  return new Response(object.body, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="slot-${c.req.param("slot")}.bin"`,
      ETag: object.httpEtag,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
});
app.delete("/api/files/:slot", async (c) => {
  if (!(await c.env.FILES.head(c.req.param("slot"))))
    fail(404, "NOT_FOUND", "ファイルがありません。");
  await c.env.FILES.delete(c.req.param("slot"));
  return c.json({ deleted: true });
});
export default finish(app);
