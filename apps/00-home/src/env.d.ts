import type { InferEnv, UnwrapConfig } from "cf/config";
import type config from "../cloudflare.config.ts";
import type { Counter } from "../../11-durable-objects/src/index.tsx";
import type { ChatRoom } from "../../12-websockets/src/index.tsx";
import type { Internal } from "../../14-internal/src/index.ts";
export type Env = Omit<
  InferEnv<UnwrapConfig<typeof config>["worker"]>,
  "COUNTER" | "ROOMS" | "ORDERS" | "INTERNAL"
> & {
  COUNTER: DurableObjectNamespace<Counter>;
  ROOMS: DurableObjectNamespace<ChatRoom>;
  ORDERS: Workflow<{ item: string }>;
  INTERNAL: Service<Internal>;
};
