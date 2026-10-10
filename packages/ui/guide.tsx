import { z } from "zod";
import { Layout } from "./layout.tsx";

export const guideSchema = z.object({
  title: z.string(),
  source: z.string(),
  demo: z.string(),
  html: z.string(),
  sections: z.array(z.object({ id: z.string(), title: z.string() })),
});

export function GuideView({ initial }: { initial: z.infer<typeof guideSchema> }) {
  return (
    <Layout title={initial.title}>
      <nav class="guide-navigation" aria-label="学習資料のナビゲーション">
        <a href="/">学習ホームへ</a>
        {initial.demo && <a href={initial.demo}>この題材を試す →</a>}
      </nav>
      <p class="guide-source">
        原稿：<code>{initial.source}</code>
      </p>
      {initial.sections.length > 0 && (
        <nav class="guide-toc" aria-label="目次">
          <h2>目次</h2>
          <ol>
            {initial.sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.title}</a>
              </li>
            ))}
          </ol>
        </nav>
      )}
      {/* htmlはサーバーでHTML無効のMarkdown parserから生成したものだけを渡す。 */}
      <article
        class="guide-content"
        aria-label="学習資料"
        dangerouslySetInnerHTML={{ __html: initial.html }}
      />
    </Layout>
  );
}
