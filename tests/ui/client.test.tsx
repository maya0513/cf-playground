import { required } from "../assert.ts";
import { initialSchema } from "../../apps/01-workers/src/view.tsx";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { render } from "preact";
import { renderToString } from "preact-render-to-string";
import { act } from "preact/test-utils";
import { api, mount } from "../../packages/ui/client.tsx";
import { View } from "../../apps/01-workers/src/view.tsx";
afterEach(async () => {
  const element = document.getElementById("app");
  if (element) await act(() => render(null, element));
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  history.replaceState(null, "", "/");
});
it("hydrates existing SSR HTML, keeps the data and does not fetch again", async () => {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
  const initial = { title: "SSR title" };
  document.body.innerHTML = `<div id="app">${renderToString(<View initial={initial} />)}</div><script id="initial" type="application/json">${JSON.stringify(initial)}</script>`;
  await act(() => mount(View, initialSchema));
  expect(document.getElementById("app")?.dataset["hydrated"]).toBe("true");
  expect(fetchMock).not.toHaveBeenCalled();
});
it("rejects incomplete hydration documents", () => {
  expect(() => mount(View, initialSchema)).toThrow(/./);
  document.body.innerHTML = '<div id="app"></div>';
  expect(() => mount(View, initialSchema)).toThrow(/./);
  document.body.innerHTML += '<script id="initial" type="application/json"></script>';
  expect(() => mount(View, initialSchema)).toThrow(/./);
});
it("standard fetch helper preserves success and error contracts", async () => {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockImplementation(async () => Response.json({ ok: true }));
  vi.stubGlobal("fetch", fetchMock);
  expect(await api("/api/example")).toEqual({ ok: true });
  expect(required(required(fetchMock.mock.calls[0])[1]).body).toBeUndefined();
  await api("/api/example", "POST", { message: "hello" });
  expect(required(required(fetchMock.mock.calls[1])[1]).body).toBe('{"message":"hello"}');
  fetchMock.mockResolvedValue(Response.json({ error: { code: "INPUT" } }, { status: 400 }));
  await expect(api("/api/example")).rejects.toThrow("INPUT");
});
const clients = import.meta.glob("../../apps/*/src/client.tsx");
it.each(Object.keys(clients))("%s uses the shared hydration entry", async (path) => {
  // Per-app entry is exercised with its actual View and serialized SSR props.
  const viewPath = path.replace("client.tsx", "view.tsx");
  const views = import.meta.glob<{ View: typeof View }>("../../apps/*/src/view.tsx");
  const { View: AppView } = await required(views[viewPath])();
  const initial = {
    title: "SSR",
    items: [],
    notice: {},
    records: [],
    jobs: [],
    value: 0,
    token: "",
    sitekey: "test",
  };
  document.body.innerHTML = `<div id="app">${renderToString(<AppView initial={initial} />)}</div><script id="initial" type="application/json">${JSON.stringify(initial)}</script>`;

  const { catalog } = await import("../../packages/catalog/index.ts");
  const topic = catalog.find((item) => path.includes(item.slug));
  history.replaceState(null, "", topic?.path ?? "/");
  vi.resetModules();
  await act(async () => {
    await import("../../apps/00-home/src/client.tsx");
  });
  expect(document.getElementById("app")?.dataset["hydrated"]).toBe("true");
});
