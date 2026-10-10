/// <reference types="@cloudflare/vitest-plugin/types" />
import type { Counter } from "../../apps/11-durable-objects/src/index.tsx";

import type { ChatRoom } from "../../apps/12-websockets/src/index.tsx";
declare global {
  namespace Cloudflare {
    interface Env {
      NOTICE: KVNamespace;
      HISTORY: KVNamespace;
      DB: D1Database;
      FILES: R2Bucket;
      JOBS: Queue<{ id: string; text: string }>;
      COUNTER: DurableObjectNamespace<Counter>;
      ROOMS: DurableObjectNamespace<ChatRoom>;
      ORDERS: Workflow<{ item: string }>;
    }
  }
}
