import { readFile } from "node:fs/promises";
import { expect, type Page } from "@playwright/test";
import { catalog } from "../../packages/catalog/index.ts";
import { sequential } from "../../packages/catalog/sequential.ts";

export async function checkGuides(page: Page, origin: string) {
  await page.goto(origin);
  const links = page.locator('a[href^="/guides/"]');
  await expect(links).toHaveCount(catalog.length + 1);
  const paths = await links.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("href")),
  );
  expect(paths).toEqual([
    ...catalog.map((topic) => `/guides/${topic.slug}.txt`),
    "/guides/roadmap.txt",
  ]);
  await sequential([...catalog.map((topic) => topic.slug), "roadmap"], async (slug) => {
    const response = await page.goto(`${origin}/guides/${slug}.txt`);
    expect(response?.status()).toBe(200);
    expect(response?.headers()["content-type"]).toMatch(/^text\/plain;\s*charset=utf-8$/i);
    expect(await page.evaluate(() => document.characterSet)).toBe("UTF-8");
    const source = await readFile(
      new URL(`../../apps/00-home/public/guides/${slug}.txt`, import.meta.url),
      "utf8",
    );
    expect(await page.locator("pre").textContent()).toBe(source);
  });
  const sample = await page.goto(`${origin}/static-assets/sample.txt`);
  expect(sample?.headers()["content-type"]).toMatch(/^text\/plain;\s*charset=utf-8$/i);
  expect(await page.evaluate(() => document.characterSet)).toBe("UTF-8");
  await expect(page.locator("pre")).toHaveText(
    "これはWorkers Static Assetsから配信されるテキストです。",
  );
}
