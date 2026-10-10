import { topicRequestPath } from "../../../packages/catalog/urls.ts";
import { Hono } from "hono";
import type { Env as PlaygroundEnv } from "../../00-home/src/env.d.ts";
import { configureApp, finish, page } from "../../../packages/ui/server.tsx";
import { View } from "./view.tsx";
export type Env = Pick<PlaygroundEnv, "ASSETS">;
const app = configureApp(new Hono<{ Bindings: Env }>({ getPath: topicRequestPath(1) }));
app.get("/", (c) => page(c.req.raw, c.env.ASSETS, View, { title: "Workers：HTTP観察" }));
app.all("/api/request", (c) =>
  c.json({
    method: c.req.method,
    url: c.req.url,
    headers: {
      accept: c.req.header("accept") ?? null,
      "content-type": c.req.header("content-type") ?? null,
      "user-agent": c.req.header("user-agent") ?? null,
    },
  }),
);
export default finish(app);
