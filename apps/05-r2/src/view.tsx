export const initialSchema = titleInitial;
import { titleInitial } from "../../../packages/ui/initial.ts";
import { topicUrl } from "../../../packages/catalog/urls.ts";
import { useSignal } from "@preact/signals";
import { Layout, Output } from "../../../packages/ui/layout.tsx";
import { api } from "../../../packages/ui/client.tsx";
export function View({ initial }: { initial: { title: string } }) {
  const slot = useSignal("0");
  const text = useSignal("R2に保存するテキスト");
  const result = useSignal<unknown>({ message: "0〜9のスロット、各256KiBまでです。" });
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
  async function save() {
    const response = await fetch(topicUrl(5, "/api/files/") + slot.value, {
      method: "PUT",
      body: text.value,
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }
  return (
    <Layout title={initial.title}>
      <label>
        スロット
        <input
          type="number"
          min="0"
          max="9"
          value={slot.value}
          onInput={(e) => {
            slot.value = e.currentTarget.value;
          }}
        />
      </label>
      <label>
        保存するテキスト
        <textarea
          value={text.value}
          onInput={(e) => {
            text.value = e.currentTarget.value;
          }}
        />
      </label>
      <button onClick={() => void show(save())}>保存</button>
      <a href={topicUrl(5, "/api/files/") + slot.value}>ダウンロード</a>
      <button onClick={() => void show(api(topicUrl(5, "/api/files/") + slot.value, "DELETE"))}>
        削除
      </button>
      <Output value={result.value} />
    </Layout>
  );
}
