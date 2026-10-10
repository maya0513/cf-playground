import { topicRequestPath } from "../../../packages/catalog/urls.ts";
import { Hono } from "hono";
import { sequential } from "../../../packages/catalog/sequential.ts";
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
export type Env = Pick<PlaygroundEnv, "ASSETS" | "DB" | "JOBS">;
const app = configureApp(new Hono<{ Bindings: Env }>({ getPath: topicRequestPath(10) }));
export async function jobs(db: D1Database) {
  return (
    await db
      .prepare("SELECT id,text,state,characters,words FROM jobs ORDER BY created_at DESC")
      .all()
  ).results;
}
app.get("/", async (c) =>
  page(c.req.raw, c.env.ASSETS, View, {
    title: "Queues：テキスト集計",
    jobs: await jobs(c.env.DB),
  }),
);
app.get("/api/jobs", async (c) => c.json(await jobs(c.env.DB)));
app.post("/api/jobs", async (c) => {
  const text = textField((await jsonInput(c.req.raw))["text"], 3000);
  const id = crypto.randomUUID();
  // 送信前に保存。送信失敗時も履歴に残し、ユーザーが同じIDで再送できる。
  const inserted = await c.env.DB.prepare(
    "INSERT INTO jobs(id,text,state,created_at) SELECT ?,?,'pending',? WHERE (SELECT count(*) FROM jobs)<100 RETURNING id",
  )
    .bind(id, text, Date.now())
    .first();
  if (!inserted) fail(429, "LIMIT", "履歴は100件までです。");
  await c.env.JOBS.send({ id, text });
  return c.json({ id }, 202);
});
app.post("/api/jobs/:id/retry", async (c) => {
  const job = await c.env.DB.prepare("SELECT id,text FROM jobs WHERE id=?")
    .bind(c.req.param("id"))
    .first<{ id: string; text: string }>();
  if (!job) fail(404, "NOT_FOUND", "ジョブがありません。");
  await c.env.JOBS.send(job);
  return c.json({ id: job.id }, 202);
});
const handler = finish(app);
export default {
  fetch: handler.fetch,
  async queue(this: void, batch: MessageBatch<{ id: string; text: string }>, env: Env) {
    await sequential(batch.messages, async (message) => {
      try {
        const { id, text } = message.body;
        // 同じメッセージの再配信でも、完了済みの結果を書き換えない。
        await env.DB.prepare(
          "UPDATE jobs SET state='done',characters=?,words=? WHERE id=? AND state='pending'",
        )
          .bind(Array.from(text).length, text.trim().split(/\s+/u).length, id)
          .run();
        message.ack();
      } catch {
        message.retry();
      }
    });
  },
} satisfies ExportedHandler<Env, { id: string; text: string }>;
