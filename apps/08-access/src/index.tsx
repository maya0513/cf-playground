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
import { setCookie } from "hono/cookie";
import { authorize, identity } from "./auth.ts";
import { localToken } from "../local-fixture.ts";
import { View } from "./view.tsx";
export type Env = Pick<PlaygroundEnv, "ASSETS" | "MODE" | "ACCESS_ISSUER" | "ACCESS_AUDIENCE">;
const app = configureApp(new Hono<{ Bindings: Env }>({ getPath: topicRequestPath(8) }));
app.get("/", (c) =>
  page(c.req.raw, c.env.ASSETS, View, {
    title: "Access：保護ページ",
    token: c.env.MODE === "local" ? localToken : "",
  }),
);
app.post("/api/session", async (c) => {
  if (c.env.MODE !== "local") fail(404, "NOT_FOUND", "ローカル専用です。");
  const token = textField((await jsonInput(c.req.raw))["token"]);
  const me = await identity(token, c.env);
  setCookie(c, "CF_Authorization", token, {
    httpOnly: true,
    sameSite: "Strict",
    path: "/access/",
    maxAge: 3600,
  });
  return c.json(me);
});
app.get("/api/me", async (c) => c.json(await authorize(c.req.raw, c.env)));
app.get("/protected", async (c) => {
  const me = await authorize(c.req.raw, c.env);
  return c.html(
    `<!doctype html><html lang="ja"><meta charset="utf-8"><title>保護ページ</title><h1>保護ページ</h1><p>JWTを検証しました。</p><pre>${JSON.stringify(me).replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</pre><a href="/access/">戻る</a></html>`,
  );
});
export default finish(app);
