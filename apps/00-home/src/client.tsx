import { mount } from "../../../packages/ui/client.tsx";
import "../../../packages/ui/style.css";
import { topicForPath } from "../../../packages/catalog/index.ts";
import { View, initialSchema } from "./view.tsx";
const clients = {
  "01-workers": () => import("../../01-workers/src/client.tsx"),
  "02-assets": () => import("../../02-assets/src/client.tsx"),
  "03-d1": () => import("../../03-d1/src/client.tsx"),
  "04-kv": () => import("../../04-kv/src/client.tsx"),
  "05-r2": () => import("../../05-r2/src/client.tsx"),
  "06-cache": () => import("../../06-cache/src/client.tsx"),
  "07-turnstile": () => import("../../07-turnstile/src/client.tsx"),
  "08-access": () => import("../../08-access/src/client.tsx"),
  "09-cron": () => import("../../09-cron/src/client.tsx"),
  "10-queues": () => import("../../10-queues/src/client.tsx"),
  "11-durable-objects": () => import("../../11-durable-objects/src/client.tsx"),
  "12-websockets": () => import("../../12-websockets/src/client.tsx"),
  "13-workflows": () => import("../../13-workflows/src/client.tsx"),
  "14-rpc": () => import("../../14-rpc/src/client.tsx"),
};
const topic = topicForPath(location.pathname);
if (topic) await clients[topic.slug]();
else mount(View, initialSchema);
