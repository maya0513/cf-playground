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
export type Env = Pick<PlaygroundEnv, "ASSETS" | "MODE" | "SITEKEY" | "SECRET">;
const app = configureApp(new Hono<{ Bindings: Env }>({ getPath: topicRequestPath(7) }));
app.get("/", (c) =>
  page(c.req.raw, c.env.ASSETS, View, {
    title: "Turnstile：検証付きフォーム",
    sitekey: c.env.SITEKEY,
  }),
);
app.post("/api/submit", async (c) => {
  const input = await jsonInput(c.req.raw);
  const message = textField(input["message"], 3000);
  const token = textField(input["token"], 2048);
  if (!c.env.SECRET) fail(401, "CONFIG", "Turnstileの設定が必要です。");
  let result: { success: boolean; hostname?: string; action?: string };
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: c.env.SECRET, response: token }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("siteverify unavailable");
    result = await response.json();
  } catch {
    fail(502, "VERIFY_UNAVAILABLE", "検証サービスに接続できません。");
  }
  if (!result.success) fail(401, "VERIFY_REJECTED", "検証が拒否されました。再度お試しください。");
  if (
    c.env.MODE !== "local" &&
    (result.hostname !== new URL(c.req.url).hostname || result.action !== "message")
  )
    fail(401, "VERIFY_REJECTED", "検証対象が一致しません。");
  return c.json({ accepted: true, message });
});
export default finish(app);
