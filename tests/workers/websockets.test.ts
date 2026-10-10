import { required } from "../assert.ts";
import { z } from "zod";
const chatFrame = z.object({ messages: z.array(z.object({ text: z.string() })) });
const errorFrame = z.object({ type: z.string() });
import { sequential } from "../../packages/catalog/sequential.ts";
import { expect, it, vi } from "vitest";
import {
  env,
  createExecutionContext,
  runInDurableObject,
  evictDurableObject,
} from "cloudflare:test";
import app from "../../apps/12-websockets/src/index.tsx";
function next(socket: WebSocket) {
  return new Promise<string>((resolve) =>
    socket.addEventListener("message", (event) => resolve(String(event.data)), { once: true }),
  );
}
async function connect(room = "1") {
  const response = await app.fetch(
    new Request(`https://chat.local/api/rooms/${room}/ws`, { headers: { Upgrade: "websocket" } }),
    {
      ...env,
      ASSETS: {
        fetch: vi.fn<(...args: unknown[]) => unknown>(),
        connect: vi.fn<(...args: unknown[]) => unknown>(),
      },
    },
    createExecutionContext(),
  );
  const socket = required(response.webSocket);
  const received = next(socket);
  socket.accept();
  await received;
  return socket;
}
it("broadcast, history cap, independent rooms, hibernation and reconnect; closes every connection", async () => {
  const sockets: WebSocket[] = [];
  try {
    const a = await connect();
    const b = await connect();
    const other = await connect("2");
    sockets.push(a, b, other);
    let received = next(b);
    a.send("hello");
    expect(required(chatFrame.parse(JSON.parse(await received)).messages.at(-1)).text).toBe(
      "hello",
    );
    await evictDurableObject(env.ROOMS.getByName("1"));
    received = next(b);
    a.send("after hibernation");
    expect(required(chatFrame.parse(JSON.parse(await received)).messages.at(-1)).text).toBe(
      "after hibernation",
    );
    await sequential(
      Array.from({ length: 21 }, (_, i) => i),
      async (i) => {
        received = next(b);
        a.send(String(i));
        await received;
      },
    );
    const history = await env.ROOMS.getByName("1").history();
    expect(history).toHaveLength(20);
    expect(await env.ROOMS.getByName("2").history()).toEqual([]);
    await sequential(["", "x".repeat(501), new ArrayBuffer(4)], async (invalid) => {
      received = next(a);
      a.send(invalid);
      expect(errorFrame.parse(JSON.parse(await received)).type).toBe("error");
    });
    a.close(1000, "done");
    const reconnected = await connect();
    sockets.push(reconnected);
    expect(await env.ROOMS.getByName("1").history()).toHaveLength(20);
    await runInDurableObject(env.ROOMS.getByName("1"), (instance, state) => {
      const close = vi.fn<(...args: unknown[]) => unknown>();
      const socket = new WebSocketPair()[0];
      vi.spyOn(socket, "send").mockImplementation(() => {
        throw new Error("disconnected");
      });
      vi.spyOn(socket, "close").mockImplementation(close);
      const spy = vi.spyOn(state, "getWebSockets").mockReturnValue([socket]);
      instance.webSocketMessage(socket, "persist then broadcast");
      expect(close).toHaveBeenCalledWith(1011, "送信失敗");
      spy.mockRestore();
      instance.webSocketClose(socket, 1000, "bye");
      instance.webSocketError(socket);
      expect(close).toHaveBeenCalledWith(1011, "接続エラー");
    });
  } finally {
    for (const socket of sockets) socket.close(1000, "cleanup");
  }
});
it("validates room, upgrade and connection cap", async () => {
  const bindings = {
    ...env,
    ASSETS: {
      fetch: vi.fn<(...args: unknown[]) => unknown>(),
      connect: vi.fn<(...args: unknown[]) => unknown>(),
    },
  };
  expect(
    (
      await app.fetch(
        new Request("https://chat.local/api/rooms/4/ws"),
        bindings,
        createExecutionContext(),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await app.fetch(
        new Request("https://chat.local/api/rooms/3/ws"),
        bindings,
        createExecutionContext(),
      )
    ).status,
  ).toBe(426);
  const sockets: WebSocket[] = [];
  try {
    await sequential(Array.from({ length: 20 }), async () => {
      sockets.push(await connect("3"));
    });
    expect(
      (
        await app.fetch(
          new Request("https://chat.local/api/rooms/3/ws", { headers: { Upgrade: "WebSocket" } }),
          bindings,
          createExecutionContext(),
        )
      ).status,
    ).toBe(429);
  } finally {
    for (const socket of sockets) socket.close(1000, "cleanup");
  }
});
