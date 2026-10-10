export const initialSchema = titleInitial;
import { titleInitial } from "../../../packages/ui/initial.ts";
import { Layout } from "../../../packages/ui/layout.tsx";
import { catalog } from "../../../packages/catalog/index.ts";
export function View({ initial }: { initial: { title: string } }) {
  return (
    <Layout title={initial.title}>
      <p>全題材を1つのWorkerで動かします。番号は読む順番の目安です。</p>
      <ol>
        {catalog.map((topic) => (
          <li key={topic.slug}>
            <a href={topic.path}>{topic.title}</a> —{" "}
            <a href={`/guides/${topic.slug}.txt`}>README</a>
            <br />
            <code>apps/{topic.slug}/src/index.tsx</code>
          </li>
        ))}
      </ol>
      <p>
        <a href="/guides/roadmap.txt">今後のロードマップ</a>
      </p>
    </Layout>
  );
}
