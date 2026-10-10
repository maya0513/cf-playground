export const initialSchema = titleInitial.extend({ items: z.array(z.unknown()) });
import { z } from "zod";
import { titleInitial } from "../../../packages/ui/initial.ts";
import { topicUrl } from "../../../packages/catalog/urls.ts";
import { useSignal } from "@preact/signals";
import { Layout, Output } from "../../../packages/ui/layout.tsx";
import { api } from "../../../packages/ui/client.tsx";
export function View({ initial }: { initial: { title: string; items: unknown[] } }) {
  const result = useSignal<unknown>(initial.items);
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
  const title = useSignal("");
  const url = useSignal("https://example.com/");
  const id = useSignal("");
  const query = useSignal("");
  return (
    <Layout title={initial.title}>
      <label>
        タイトル
        <input
          value={title.value}
          onInput={(e) => {
            title.value = e.currentTarget.value;
          }}
        />
      </label>
      <label>
        URL
        <input
          value={url.value}
          onInput={(e) => {
            url.value = e.currentTarget.value;
          }}
        />
      </label>
      <button
        onClick={() =>
          void show(
            api(topicUrl(3, "/api/bookmarks"), "POST", { title: title.value, url: url.value }),
          )
        }
      >
        登録
      </button>
      <label>
        ID
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
            api(topicUrl(3, "/api/bookmarks/") + encodeURIComponent(id.value), "PUT", {
              title: title.value,
              url: url.value,
            }),
          )
        }
      >
        編集
      </button>
      <button
        onClick={() =>
          void show(api(topicUrl(3, "/api/bookmarks/") + encodeURIComponent(id.value), "DELETE"))
        }
      >
        削除
      </button>
      <label>
        検索
        <input
          value={query.value}
          onInput={(e) => {
            query.value = e.currentTarget.value;
          }}
        />
      </label>
      <button
        onClick={() =>
          void show(api(topicUrl(3, "/api/bookmarks?q=") + encodeURIComponent(query.value)))
        }
      >
        検索・一覧更新
      </button>
      <Output value={result.value} />
    </Layout>
  );
}
