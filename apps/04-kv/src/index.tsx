import { topicRequestPath } from "../../../packages/catalog/urls.ts";
import { Hono } from "hono";
import type { Env as PlaygroundEnv } from "../../00-home/src/env.d.ts";
import {
  configureApp,
  finish,
  page,
  fail,
  jsonInput,
  textField,
} from "../../../packages/ui/server.tsx";
import { View } from "./view.tsx";
export type Env = Pick<PlaygroundEnv, "ASSETS" | "NOTICE">;
const app = configureApp(new Hono<{ Bindings: Env }>({ getPath: topicRequestPath(4) }));
export async function read(kv: KVNamespace) {
  return (await kv.get("notice", "json")) ?? { text: "お知らせはまだありません。", ttl: null };
}
app.get("/", async (c) =>
  page(c.req.raw, c.env.ASSETS, View, { title: "KV：お知らせ", notice: await read(c.env.NOTICE) }),
);
app.get("/api/notice", async (c) => c.json(await read(c.env.NOTICE)));
app.put("/api/notice", async (c) => {
  const input = await jsonInput(c.req.raw);
  const text = textField(input["text"]);
  const ttl = input["ttl"];
  if (ttl !== null && (!Number.isInteger(ttl) || Number(ttl) < 60 || Number(ttl) > 86400))
    fail(400, "INPUT", "TTLはnullまたは60〜86400秒です。");
  const notice = { text, ttl, writtenAt: new Date().toISOString() };
  await c.env.NOTICE.put(
    "notice",
    JSON.stringify(notice),
    ttl === null ? {} : { expirationTtl: Number(ttl) },
  );
  return c.json(notice);
});
export default finish(app);
