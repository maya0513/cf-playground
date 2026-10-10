export const initialSchema = titleInitial;
import { titleInitial } from "../../../packages/ui/initial.ts";
import { topicUrl } from "../../../packages/catalog/urls.ts";
import { useSignal } from "@preact/signals";
import { Layout, Output } from "../../../packages/ui/layout.tsx";
import { api } from "../../../packages/ui/client.tsx";
export function View({ initial }: { initial: { title: string } }) {
  const result = useSignal<unknown>({ message: "注文作成後、IDを入力して状態を確認します。" });
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
  const item = useSignal("学習用の本");
  const failure = useSignal(true);
  const id = useSignal("");
  return (
    <Layout title={initial.title}>
      <label>
        品物
        <input
          value={item.value}
          onInput={(e) => {
            item.value = e.currentTarget.value;
          }}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={failure.value}
          onChange={(e) => {
            failure.value = e.currentTarget.checked;
          }}
        />
        発送を意図的に失敗させる
      </label>
      <button
        onClick={() =>
          void show(
            api(topicUrl(13, "/api/orders"), "POST", { item: item.value, fail: failure.value }),
          )
        }
      >
        注文作成
      </button>
      <label>
        注文ID
        <input
          value={id.value}
          onInput={(e) => {
            id.value = e.currentTarget.value;
          }}
        />
      </label>
      <button
        onClick={() => void show(api(topicUrl(13, "/api/orders/") + encodeURIComponent(id.value)))}
      >
        状態確認
      </button>
      {(["pause", "resume", "release", "restart"] as const).map((action) => (
        <button
          key={action}
          onClick={() =>
            void show(
              api(
                topicUrl(13, "/api/orders/") + encodeURIComponent(id.value) + "/" + action,
                "POST",
              ),
            )
          }
        >
          {action}
        </button>
      ))}
      <p>releaseは失敗条件の解除、restartは最初から再実行、resumeはpauseからの再開です。</p>
      <Output value={result.value} />
    </Layout>
  );
}
