export const initialSchema = titleInitial;
import { titleInitial } from "../../../packages/ui/initial.ts";
import { topicUrl } from "../../../packages/catalog/urls.ts";
import { useSignal } from "@preact/signals";
import { Layout, Output } from "../../../packages/ui/layout.tsx";
import { api } from "../../../packages/ui/client.tsx";
export function View({ initial }: { initial: { title: string } }) {
  const result = useSignal<unknown>({
    message: "ローカルとエッジの違いはREADMEを参照してください。",
  });
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
      <p>生成時刻とレスポンスヘッダーをブラウザのNetworkタブで比較します。TTLは10秒です。</p>
      <button onClick={() => void show(api(topicUrl(6, "/api/time?cached=1")))}>
        キャッシュ有効
      </button>
      <button onClick={() => void show(api(topicUrl(6, "/api/time?cached=0")))}>
        キャッシュ無効
      </button>
      <button onClick={() => void show(api(topicUrl(6, "/api/purge"), "POST"))}>パージ</button>
      <Output value={result.value} />
    </Layout>
  );
}
