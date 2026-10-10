import { topicRequestPath } from "../../../packages/catalog/urls.ts";
import { Hono } from "hono";
import type { Env as PlaygroundEnv } from "../../00-home/src/env.d.ts";
import { DurableObject } from "cloudflare:workers";
import { configureApp, finish, page, fail } from "../../../packages/ui/server.tsx";
import { View } from "./view.tsx";
export type Env = Pick<PlaygroundEnv, "ASSETS" | "ROOMS">;
export class ChatRoom extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL)",
    );
  }
  history() {
    return this.ctx.storage.sql
      .exec<{ id: number; text: string }>(
        "SELECT id,text FROM (SELECT id,text FROM messages ORDER BY id DESC LIMIT 20) ORDER BY id",
      )
      .toArray();
  }
  override fetch(request: Request) {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket")
      return new Response("WebSocket接続が必要です。", { status: 426 });
    if (this.ctx.getWebSockets().length >= 20)
      return new Response("接続数の上限です。", { status: 429 });
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ joinedAt: Date.now() });
    server.send(JSON.stringify({ type: "history", messages: this.history() }));
    return new Response(null, { status: 101, webSocket: client });
  }
  override webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string" || !message.trim() || Array.from(message).length > 500) {
      socket.send(
        JSON.stringify({ type: "error", message: "1〜500文字のテキストを送ってください。" }),
      );
      return;
    }
    this.ctx.storage.sql.exec("INSERT INTO messages(text) VALUES(?)", message);
    this.ctx.storage.sql.exec(
      "DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY id DESC LIMIT 20)",
    );
    const event = JSON.stringify({ type: "history", messages: this.history() });
    for (const peer of this.ctx.getWebSockets()) {
      try {
        peer.send(event);
      } catch {
        peer.close(1011, "送信失敗");
      }
    }
  }
  override webSocketClose(socket: WebSocket, code: number, reason: string) {
    socket.close(code, reason);
  }
  override webSocketError(socket: WebSocket) {
    socket.close(1011, "接続エラー");
  }
}
const app = configureApp(new Hono<{ Bindings: Env }>({ getPath: topicRequestPath(12) }));
app.get("/", (c) => page(c.req.raw, c.env.ASSETS, View, { title: "WebSockets：部屋別チャット" }));
app.get("/api/rooms/:room/ws", (c) => {
  const room = c.req.param("room");
  if (!["1", "2", "3"].includes(room)) fail(400, "INPUT", "部屋は1〜3です。");
  return c.env.ROOMS.getByName(room).fetch(c.req.raw);
});
export default finish(app);
