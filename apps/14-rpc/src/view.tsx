export const initialSchema = titleInitial;
import { titleInitial } from "../../../packages/ui/initial.ts";
import { topicUrl } from "../../../packages/catalog/urls.ts";
import { useSignal } from "@preact/signals";
import { Layout, Output } from "../../../packages/ui/layout.tsx";
import { api } from "../../../packages/ui/client.tsx";
export function View({ initial }: { initial: { title: string } }) {
  const result = useSignal<unknown>({ message: "同じ内部WorkerをHTTPとRPCで呼びます。" });
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
  const name = useSignal("学習者");
  return (
    <Layout title={initial.title}>
      <label>
        名前
        <input
          value={name.value}
          onInput={(e) => {
            name.value = e.currentTarget.value;
          }}
        />
      </label>
      <button
        onClick={() =>
          void show(api(topicUrl(14, "/api/http?name=") + encodeURIComponent(name.value)))
        }
      >
        HTTP呼び出し
      </button>
      <button
        onClick={() =>
          void show(api(topicUrl(14, "/api/rpc?name=") + encodeURIComponent(name.value)))
        }
      >
        RPC呼び出し
      </button>
      <Output value={result.value} />
    </Layout>
  );
}
