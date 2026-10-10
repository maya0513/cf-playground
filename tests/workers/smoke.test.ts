import { it, expect } from "vitest";
import { env } from "cloudflare:test";
it("official local bindings work", async () => {
  await env.NOTICE.put("smoke", "hello");
  expect(await env.NOTICE.get("smoke")).toBe("hello");
  expect(await env.COUNTER.getByName("smoke").add(1)).toBe(1);
});
