import { z } from "zod";
const inputSchema = z.record(z.string(), z.unknown());
import type { ComponentType } from "preact";
import { renderToStringAsync } from "preact-render-to-string";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

export function configureApp<E extends { ASSETS: Fetcher }>(
  app: Hono<{ Bindings: E }>,
): Hono<{ Bindings: E }> {
  app.use("*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    await next();
  });
  app.onError((error, c) => {
    if (error instanceof HTTPException) return error.getResponse();
    console.error(
      JSON.stringify({ event: "request_failed", path: c.req.path, message: error.message }),
    );
    return c.json({ error: { code: "INTERNAL", message: "処理に失敗しました。" } }, 500);
  });
  return app;
}

export function fail(
  status: 400 | 401 | 404 | 409 | 413 | 429 | 502,
  code: string,
  message: string,
): never {
  throw new HTTPException(status, {
    res: Response.json(
      { error: { code, message } },
      { status, headers: { "Cache-Control": "no-store" } },
    ),
  });
}

export async function page<T extends { title: string }>(
  request: Request,
  assets: Fetcher,
  View: ComponentType<{ initial: T }>,
  initial: T,
) {
  const shell = await assets.fetch(
    new Request(new URL(import.meta.env.BASE_URL + "shell.html", request.url)),
  );
  if (!shell.ok) throw new Error("SSR shell is missing");
  const html = (await shell.text())
    .replace(/<title>[^<]*<\/title>/, await renderToStringAsync(<title>{initial.title}</title>))
    .replace("<!--app-->", await renderToStringAsync(<View initial={initial} />))
    .replace(
      "<!--data-->",
      JSON.stringify(initial)
        .replaceAll("<", "\\u003c")
        .replaceAll("\u2028", "\\u2028")
        .replaceAll("\u2029", "\\u2029"),
    );
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export function finish<E extends { ASSETS: Fetcher }>(app: Hono<{ Bindings: E }>) {
  app.notFound(async (c) => {
    const path = app.getPath(c.req.raw, { env: c.env });
    if (path.startsWith("/api/"))
      return c.json({ error: { code: "NOT_FOUND", message: "APIがありません。" } }, 404);
    const asset = await c.env.ASSETS.fetch(c.req.raw);
    if (asset.status !== 404) return asset;
    if (/\.[^/]+$/.test(path)) return new Response("静的ファイルがありません。", { status: 404 });
    return c.html(
      '<!doctype html><html lang="ja"><meta charset="utf-8"><title>404</title><h1>ページがありません。</h1></html>',
      404,
    );
  });
  return app;
}

export async function jsonInput(request: Request): Promise<Record<string, unknown>> {
  // Content-Lengthだけを信用せず、実際の読み込みも4KiBで停止する。
  const text = await boundedBody(request, 4096);
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(text));
    if (typeof value !== "object" || value === null || Array.isArray(value))
      fail(400, "INPUT", "JSONオブジェクトを送信してください。");
    return inputSchema.parse(value);
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    return fail(400, "INPUT", "JSONが不正です。");
  }
}

export async function boundedBody(request: Request, limit: number) {
  if (!request.body) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const value of request.body) {
    const chunk = z.instanceof(Uint8Array).parse(value);
    size += chunk.byteLength;
    if (size > limit) fail(413, "LIMIT", "入力サイズの上限を超えました。");
    chunks.push(chunk);
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export function textField(value: unknown, max = 4096): string {
  if (typeof value !== "string" || !value.trim() || new TextEncoder().encode(value).length > max)
    fail(400, "INPUT", "空でない上限内の文字列を入力してください。");
  return value.trim();
}
