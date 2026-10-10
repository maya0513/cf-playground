export const initialSchema = titleInitial.extend({ jobs: z.array(z.unknown()) });
import { z } from "zod";
import { titleInitial } from "../../../packages/ui/initial.ts";
import { topicUrl } from "../../../packages/catalog/urls.ts";
import { useSignal } from "@preact/signals";
import { Layout, Output } from "../../../packages/ui/layout.tsx";
import { api } from "../../../packages/ui/client.tsx";
export function View({ initial }: { initial: { title: string; jobs: unknown[] } }) {
  const result = useSignal<unknown>(initial.jobs);
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
  const text = useSignal("hello Cloudflare");
  const id = useSignal("");
  return (
    <Layout title={initial.title}>
      <label>
        集計するテキスト
        <textarea
          value={text.value}
          onInput={(e) => {
            text.value = e.currentTarget.value;
          }}
        />
      </label>
      <button
        onClick={() => void show(api(topicUrl(10, "/api/jobs"), "POST", { text: text.value }))}
      >
        投入
      </button>
      <button onClick={() => void show(api(topicUrl(10, "/api/jobs")))}>状態更新</button>
      <label>
        再送するID
        <input
          value={id.value}
          onInput={(e) => {
            id.value = e.currentTarget.value;
          }}
        />
      </label>
      <button
        onClick={() =>
          void show(
            api(topicUrl(10, "/api/jobs/") + encodeURIComponent(id.value) + "/retry", "POST"),
          )
        }
      >
        同じジョブを再送
      </button>
      <Output value={result.value} />
    </Layout>
  );
}
