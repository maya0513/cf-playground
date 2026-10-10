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
export type Env = Pick<PlaygroundEnv, "ASSETS" | "DB">;
const app = configureApp(new Hono<{ Bindings: Env }>({ getPath: topicRequestPath(3) }));
export async function list(db: D1Database, query: string) {
  return (
    await db
      .prepare("SELECT id, title, url FROM bookmarks WHERE instr(title, ?) > 0 ORDER BY id DESC")
      .bind(query)
      .all()
  ).results;
}
app.get("/", async (c) =>
  page(c.req.raw, c.env.ASSETS, View, {
    title: "D1：ブックマーク",
    items: await list(c.env.DB, ""),
  }),
);
app.get("/api/bookmarks", async (c) => c.json(await list(c.env.DB, c.req.query("q") ?? "")));
function bookmark(input: Record<string, unknown>) {
  const title = textField(input["title"], 200);
  const url = textField(input["url"], 2048);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    fail(400, "INPUT", "URLが不正です。");
  }
  if (!["http:", "https:"].includes(parsed.protocol))
    fail(400, "INPUT", "http/httpsのURLを指定してください。");
  return { title, url };
}
app.post("/api/bookmarks", async (c) => {
  const { title, url } = bookmark(await jsonInput(c.req.raw));
  // INSERTの条件内で件数を確認するので、並行登録でも100件を超えない。
  const item = await c.env.DB.prepare(
    "INSERT INTO bookmarks(title,url) SELECT ?,? WHERE (SELECT count(*) FROM bookmarks)<100 RETURNING id,title,url",
  )
    .bind(title, url)
    .first();
  if (!item) fail(429, "LIMIT", "100件まで登録できます。");
  return c.json(item, 201);
});
app.put("/api/bookmarks/:id", async (c) => {
  const { title, url } = bookmark(await jsonInput(c.req.raw));
  const item = await c.env.DB.prepare(
    "UPDATE bookmarks SET title=?,url=? WHERE id=? RETURNING id,title,url",
  )
    .bind(title, url, c.req.param("id"))
    .first();
  if (!item) fail(404, "NOT_FOUND", "ブックマークがありません。");
  return c.json(item);
});
app.delete("/api/bookmarks/:id", async (c) => {
  const item = await c.env.DB.prepare("DELETE FROM bookmarks WHERE id=? RETURNING id")
    .bind(c.req.param("id"))
    .first();
  if (!item) fail(404, "NOT_FOUND", "ブックマークがありません。");
  return c.json(item);
});
export default finish(app);
