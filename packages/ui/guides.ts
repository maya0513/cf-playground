import { catalog } from "../catalog/index.ts";
import { renderMarkdown } from "./markdown.ts";
import { z } from "zod";

// public配下への複製をやめ、リポジトリのREADMEを唯一の原稿にする。
const sources = import.meta.glob<string>(["../../apps/*/README.md", "../../docs/*.md"], {
  query: "?raw",
  import: "default",
  eager: true,
});
const documents = [
  ...catalog.map((topic) => ({
    slug: topic.slug,
    title: topic.title,
    source: `apps/${topic.slug}/README.md`,
    demo: topic.path,
  })),
  ...(
    [
      ["roadmap", "今後のロードマップ"],
      ["free-tier", "無料枠一覧"],
      ["publishing", "公開手順"],
      ["verification", "検証記録"],
      ["skills", "導入したskill"],
    ] as const
  ).map(([slug, title]) => ({ slug, title, source: `docs/${slug}.md`, demo: "" })),
];

export function getGuide(slug: string) {
  const document = documents.find((item) => item.slug === slug);
  if (!document) return undefined;
  const source = z.string().parse(sources[`../../${document.source}`]);
  // リポジトリ内のMarkdownへのリンクを、対応する閲覧ページへ解決する。
  const rendered = renderMarkdown(source, (href) => {
    const target = new URL(href, `https://repository.invalid/${document.source}`);
    const linkedDocument = documents.find((item) => `/${item.source}` === target.pathname);
    return target.origin === "https://repository.invalid" && linkedDocument
      ? `/guides/${linkedDocument.slug}/${target.search}${target.hash}`
      : href;
  });
  return { ...document, ...rendered };
}
