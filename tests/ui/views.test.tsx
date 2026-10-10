import { sequential } from "../../packages/catalog/sequential.ts";
import { required } from "../assert.ts";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { render, type ComponentType } from "preact";
import { act } from "preact/test-utils";
import { api } from "../../packages/ui/client.tsx";
vi.mock("../../packages/ui/client.tsx", () => ({ api: vi.fn<(...args: unknown[]) => unknown>() }));
const modules = import.meta.glob<{ View: ComponentType<{ initial: typeof initial }> }>(
  "../../apps/*/src/view.tsx",
);
const initial = {
  title: "学習",
  items: [],
  notice: { text: "SSR notice" },
  records: [],
  jobs: [],
  value: 3,
  token: "local-token",
  sitekey: "test-key",
};
let container: HTMLDivElement;
afterEach(async () => {
  await act(() => render(null, container));
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
class Socket extends EventTarget {
  static OPEN = 1;
  static instances: Socket[] = [];
  readyState = 1;
  onopen = () => {};
  onclose = () => {};
  onerror = () => {};
  onmessage = (_event: { data: string }) => {};
  send = vi.fn<(...args: unknown[]) => unknown>();
  close = vi.fn<() => void>(() => this.dispatchEvent(new Event("close")));
  constructor(public url: string) {
    super();
    Socket.instances.push(this);
  }
}
function expectSend(socket: Socket) {
  expect(socket.send).toHaveBeenCalled();
}
function expectSecureUrl(url: string | undefined) {
  expect(url).toContain("wss:");
}
it.each(Object.keys(modules))(
  "%s hydrates with initial state and performs its UI actions",
  async (path) => {
    vi.mocked(api).mockResolvedValue({ ok: true });
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response('{"ok":true}', { headers: { "Content-Type": "application/json" } }),
      );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("WebSocket", Socket);
    Socket.instances = [];
    const renderWidget = vi.fn<Window["turnstile"]["render"]>();
    const reset = vi.fn<(...args: unknown[]) => unknown>();
    vi.stubGlobal("turnstile", { render: renderWidget, reset });
    container = document.createElement("div");
    document.body.appendChild(container);
    const { View } = await required(modules[path])();
    await act(() => render(<View initial={initial} />, container));
    expect(container.querySelector("h1")?.textContent).toBe("学習");
    expect(api).not.toHaveBeenCalled();
    async function widgetToken() {
      const script = required(
        document.querySelector<HTMLScriptElement>('script[src*="turnstile"]'),
      );
      await act(() => {
        script.dispatchEvent(new Event("load"));
      });
      const options = required(renderWidget.mock.calls.at(-1))[1];
      await act(() => {
        options.callback("token");
        options["expired-callback"]();
        options["error-callback"]();
        options.callback("token");
      });
    }
    if (path.includes("07-turnstile")) await widgetToken();
    await sequential(
      container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input,textarea"),
      async (element) => {
        if (element.type === "checkbox") {
          await act(() => {
            if (element instanceof HTMLInputElement) element.checked = false;
            element.dispatchEvent(new Event("change", { bubbles: true }));
          });
        } else {
          await act(() => {
            element.value = element.type === "number" ? "1" : "edited";
            element.dispatchEvent(new Event("input", { bubbles: true }));
          });
        }
      },
    );
    const select = container.querySelector("select");
    if (select)
      await act(() => {
        select.value = "2";
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
    await sequential(container.querySelectorAll("button"), async (button) => {
      if (path.includes("07-turnstile")) await widgetToken();
      if (path.includes("02-assets") || path.includes("05-r2"))
        fetchMock.mockResolvedValue(
          new Response('{"ok":true}', { headers: { "Content-Type": "application/json" } }),
        );
      await act(async () => button.click());
    });
    if (path.includes("04-kv")) {
      const input = required(container.querySelector("input"));
      await act(() => {
        input.value = "";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await act(async () => required(container.querySelector("button")).click());
    }
    if (path.includes("12-websockets")) {
      const ws = required(Socket.instances[0]);
      await act(() => {
        ws.dispatchEvent(new Event("open"));
        ws.dispatchEvent(new MessageEvent("message", { data: '{"messages":[]}' }));
        ws.dispatchEvent(new Event("error"));
      });
      await act(async () => required(container.querySelectorAll("button")[2]).click());
      expectSend(ws);
      await act(() => {
        ws.readyState = 0;
      });
      await act(async () => required(container.querySelectorAll("button")[2]).click());
      vi.stubGlobal("location", { protocol: "https:", host: "demo.local" });
      await act(async () => required(container.querySelectorAll("button")[0]).click());
      expectSecureUrl(Socket.instances.at(-1)?.url);
    }
    vi.mocked(api).mockRejectedValue(new Error("API unavailable"));
    fetchMock.mockRejectedValue(new Error("network unavailable"));
    await sequential(container.querySelectorAll("button"), async (button) => {
      if (path.includes("07-turnstile")) await widgetToken();
      await act(async () => button.click());
    });
    if (path.includes("05-r2")) {
      fetchMock.mockResolvedValue(new Response("rejected", { status: 413 }));
      await act(async () => required(container.querySelector("button")).click());
    }
    vi.mocked(api).mockReset();
  },
);
