import type { Connect, Plugin } from "vite-plus";

// Viteが直接配信するpublicのテキストにも、本番の_headersと同じ文字コードを付ける。
export const textAssetCharset: Connect.NextHandleFunction = (request, response, next) => {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  if (pathname.endsWith(".txt")) response.setHeader("Content-Type", "text/plain; charset=utf-8");
  next();
};

export function utf8TextAssets() {
  return {
    name: "utf8-text-assets",
    configureServer({
      middlewares,
    }: {
      middlewares: { use: (middleware: Connect.NextHandleFunction) => unknown };
    }) {
      middlewares.use(textAssetCharset);
    },
  } satisfies Plugin;
}
