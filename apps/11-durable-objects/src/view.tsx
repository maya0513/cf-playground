export const initialSchema = titleInitial.extend({ value: z.number() });
import { z } from "zod";
import { titleInitial } from "../../../packages/ui/initial.ts";
import { topicUrl } from "../../../packages/catalog/urls.ts";
import { useSignal } from "@preact/signals";
import { Layout, Output } from "../../../packages/ui/layout.tsx";
import { api } from "../../../packages/ui/client.tsx";
export function View({ initial }: { initial: { title: string; value: number } }) {
  const result = useSignal<unknown>({ value: initial.value });
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

  return (
    <Layout title={initial.title}>
      <p>別タブからも操作し、同じDOのカウンターが更新されることを確認します。</p>
      <button onClick={() => void show(api(topicUrl(11, "/api/counter"), "POST", { delta: 1 }))}>
        +1
      </button>
      <button onClick={() => void show(api(topicUrl(11, "/api/counter"), "POST", { delta: -1 }))}>
        -1
      </button>
      <button onClick={() => void show(api(topicUrl(11, "/api/counter")))}>読み直す</button>
      <Output value={result.value} />
    </Layout>
  );
}
