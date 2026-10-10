import { topicRequestPath } from "../../../packages/catalog/urls.ts";
import { Hono } from "hono";
import type { Env as PlaygroundEnv } from "../../00-home/src/env.d.ts";
import { configureApp, finish, page } from "../../../packages/ui/server.tsx";
import { View } from "./view.tsx";
export type Env = Pick<PlaygroundEnv, "ASSETS">;
const app = configureApp(new Hono<{ Bindings: Env }>({ getPath: topicRequestPath(2) }));
app.get("/", (c) => page(c.req.raw, c.env.ASSETS, View, { title: "Static Assets：配信の観察" }));
export default finish(app);
