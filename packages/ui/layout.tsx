import type { ComponentChildren } from "preact";

export function Layout({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <>
      <header>
        <a href="/">Cloudflare 学習帳</a>
      </header>
      <main>
        <h1>{title}</h1>
        {children}
      </main>
      <footer>共有デモデータのみを入力してください。</footer>
    </>
  );
}

export function Output({ value }: { value: unknown }) {
  return <pre aria-live="polite">{JSON.stringify(value, null, 2)}</pre>;
}
