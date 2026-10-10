export const initialSchema = titleInitial;
import { titleInitial } from "../../../packages/ui/initial.ts";
import { topicUrl } from "../../../packages/catalog/urls.ts";
import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import { Layout, Output } from "../../../packages/ui/layout.tsx";
export function View({ initial }: { initial: { title: string } }) {
  const room = useSignal("1");
  const text = useSignal("こんにちは");
  const result = useSignal<unknown>({ state: "未接続" });
  const socket = useRef<WebSocket | null>(null);
  useEffect(
    () => () => {
      socket.current?.close();
    },
    [],
  );
  function connect() {
    socket.current?.close();
    const ws = new WebSocket(
      `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}${topicUrl(12, `/api/rooms/${room.value}/ws`)}`,
    );
    socket.current = ws;
    ws.addEventListener("open", () => {
      result.value = { state: "接続済み" };
    });
    ws.addEventListener("message", (event) => {
      result.value = JSON.parse(String(event.data));
    });
    ws.addEventListener("close", () => {
      result.value = { state: "切断済み" };
    });
    ws.addEventListener("error", () => {
      result.value = { state: "接続エラー" };
    });
  }
  function send() {
    if (socket.current?.readyState !== WebSocket.OPEN) {
      result.value = { state: "先に接続してください。" };
      return;
    }
    socket.current.send(text.value);
  }
  return (
    <Layout title={initial.title}>
      <label>
        部屋
        <select
          value={room.value}
          onChange={(e) => {
            room.value = e.currentTarget.value;
          }}
        >
          <option>1</option>
          <option>2</option>
          <option>3</option>
        </select>
      </label>
      <button onClick={connect}>接続・再接続</button>
      <button onClick={() => socket.current?.close()}>切断</button>
      <label>
        メッセージ
        <textarea
          value={text.value}
          onInput={(e) => {
            text.value = e.currentTarget.value;
          }}
        />
      </label>
      <button onClick={send}>送信</button>
      <Output value={result.value} />
    </Layout>
  );
}
