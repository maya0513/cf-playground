export const initialSchema = titleInitial.extend({ notice: z.unknown() });
import { z } from "zod";
import { titleInitial } from "../../../packages/ui/initial.ts";
import { topicUrl } from "../../../packages/catalog/urls.ts";
import { useSignal } from "@preact/signals";
import { Layout, Output } from "../../../packages/ui/layout.tsx";
import { api } from "../../../packages/ui/client.tsx";
export function View({ initial }: { initial: { title: string; notice: unknown } }) {
  const result = useSignal<unknown>(initial.notice);
  const show = (operation: Promise<unknown>) =>
    operation.then(
      (value) => {
        result.value = value;
        return undefined;
      },
      (error) => {
        result.value = { error: String(error) };
        return undefined;
      },
    );
  const text = useSignal("新しいお知らせ");
  const ttl = useSignal("60");
  return (
    <Layout title={initial.title}>
      <p>KVは結果整合性です。別拠点には更新が遅れて届く場合があります。</p>
      <label>
        お知らせ
        <textarea
          value={text.value}
          onInput={(e) => {
            text.value = e.currentTarget.value;
          }}
        />
      </label>
      <label>
        TTL（空欄は無期限）
        <input
          value={ttl.value}
          onInput={(e) => {
            ttl.value = e.currentTarget.value;
          }}
        />
      </label>
      <button
        onClick={() =>
          void show(
            api(topicUrl(4, "/api/notice"), "PUT", {
              text: text.value,
              ttl: ttl.value === "" ? null : Number(ttl.value),
            }),
          )
        }
      >
        保存
      </button>
      <button onClick={() => void show(api(topicUrl(4, "/api/notice")))}>読み直す</button>
      <Output value={result.value} />
    </Layout>
  );
}
