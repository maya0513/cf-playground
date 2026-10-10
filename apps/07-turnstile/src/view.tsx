export const initialSchema = titleInitial.extend({ sitekey: z.string() });
import { z } from "zod";
import { titleInitial } from "../../../packages/ui/initial.ts";
import { topicUrl } from "../../../packages/catalog/urls.ts";
import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import { Layout, Output } from "../../../packages/ui/layout.tsx";
import { api } from "../../../packages/ui/client.tsx";
export function View({ initial }: { initial: { title: string; sitekey: string } }) {
  const token = useSignal("");
  const message = useSignal("こんにちは");
  const result = useSignal<unknown>({ message: "ウィジェットの検証を待っています。" });
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    const element = z.instanceof(HTMLDivElement).parse(host.current);
    script.addEventListener(
      "load",
      () => {
        window.turnstile.render(element, {
          sitekey: initial.sitekey,
          action: "message",
          callback: (value) => {
            token.value = value;
          },
          "expired-callback": () => {
            token.value = "";
          },
          "error-callback": () => {
            token.value = "";
          },
        });
      },
      { once: true },
    );
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [initial.sitekey, token]);
  async function submit() {
    try {
      result.value = await api(topicUrl(7, "/api/submit"), "POST", {
        message: message.value,
        token: token.value,
      });
    } catch (error) {
      result.value = { error: String(error) };
    } finally {
      token.value = "";
      window.turnstile.reset();
    }
  }
  return (
    <Layout title={initial.title}>
      <p>localモードは公式の常時成功テストキーを使います。拒否キーへの切替はREADME参照。</p>
      <label>
        メッセージ
        <textarea
          value={message.value}
          onInput={(e) => {
            message.value = e.currentTarget.value;
          }}
        />
      </label>
      <div ref={host} />
      <button disabled={!token.value} onClick={() => void submit()}>
        検証して送信
      </button>
      <Output value={result.value} />
    </Layout>
  );
}
