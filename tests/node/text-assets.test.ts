// @vitest-environment node
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { expect, it, vi } from "vite-plus/test";
import type { Connect } from "vite-plus";
import { textAssetCharset, utf8TextAssets } from "../../packages/tooling/text-assets.ts";

it("registers the charset middleware before Vite serves public files", () => {
  const use = vi.fn<(middleware: Connect.NextHandleFunction) => void>();
  utf8TextAssets().configureServer({ middlewares: { use } });
  expect(use).toHaveBeenCalledWith(textAssetCharset);
});

it.each([
  ["/guides/01-workers.txt", "text/plain; charset=utf-8"],
  ["/guides/roadmap.txt?download=1", "text/plain; charset=utf-8"],
  ["/static-assets/sample.txt", "text/plain; charset=utf-8"],
  ["/static-assets/sample.css", undefined],
  ["/workers/api/request?file=note.txt", undefined],
  [undefined, undefined],
])("declares UTF-8 only for text asset paths: %s", (url, expected) => {
  const socket = new Socket();
  const request = new IncomingMessage(socket);
  request.url = url;
  const response = new ServerResponse(request);
  const next = vi.fn<() => void>();
  textAssetCharset(request, response, next);
  expect(response.getHeader("Content-Type")).toBe(expected);
  expect(next).toHaveBeenCalledOnce();
  socket.destroy();
});
