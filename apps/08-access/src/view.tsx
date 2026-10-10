export const initialSchema = titleInitial.extend({ token: z.string() });
import { z } from "zod";
import { titleInitial } from "../../../packages/ui/initial.ts";
import { topicUrl } from "../../../packages/catalog/urls.ts";
import { useSignal } from "@preact/signals";
import { Layout, Output } from "../../../packages/ui/layout.tsx";
import { api } from "../../../packages/ui/client.tsx";
export function View({ initial }: { initial: { title: string; token: string } }) {
  const result = useSignal<unknown>({ message: "まず未認証での拒否を確認できます。" });
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
  const token = useSignal(initial.token);
  return (
    <Layout title={initial.title}>
      <p>localモードのJWTは公開の学習fixtureです。実際のログインは公開後にAccessで確認します。</p>
      <label>
        ローカルJWT
        <textarea
          value={token.value}
          onInput={(e) => {
            token.value = e.currentTarget.value;
          }}
        />
      </label>
      <button
        onClick={() => void show(api(topicUrl(8, "/api/session"), "POST", { token: token.value }))}
      >
        ローカルセッション作成
      </button>
      <button onClick={() => void show(api(topicUrl(8, "/api/me")))}>本人情報</button>
      <p>
        <a href={topicUrl(8, "/protected")}>保護ページへ</a>
      </p>
      <Output value={result.value} />
    </Layout>
  );
}
