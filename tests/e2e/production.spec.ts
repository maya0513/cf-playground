import { spawn } from "node:child_process";
import { once } from "node:events";
import { resolve } from "node:path";
import { createWriteStream } from "node:fs";
import { test, expect } from "@playwright/test";
import { catalog } from "../../packages/catalog/index.ts";
import { sequential } from "../../packages/catalog/sequential.ts";
import { checkGuides } from "./guides.ts";

test("the single production Worker serves all topics, assets, APIs and WebSockets", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180000);
  const root = resolve(import.meta.dirname, "../..");
  const output = createWriteStream(testInfo.outputPath("preview.log"));
  // Two bounded pipes per preview process intentionally share this artifact.
  output.setMaxListeners(2 * (catalog.length + 1) + 4);
  // cf dev clears Build Output. Rebuild after development checks, keeping the
  // production preview on real cf output rather than a copied or patched bundle.
  const build = spawn(process.execPath, ["scripts/build.ts"], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
  });
  build.stdout.pipe(output, { end: false });
  build.stderr.pipe(output, { end: false });
  await once(build, "exit");
  expect(build.exitCode).toBe(0);
  const child = spawn(
    process.execPath,
    [
      new URL(import.meta.resolve("vite-plus/bin")).pathname,
      "preview",
      "--host",
      "127.0.0.1",
      "--port",
      "4200",
      "--strictPort",
    ],
    {
      cwd: resolve(root, "apps/00-home"),
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        CF_SEND_TELEMETRY: "false",
        XDG_CONFIG_HOME: resolve(root, ".cloudflare/cli-config"),
      },
    },
  );
  child.stdout.pipe(output, { end: false });
  child.stderr.pipe(output, { end: false });
  try {
    await expect
      .poll(
        async () => {
          if (child.exitCode !== null) throw new Error(`preview exited: ${child.exitCode}`);
          try {
            return (await fetch("http://127.0.0.1:4200/")).status;
          } catch {
            return 0;
          }
        },
        { timeout: 120000 },
      )
      .toBe(200);
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await checkGuides(page, "http://127.0.0.1:4200");
    await sequential(catalog, async (topic) => {
      const response = await page.goto(`http://127.0.0.1:4200${topic.path}`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(topic.title);
      const scripts = await page
        .locator('script[type="module"][src]')
        .evaluateAll((elements) => elements.map((element) => element.getAttribute("src")));
      expect(scripts.length).toBeGreaterThan(0);
      await sequential(scripts, async (src) => {
        expect(src).toMatch(/^\/assets\//);
        expect((await context.request.get(`http://127.0.0.1:4200${src}`)).status()).toBe(200);
      });
      const redirect = await context.request.get(
        `http://127.0.0.1:4200${topic.path.slice(0, -1)}?q=one`,
        { maxRedirects: 0 },
      );
      expect(redirect.status()).toBe(308);
      expect(redirect.headers()["location"]).toBe(`http://127.0.0.1:4200${topic.path}?q=one`);
      expect(
        (await context.request.get(`http://127.0.0.1:4200${topic.path}missing.png`)).status(),
      ).toBe(404);
    });
    const observed = await context.request.post(
      "http://127.0.0.1:4200/workers/api/request?query=retained",
      { data: "body" },
    );
    await sequential(["sample.css", "sample.svg", "sample.txt"], async (filename) => {
      const asset = await context.request.get(`http://127.0.0.1:4200/static-assets/${filename}`);
      expect(asset.status()).toBe(200);
      expect(asset.headers()["cache-control"]).not.toBe("no-store");
    });
    expect(await observed.json()).toMatchObject({
      method: "POST",
      url: "http://127.0.0.1:4200/workers/api/request?query=retained",
    });
    expect((await context.request.get("http://127.0.0.1:4200/access/api/me")).status()).toBe(401);
    await sequential(["http", "rpc"], async (method) => {
      const response = await context.request.get(
        `http://127.0.0.1:4200/rpc/api/${method}?name=公開確認`,
      );
      expect(response.status()).toBe(200);
      expect(await response.json()).toMatchObject({
        message: "こんにちは、公開確認さん。",
        service: "internal",
      });
    });
    expect((await context.request.get("http://127.0.0.1:4200/access/protected")).status()).toBe(
      401,
    );
    expect(
      (await context.request.get("http://127.0.0.1:4200/workers/api/unknown")).headers()[
        "content-type"
      ],
    ).toContain("application/json");
    const bytes = Buffer.from([0, 1, 127, 255]);
    expect(
      (await context.request.put("http://127.0.0.1:4200/r2/api/files/9", { data: bytes })).status(),
    ).toBe(200);
    const downloaded = await context.request.get("http://127.0.0.1:4200/r2/api/files/9");
    expect(await downloaded.body()).toEqual(bytes);
    expect(downloaded.headers()["content-disposition"]).toBe('attachment; filename="slot-9.bin"');
    expect((await context.request.delete("http://127.0.0.1:4200/r2/api/files/9")).status()).toBe(
      200,
    );
    expect(
      await (await context.request.get("http://127.0.0.1:4200/workers/missing.png")).text(),
    ).toBe("静的ファイルがありません。");
    expect(
      await (await context.request.get("http://127.0.0.1:4200/workers/missing-page")).text(),
    ).toContain("ページがありません。");
    await context.close();
    const hydrated = await browser.newPage();
    await hydrated.goto("http://127.0.0.1:4200/workers/");
    await expect(hydrated.locator("#app")).toHaveAttribute("data-hydrated", "true");
    await hydrated.getByRole("button", { name: "GETを観察" }).click();
    await expect(hydrated.locator("pre")).toContainText("GET");
    await hydrated.goto("http://127.0.0.1:4200/websockets/");
    await expect(hydrated.locator("#app")).toHaveAttribute("data-hydrated", "true");
    await hydrated.getByRole("button", { name: "接続・再接続" }).click();
    await expect(hydrated.locator("pre")).toContainText("history");
    await hydrated.getByRole("button", { name: "送信", exact: true }).click();
    await expect(hydrated.locator("pre")).toContainText("こんにちは");
    await hydrated.getByRole("button", { name: "切断", exact: true }).click();
    await expect(hydrated.locator("pre")).toContainText("切断済み");
    await hydrated.getByRole("button", { name: "接続・再接続" }).click();
    await expect(hydrated.locator("pre")).toContainText("history");
    await hydrated.getByRole("button", { name: "切断", exact: true }).click();
    await hydrated.close();
  } finally {
    if (child.exitCode === null) {
      const exited = once(child, "exit");
      if (child.pid) process.kill(-child.pid, "SIGKILL");
      await exited;
    }
    output.end();
  }
});
