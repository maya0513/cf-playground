export const initialSchema = titleInitial;
import { titleInitial } from "../../../packages/ui/initial.ts";
import { topicUrl } from "../../../packages/catalog/urls.ts";
import { useSignal } from "@preact/signals";
import { Layout, Output } from "../../../packages/ui/layout.tsx";
export function View({ initial }: { initial: { title: string } }) {
  const result = useSignal<unknown>({ message: "HTMLはSSR、下の画像とテキストは静的配信です。" });
  async function inspect() {
    try {
      const response = await fetch(topicUrl(2, "/sample.txt"));
      result.value = {
        status: response.status,
        headers: Object.fromEntries(response.headers),
        body: await response.text(),
      };
    } catch (error) {
      result.value = { error: String(error) };
    }
  }
  return (
    <Layout title={initial.title}>
      <link rel="stylesheet" href={topicUrl(2, "/sample.css")} />
      <p class="asset-sample">静的CSSを適用した要素</p>
      <img src={topicUrl(2, "/sample.svg")} width="160" height="80" alt="静的配信のサンプル" />
      <p>
        <a href={topicUrl(2, "/sample.txt")}>テキストを開く</a>
      </p>
      <button onClick={() => void inspect()}>配信ヘッダーを見る</button>
      <Output value={result.value} />
    </Layout>
  );
}
