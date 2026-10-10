export const initialSchema = titleInitial;
import { titleInitial } from "../../../packages/ui/initial.ts";
import { topicUrl } from "../../../packages/catalog/urls.ts";
import { useSignal } from "@preact/signals";
import { Layout, Output } from "../../../packages/ui/layout.tsx";
import { api } from "../../../packages/ui/client.tsx";
export function View({ initial }: { initial: { title: string } }) {
  const result = useSignal<unknown>({ message: "GETとPOSTを比べてください。" });
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
      <p>認証ヘッダーやCookieは表示しません。</p>
      <button onClick={() => void show(api(topicUrl(1, "/api/request")))}>GETを観察</button>
      <button
        onClick={() => void show(api(topicUrl(1, "/api/request"), "POST", { hello: "Workers" }))}
      >
        POSTを観察
      </button>
      <Output value={result.value} />
    </Layout>
  );
}
