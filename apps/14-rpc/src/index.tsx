import { topicRequestPath } from "../../../packages/catalog/urls.ts";
import { Hono } from "hono";
import type { Env as PlaygroundEnv } from "../../00-home/src/env.d.ts";
import { configureApp, finish, page, textField } from "../../../packages/ui/server.tsx";
import { View } from "./view.tsx";
export type Env = Pick<PlaygroundEnv, "ASSETS" | "INTERNAL">;
const app = configureApp(new Hono<{ Bindings: Env }>({ getPath: topicRequestPath(14) }));
app.get("/", (c) =>
  page(c.req.raw, c.env.ASSETS, View, { title: "Service Bindings / RPC：内部呼び出し" }),
);
app.get("/api/http", async (c) => {
  const name = textField(c.req.query("name") ?? "学習者", 200);
  return c.env.INTERNAL.fetch(
    new Request(`https://internal/greet?name=${encodeURIComponent(name)}`),
  );
});
app.get("/api/rpc", async (c) =>
  c.json(await c.env.INTERNAL.greet(textField(c.req.query("name") ?? "学習者", 200))),
);
export default finish(app);
