import { expect, it } from "vite-plus/test";
import { renderToString } from "preact-render-to-string";
import { GuideView } from "../../packages/ui/guide.tsx";
import { act } from "preact/test-utils";
import { render } from "preact";

it("renders plain documents without empty navigation or a table of contents", () => {
  const html = renderToString(
    <GuideView
      initial={{
        title: "文書",
        source: "docs/test.md",
        html: "<p>本文</p>",
        demo: "",
        sections: [],
      }}
    />,
  );
  expect(html).toContain("学習ホームへ");
  expect(html).toContain("<p>本文</p>");
  expect(html).not.toContain("この題材を試す");
  expect(html).not.toContain('aria-label="目次"');
});

it("the home client hydrates a guide from its SSR data", async () => {
  const initial = {
    title: "D1：ブックマーク",
    source: "apps/03-d1/README.md",
    demo: "/d1/",
    html: '<h2 id="section-1">目的</h2><p>本文</p>',
    sections: [{ id: "section-1", title: "目的" }],
  };
  const element = document.createElement("div");
  element.id = "app";
  element.innerHTML = renderToString(<GuideView initial={initial} />);
  const data = document.createElement("script");
  data.id = "initial";
  data.type = "application/json";
  data.textContent = JSON.stringify(initial);
  document.body.appendChild(element);
  document.body.appendChild(data);
  history.replaceState(null, "", "/guides/03-d1/");
  try {
    await act(async () => {
      await import("../../apps/00-home/src/client.tsx");
    });
    expect(element.dataset["hydrated"]).toBe("true");
    expect(element.querySelector('a[href="/d1/"]')?.textContent).toContain("この題材を試す");
    expect(element.querySelector('a[href="#section-1"]')?.textContent).toBe("目的");
  } finally {
    await act(() => {
      render(null, element);
    });
    element.remove();
    data.remove();
    history.replaceState(null, "", "/");
  }
});
