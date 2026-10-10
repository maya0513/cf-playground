export const initialSchema = titleInitial.extend({ records: z.array(z.unknown()) });
import { z } from "zod";
import { titleInitial } from "../../../packages/ui/initial.ts";
import { topicUrl } from "../../../packages/catalog/urls.ts";
import { useSignal } from "@preact/signals";
import { Layout, Output } from "../../../packages/ui/layout.tsx";
import { api } from "../../../packages/ui/client.tsx";
export function View({ initial }: { initial: { title: string; records: unknown[] } }) {
  const result = useSignal<unknown>(initial.records);
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
      <p>毎時0分のCronに加え、手動実行を用意しています。</p>
      <button onClick={() => void show(api(topicUrl(9, "/api/run"), "POST"))}>手動実行</button>
      <button onClick={() => void show(api(topicUrl(9, "/api/history")))}>履歴更新</button>
      <Output value={result.value} />
    </Layout>
  );
}
