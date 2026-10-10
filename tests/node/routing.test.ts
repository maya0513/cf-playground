// @vitest-environment node
import { readFile } from "node:fs/promises";
import { expect, it } from "vite-plus/test";
import { catalog, topicForPath } from "../../packages/catalog/index.ts";
import { topicUrl, topicRequestPath } from "../../packages/catalog/urls.ts";
import { canonicalTopicUrl } from "../../packages/catalog/routing.ts";
import { sequential } from "../../packages/catalog/sequential.ts";
it("topic paths remain distinct inside the single Worker", () => {
  for (const topic of catalog) {
    expect(topicForPath(topic.path)).toBe(topic);
    expect(topicForPath(topic.path + "api/test")).toBe(topic);
    expect(topicForPath(topic.path.slice(0, -1))).toBe(topic);
    expect(topicForPath(topic.path.slice(0, -1) + "-other/")).toBeUndefined();
    expect(topicUrl(topic.number, "/api/test?q=1")).toBe(topic.path + "api/test?q=1");
    expect(topicUrl(topic.number, "image.svg")).toBe(topic.path + "image.svg");
    expect(
      topicRequestPath(topic.number)(
        new Request("https://example.test" + topic.path + "api/test?q=1"),
      ),
    ).toBe("/api/test");
  }
  expect(topicForPath("/")).toBeUndefined();
  expect(topicRequestPath(3)(new Request("https://example.test/elsewhere"))).toBe("/elsewhere");
  expect(() => topicUrl(0, "/")).toThrow("題材番号");
});
it("canonical redirects retain queries and leave canonical/unknown routes alone", () => {
  expect(canonicalTopicUrl("https://example.test/d1?q=x%20y")).toBe(
    "https://example.test/d1/?q=x%20y",
  );
  expect(canonicalTopicUrl("https://example.test/d1/")).toBeUndefined();
  expect(canonicalTopicUrl("https://example.test/missing")).toBeUndefined();
});
it("all workspace manifests prohibit package scripts", async () => {
  const files = import.meta.glob<string>(
    [
      "../../package.json",
      "../../apps/*/package.json",
      "../../packages/*/package.json",
      "../workers/package.json",
    ],
    { query: "?raw", import: "default" },
  );
  await sequential(Object.values(files), async (load) => {
    const json: unknown = JSON.parse(await load());
    expect(json).not.toHaveProperty("scripts");
  });
  const instructions = await readFile(new URL("../../mise.toml", import.meta.url), "utf8");
  expect(instructions).toContain('node = "24"');
  expect(instructions).toContain('pnpm = "12"');
});
