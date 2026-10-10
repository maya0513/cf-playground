import { readFile } from "node:fs/promises";
import { expect, type Page } from "@playwright/test";
import { catalog } from "../../packages/catalog/index.ts";
import { sequential } from "../../packages/catalog/sequential.ts";

export async function checkGuides(page: Page, origin: string) {
  await page.goto(origin);
  const links = page.locator('a[href^="/guides/"]');
  await expect(links).toHaveCount(catalog.length + 1);
  expect(
    await links.evaluateAll((elements) => elements.map((element) => element.getAttribute("href"))),
  ).toEqual([...catalog.map((topic) => `/guides/${topic.slug}/`), "/guides/roadmap/"]);
  await links.first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(catalog[0].title);
  await page.emulateMedia({ colorScheme: "dark" });
  await sequential(
    [
      ...catalog.map((topic) => topic.slug),
      "roadmap",
      "free-tier",
      "publishing",
      "verification",
      "skills",
    ],
    async (slug) => {
      const response = await page.goto(`${origin}/guides/${slug}/`);
      expect(response?.status()).toBe(200);
      expect(response?.headers()["content-type"]).toMatch(/^text\/html;\s*charset=utf-8$/i);
      expect(await page.evaluate(() => document.characterSet)).toBe("UTF-8");
      const article = page.getByRole("article", { name: "学習資料" });
      const topic = catalog.find((item) => item.slug === slug);
      const sourcePath = topic ? `apps/${slug}/README.md` : `docs/${slug}.md`;
      const source = await readFile(new URL(`../../${sourcePath}`, import.meta.url), "utf8");
      const headings = Array.from(source.matchAll(/^## (.+)$/gm), (match) => match[0].slice(3));
      await expect(article.locator("h2")).toHaveText(headings);
      await expect(page.locator("h1")).toHaveCount(1);
      expect(await page.title()).toBe(await page.locator("h1").innerText());
      await expect(page.getByRole("navigation", { name: "目次" }).locator("a")).toHaveCount(
        headings.length,
      );
      expect(
        await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme),
      ).toBe("light");
      expect(
        await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor),
      ).toBe("rgb(250, 250, 250)");
      expect(await article.innerText()).not.toContain("\ufffd");
      if (topic) {
        await expect(article.locator("pre code").first()).toHaveText("just setup\njust dev\n");
        await expect(article.getByRole("link", { name: "無料枠一覧" })).toHaveAttribute(
          "href",
          "/guides/free-tier/",
        );
        await expect(page.getByRole("link", { name: "この題材を試す →" })).toHaveAttribute(
          "href",
          topic.path,
        );
      }
    },
  );
  await page.goto(`${origin}/guides/03-d1/`);
  await page
    .getByRole("navigation", { name: "目次" })
    .getByRole("link", { name: "変更課題" })
    .click();
  expect(new URL(page.url()).hash).toMatch(/^#section-/);
  await page.getByRole("link", { name: "無料枠一覧" }).click();
  await expect(page.getByRole("article").locator("table")).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole("link", { name: "学習ホームへ" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("学習ホーム");
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ colorScheme: "light" });
  const legacy = await page.request.get(`${origin}/guides/03-d1.txt?from=old`, { maxRedirects: 0 });
  expect(legacy.status()).toBe(308);
  expect(legacy.headers()["location"]).toBe(`${origin}/guides/03-d1/?from=old`);
  const sample = await page.goto(`${origin}/static-assets/sample.txt`);
  expect(sample?.headers()["content-type"]).toMatch(/^text\/plain;\s*charset=utf-8$/i);
  expect(await page.evaluate(() => document.characterSet)).toBe("UTF-8");
  await expect(page.locator("pre")).toHaveText(
    "これはWorkers Static Assetsから配信されるテキストです。",
  );
}
