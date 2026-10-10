import { Hono } from "hono";
import type { Env } from "./env.d.ts";
import { configureApp, finish, page } from "../../../packages/ui/server.tsx";
import { canonicalTopicUrl } from "../../../packages/catalog/routing.ts";
import { topicForPath } from "../../../packages/catalog/index.ts";
import { View } from "./view.tsx";
import topic1 from "../../01-workers/src/index.tsx";
import topic2 from "../../02-assets/src/index.tsx";
import topic3 from "../../03-d1/src/index.tsx";
import topic4 from "../../04-kv/src/index.tsx";
import topic5 from "../../05-r2/src/index.tsx";
import topic6 from "../../06-cache/src/index.tsx";
import topic7 from "../../07-turnstile/src/index.tsx";
import topic8 from "../../08-access/src/index.tsx";
import topic9 from "../../09-cron/src/index.tsx";
import topic10 from "../../10-queues/src/index.tsx";
import topic11 from "../../11-durable-objects/src/index.tsx";
import topic12 from "../../12-websockets/src/index.tsx";
import topic13 from "../../13-workflows/src/index.tsx";
import topic14 from "../../14-rpc/src/index.tsx";

export { Counter } from "../../11-durable-objects/src/index.tsx";
export { ChatRoom } from "../../12-websockets/src/index.tsx";
export { OrderWorkflow } from "../../13-workflows/src/index.tsx";
export { Internal } from "../../14-internal/src/index.ts";
export type { Env } from "./env.d.ts";
const handlers = {
  "01-workers": topic1,
  "02-assets": topic2,
  "03-d1": topic3,
  "04-kv": topic4,
  "05-r2": topic5,
  "06-cache": topic6,
  "07-turnstile": topic7,
  "08-access": topic8,
  "09-cron": topic9,
  "10-queues": topic10,
  "11-durable-objects": topic11,
  "12-websockets": topic12,
  "13-workflows": topic13,
  "14-rpc": topic14,
};
const app = configureApp(new Hono<{ Bindings: Pick<Env, "ASSETS"> }>());
app.get("/", (c) => page(c.req.raw, c.env.ASSETS, View, { title: "学習ホーム" }));
const home = finish(app);
export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const redirect = canonicalTopicUrl(request.url);
    if (redirect) return Response.redirect(redirect, 308);
    const topic = topicForPath(new URL(request.url).pathname);
    return (topic ? handlers[topic.slug] : home).fetch(request, env, ctx);
  },
  scheduled: topic9.scheduled,
  queue: topic10.queue,
} satisfies ExportedHandler<Env, { id: string; text: string }>;
