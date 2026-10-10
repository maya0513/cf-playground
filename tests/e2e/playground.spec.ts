import { numericId, stringId } from "../json.ts";
import { sequential } from "../../packages/catalog/sequential.ts";
import { test, expect } from "@playwright/test";
import { catalog } from "../../packages/catalog/index.ts";
test("SSR without JavaScript includes all fourteen learning links", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://localhost:4100/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("学習ホーム");
  await sequential(catalog, async (topic) => {
    await expect(page.getByRole("link", { name: topic.title, exact: true })).toHaveAttribute(
      "href",
      topic.path,
    );
  });
  await context.close();
});
test("home links reach every demo; hydration makes their controls work", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // CI controls Siteverify and the widget. No external Turnstile call is needed.
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: 'window.turnstile={render:(el,options)=>{options.callback("test-token");return "test"},reset:()=>{}}',
    }),
  );
  await sequential(catalog, async (topic) => {
    await page.goto("http://localhost:4100/");
    await page.getByRole("link", { name: topic.title, exact: true }).click();
    await expect(page.locator("#app")).toHaveAttribute("data-hydrated", "true");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(topic.title);
    expect(new URL(page.url()).pathname).toBe(topic.path);
    await page.reload();
    await expect(page.locator("#app")).toHaveAttribute("data-hydrated", "true");
    switch (topic.number) {
      case 1:
        await page.getByRole("button", { name: "GETを観察" }).click();
        await expect(page.locator("pre")).toContainText("GET");
        break;
      case 2:
        await page.getByRole("button").click();
        await expect(page.locator("pre")).toContainText("200");
        break;
      case 3: {
        await page.getByLabel("タイトル").fill("E2E bookmark");
        await page.getByRole("button", { name: "登録", exact: true }).click();
        await expect(page.locator("pre")).toContainText("E2E bookmark");
        const record = numericId.parse(JSON.parse(await page.locator("pre").innerText()));
        await page.getByLabel("ID", { exact: true }).fill(String(record.id));
        await page.getByLabel("タイトル").fill("edited bookmark");
        await page.getByRole("button", { name: "編集", exact: true }).click();
        await expect(page.locator("pre")).toContainText("edited bookmark");
        await page.getByRole("button", { name: "削除", exact: true }).click();
        break;
      }
      case 4:
        await page.getByRole("button", { name: "保存", exact: true }).click();
        await expect(page.locator("pre")).toContainText("新しいお知らせ");
        break;
      case 5:
        await page.getByRole("button", { name: "保存", exact: true }).click();
        await expect(page.locator("pre")).toContainText("size");
        await page.getByRole("button", { name: "削除", exact: true }).click();
        await expect(page.locator("pre")).toContainText("deleted");
        break;
      case 6:
        await page.getByRole("button", { name: "キャッシュ有効", exact: true }).click();
        await expect(page.locator("pre")).toContainText("generatedAt");
        await page.getByRole("button", { name: "パージ", exact: true }).click();
        await expect(page.locator("pre")).toContainText("LOCAL_UNSUPPORTED");
        break;
      case 7:
        await expect(page.getByRole("button", { name: "検証して送信" })).toBeEnabled();
        break;
      case 8:
        await page.getByRole("button", { name: "本人情報" }).click();
        await expect(page.locator("pre")).toContainText("UNAUTHORIZED");
        await page.getByRole("button", { name: "ローカルセッション作成" }).click();
        await expect(page.locator("pre")).toContainText("learner@example.invalid");
        const cookie = (await page.context().cookies()).find(
          (item) => item.name === "CF_Authorization",
        );
        expect(cookie?.path).toBe("/access/");
        await page.getByRole("link", { name: "保護ページへ" }).click();
        await expect(page.getByRole("heading")).toHaveText("保護ページ");
        break;
      case 9:
        await page.getByRole("button", { name: "手動実行" }).click();
        await expect(page.locator("pre")).toContainText("manual");
        break;
      case 10:
        await page.getByRole("button", { name: "投入", exact: true }).click();
        await expect(page.locator("pre")).toContainText("id");
        await expect
          .poll(async () => {
            await page.getByRole("button", { name: "状態更新" }).click();
            return page.locator("pre").innerText();
          })
          .toContain("done");
        break;
      case 11:
        await page.getByRole("button", { name: "+1", exact: true }).click();
        await expect(page.locator("pre")).toContainText("value");
        break;
      case 12:
        await page.getByRole("button", { name: "接続・再接続" }).click();
        await expect(page.locator("pre")).toContainText("history");
        await page.getByRole("button", { name: "送信", exact: true }).click();
        await expect(page.locator("pre")).toContainText("こんにちは");
        await page.getByRole("button", { name: "切断", exact: true }).click();
        await expect(page.locator("pre")).toContainText("切断済み");
        await page.getByRole("button", { name: "接続・再接続" }).click();
        await expect(page.locator("pre")).toContainText("history");
        await page.getByRole("button", { name: "切断", exact: true }).click();
        break;
      case 13: {
        await page.getByLabel("発送を意図的に失敗させる").uncheck();
        await page.getByRole("button", { name: "注文作成" }).click();
        await expect(page.locator("pre")).toContainText("id");
        const { id } = stringId.parse(JSON.parse(await page.locator("pre").innerText()));
        await page.getByLabel("注文ID").fill(id);
        await expect
          .poll(async () => {
            await page.getByRole("button", { name: "状態確認" }).click();
            return page.locator("pre").innerText();
          })
          .toContain("complete");
        break;
      }
      case 14:
        await page.getByRole("button", { name: "HTTP呼び出し" }).click();
        await expect(page.locator("pre")).toContainText("internal");
        await page.getByRole("button", { name: "RPC呼び出し" }).click();
        await expect(page.locator("pre")).toContainText("こんにちは");
        break;
    }
  });
  expect(errors).toEqual([]);
});
