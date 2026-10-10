import MarkdownIt from "markdown-it";

// HTMLを許可せず、危険なURLもmarkdown-itの標準検証でリンクにしない。
const markdown = new MarkdownIt({ html: false });

export function renderMarkdown(source: string, resolveLink = (href: string) => href) {
  // ページ枠がh1を表示するため、文書先頭のタイトルだけを取り除く。
  const tokens = markdown.parse(source.replace(/^# [^\n]+\n/, ""), {});
  const sections: { id: string; title: string }[] = [];
  for (const [index, token] of tokens.entries()) {
    // リンクだけを変換する。コード例や通常の文章には触れない。
    for (const child of token.children ?? [])
      for (const attribute of child.attrs ?? [])
        if (attribute[0] === "href") attribute[1] = resolveLink(String(attribute[1]));
    if (token.type === "heading_open" && token.tag === "h2") {
      const id = `section-${sections.length + 1}`;
      token.attrSet("id", id);
      for (const inline of tokens.slice(index + 1, index + 2))
        sections.push({ id, title: inline.content });
    }
  }
  return { html: markdown.renderer.render(tokens, markdown.options, {}), sections };
}
