import { expect, it } from "vite-plus/test";
import { getGuide } from "../../packages/ui/guides.ts";
import { renderMarkdown } from "../../packages/ui/markdown.ts";
import { catalog } from "../../packages/catalog/index.ts";

it("renders structure, stable heading anchors and literal code safely", () => {
  const source =
    '# Title\n\n## Start\n\n### Detail\n\n<script>alert(1)</script>\n\n[unsafe](javascript:alert(1))\n\n[docs](docs.md "title")\n\n```sh\njust dev\n[docs](docs.md)\n```\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n## Next\n\n![image](/image.svg)';
  const rendered = renderMarkdown(source);
  expect(rendered.sections).toEqual([
    { id: "section-1", title: "Start" },
    { id: "section-2", title: "Next" },
  ]);
  expect(rendered.html).not.toContain("<h1>");
  expect(rendered.html).toContain('<h2 id="section-1">Start</h2>');
  expect(rendered.html).toContain("<h3>Detail</h3>");
  expect(rendered.html).toContain("&lt;script&gt;");
  expect(rendered.html).not.toContain('href="javascript:');
  expect(rendered.html).toContain('<a href="docs.md" title="title">docs</a>');
  expect(rendered.html).toContain('<code class="language-sh">just dev\n[docs](docs.md)');
  expect(rendered.html).toContain("<table>");
  const resolved = renderMarkdown(source, () => "/guides/target/");
  expect(resolved.html).toContain('href="/guides/target/"');
  expect(resolved.html).toContain("[docs](docs.md)");
  expect(renderMarkdown("A paragraph").sections).toEqual([]);
});

it("loads each canonical README and document; unknown guides stay absent", () => {
  for (const topic of catalog) {
    const guide = getGuide(topic.slug);
    expect(guide).toMatchObject({ title: topic.title, demo: topic.path });
    expect(guide?.html).toContain('<a href="/guides/free-tier/">');
    expect(guide?.html).toContain('<a href="/guides/publishing/">');
    expect(guide?.sections.length).toBeGreaterThan(0);
  }
  for (const slug of ["roadmap", "free-tier", "publishing", "verification", "skills"])
    expect(getGuide(slug)?.source).toBe(`docs/${slug}.md`);
  expect(getGuide("missing")).toBeUndefined();
  expect(getGuide("../../AGENTS.md")).toBeUndefined();
});
