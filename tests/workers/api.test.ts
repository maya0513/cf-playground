import { numericId, stringId } from "../json.ts";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Internal } from "../../apps/14-internal/src/index.ts";
import { sequential } from "../../packages/catalog/sequential.ts";
import { beforeAll, afterEach, expect, it, vi } from "vitest";
import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
  createMessageBatch,
  getQueueResult,
  createScheduledController,
  evictDurableObject,
  runInDurableObject,
} from "cloudflare:test";
import { exports as workerExports } from "cloudflare:workers";
import home from "../../apps/00-home/src/index.tsx";
import workers from "../../apps/01-workers/src/index.tsx";
import assets from "../../apps/02-assets/src/index.tsx";
import d1 from "../../apps/03-d1/src/index.tsx";
import kv from "../../apps/04-kv/src/index.tsx";
import r2 from "../../apps/05-r2/src/index.tsx";
import cacheApp, { purge } from "../../apps/06-cache/src/index.tsx";
import turnstile from "../../apps/07-turnstile/src/index.tsx";
import access from "../../apps/08-access/src/index.tsx";
import cron from "../../apps/09-cron/src/index.tsx";
import queues from "../../apps/10-queues/src/index.tsx";
import counter from "../../apps/11-durable-objects/src/index.tsx";
import chat from "../../apps/12-websockets/src/index.tsx";
import workflows from "../../apps/13-workflows/src/index.tsx";
import rpc from "../../apps/14-rpc/src/index.tsx";
import { identity } from "../../apps/08-access/src/auth.ts";
import { localToken, publicJwk } from "../../apps/08-access/local-fixture.ts";
import { privateJwk } from "../fixtures/access.ts";
import { importJWK, SignJWT } from "jose";
import {
  boundedBody,
  jsonInput,
  textField,
  page,
  configureApp,
  finish,
  fail,
} from "../../packages/ui/server.tsx";
import { View } from "../../apps/01-workers/src/view.tsx";

function isInternal(value: unknown): value is Service<Internal> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    typeof Reflect.get(value, "fetch") === "function" &&
    typeof Reflect.get(value, "greet") === "function"
  );
}

const ASSETS = {
  connect: vi.fn<() => never>(() => {
    throw new Error("not used");
  }),
  fetch: vi.fn<(input: RequestInfo | URL) => Promise<Response>>(
    async (input: RequestInfo | URL) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.pathname === "/shell.html")
        return new Response(
          '<!doctype html><div id="app"><!--app--></div><script id="initial" type="application/json"><!--data--></script>',
        );
      if (url.pathname === "/sample.txt") return new Response("static text");
      return new Response("missing", { status: 404 });
    },
  ),
};
function internalBinding() {
  const internal = workerExports["Internal"];
  if (!isInternal(internal)) throw new Error("Internal entrypoint is missing");
  return internal;
}
const bindings = () => ({
  ...env,
  INTERNAL: internalBinding(),
  ASSETS,
  MODE: "local" as string,
  SITEKEY: "1x00000000000000000000AA",
  SECRET: "1x0000000000000000000000000000000AA",
  ACCESS_ISSUER: "https://local.access.invalid",
  ACCESS_AUDIENCE: "local-learning",
});
type FetchApp = {
  fetch: (
    request: Request,
    env: ReturnType<typeof bindings>,
    ctx: ExecutionContext,
  ) => Response | Promise<Response>;
};
async function request(
  app: FetchApp,
  path: string,
  method = "GET",
  data?: unknown,
  overrides: Partial<ReturnType<typeof bindings>> & Record<string, unknown> = {},
  headers: HeadersInit = {},
) {
  const ctx = createExecutionContext();
  const response = await app.fetch(
    new Request("https://demo.local" + path, {
      method,
      headers: { "Content-Type": "application/json", ...Object.fromEntries(new Headers(headers)) },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    }),
    { ...bindings(), ...overrides },
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return response;
}
beforeAll(async () => {
  await env.DB.exec(
    "CREATE TABLE bookmarks(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT,url TEXT); CREATE TABLE jobs(id TEXT PRIMARY KEY,text TEXT,state TEXT,characters INTEGER,words INTEGER,created_at INTEGER); CREATE TABLE orders(id TEXT PRIMARY KEY,item TEXT,should_fail INTEGER,stage TEXT);",
  );
});
afterEach(() => vi.restoreAllMocks());

it("serves readable guides and redirects old URLs while keeping queries", async () => {
  const response = await request(home, "/guides/03-d1/");
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
  const html = await response.text();
  expect(html).toContain('aria-label="目次"');
  expect(html).toContain('class="guide-content"');
  expect(html).toContain('href="/d1/"');
  await sequential(["/guides/03-d1?from=home", "/guides/03-d1.txt?from=home"], async (path) => {
    const redirect = await request(home, path);
    expect(redirect.status).toBe(308);
    expect(redirect.headers.get("Location")).toBe("https://demo.local/guides/03-d1/?from=home");
  });
  await sequential(["/guides/missing/", "/guides/missing", "/guides/missing.txt"], async (path) => {
    expect((await request(home, path)).status).toBe(404);
  });
});

it("SSR pages and both types of 404; credentials are never echoed", async () => {
  await sequential(
    [
      home,
      workers,
      assets,
      d1,
      kv,
      r2,
      cacheApp,
      turnstile,
      access,
      cron,
      queues,
      counter,
      chat,
      workflows,
    ],
    async (app) => {
      const response = await request(app, "/");
      expect(response.status).toBe(200);
      expect(await response.text()).toContain("<h1>");
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    },
  );
  expect(await (await request(workers, "/missing")).text()).toContain("ページがありません");
  expect(await (await request(workers, "/missing.css")).text()).toContain("静的ファイル");
  expect(await (await request(workers, "/sample.txt")).text()).toBe("static text");
  expect((await request(workers, "/api/missing")).status).toBe(404);
  const observed = await (
    await request(
      workers,
      "/api/request",
      "POST",
      {},
      {},
      {
        Authorization: "secret",
        Cookie: "secret",
        Accept: "application/json",
        "User-Agent": "learner",
      },
    )
  ).json();
  expect(observed).toMatchObject({
    method: "POST",
    headers: { accept: "application/json", "user-agent": "learner" },
  });
  expect(JSON.stringify(observed)).not.toContain("secret");
  const ctx = createExecutionContext();
  const response = await workers.fetch(
    new Request("https://demo.local/api/request"),
    bindings(),
    ctx,
  );
  expect(await response.json()).toMatchObject({
    headers: { accept: null, "content-type": null, "user-agent": null },
  });
});

it("D1 CRUD, search, input validation and atomic cap", async () => {
  const item = numericId.parse(
    await (
      await request(d1, "/api/bookmarks", "POST", { title: "Workers", url: "https://example.com" })
    ).json(),
  );
  expect((await request(d1, "/api/bookmarks?q=Workers")).status).toBe(200);
  expect(await (await request(d1, "/api/bookmarks")).json()).toHaveLength(1);
  expect(
    (
      await request(d1, `/api/bookmarks/${item.id}`, "PUT", {
        title: "KV",
        url: "http://example.com",
      })
    ).status,
  ).toBe(200);
  expect((await request(d1, `/api/bookmarks/${item.id}`, "DELETE")).status).toBe(200);
  await sequential(["PUT", "DELETE"], async (method) => {
    expect(
      (
        await request(
          d1,
          "/api/bookmarks/999",
          method,
          method === "PUT" ? { title: "a", url: "https://example.com" } : undefined,
        )
      ).status,
    ).toBe(404);
  });
  await sequential(["invalid", "javascript:alert(1)"], async (url) => {
    expect((await request(d1, "/api/bookmarks", "POST", { title: "bad", url })).status).toBe(400);
  });
  await env.DB.batch(
    Array.from({ length: 99 }, (_, i) =>
      env.DB.prepare("INSERT INTO bookmarks(title,url) VALUES(?,?)").bind(
        String(i),
        "https://example.com",
      ),
    ),
  );
  const responses = await Promise.all(
    [1, 2, 3].map(() =>
      request(d1, "/api/bookmarks", "POST", { title: "last", url: "https://example.com" }),
    ),
  );
  expect(responses.map((r) => r.status).toSorted((a, b) => a - b)).toEqual([201, 429, 429]);
  await env.DB.exec("DELETE FROM bookmarks");
  vi.spyOn(env.DB, "prepare").mockImplementation(() => {
    throw new Error("storage unavailable");
  });
  expect((await request(d1, "/api/bookmarks")).status).toBe(500);
});

it("KV empty, TTL and unlimited writes", async () => {
  await env.NOTICE.delete("notice");
  expect(await (await request(kv, "/api/notice")).json()).toMatchObject({ ttl: null });
  await sequential([60, null], async (ttl) => {
    expect((await request(kv, "/api/notice", "PUT", { text: "hello", ttl })).status).toBe(200);
    expect(await (await request(kv, "/api/notice")).json()).toMatchObject({ text: "hello", ttl });
  });
  await sequential([undefined, 1, 86401, 60.5, "60"], async (ttl) => {
    expect((await request(kv, "/api/notice", "PUT", { text: "hello", ttl })).status).toBe(400);
  });
  vi.spyOn(env.NOTICE, "put").mockRejectedValue(new Error("storage unavailable"));
  expect((await request(kv, "/api/notice", "PUT", { text: "hello", ttl: null })).status).toBe(500);
});

it("R2 upload/download/delete, bounds and safe content type", async () => {
  expect((await request(r2, "/api/files/10")).status).toBe(400);
  expect((await request(r2, "/api/files/0")).status).toBe(404);
  expect((await request(r2, "/api/files/0", "DELETE")).status).toBe(404);
  const ctx = createExecutionContext();
  const response = await r2.fetch(
    new Request("https://demo.local/api/files/0", {
      method: "PUT",
      body: "<script>hello</script>",
    }),
    bindings(),
    ctx,
  );
  expect(response.status).toBe(200);
  const download = await request(r2, "/api/files/0");
  expect(download.headers.get("Content-Type")).toBe("application/octet-stream");
  expect(await download.text()).toBe("<script>hello</script>");
  expect((await request(r2, "/api/files/0", "DELETE")).status).toBe(200);
  expect(
    (
      await r2.fetch(
        new Request("https://demo.local/api/files/0", {
          method: "PUT",
          body: "x".repeat(256 * 1024 + 1),
        }),
        bindings(),
        ctx,
      )
    ).status,
  ).toBe(413);
  vi.spyOn(env.FILES, "put").mockRejectedValue(new Error("storage unavailable"));
  expect((await request(r2, "/api/files/0", "PUT", "hello")).status).toBe(500);
});

it("Cache returns explicit TTL and purges using Workers Cache", async () => {
  expect((await request(cacheApp, "/api/time?cached=1")).headers.get("Cache-Control")).toContain(
    "s-maxage=10",
  );
  expect((await request(cacheApp, "/api/time")).headers.get("Cache-Control")).toBe("no-store");
  expect((await request(cacheApp, "/api/purge", "POST")).status).toBe(502);
  await expect(purge(undefined)).rejects.toThrow(HTTPException);
  const purgeMock = vi.fn<NonNullable<Parameters<typeof purge>[0]>["purge"]>();
  await purge({ purge: purgeMock });
  expect(purgeMock).toHaveBeenCalledWith({ tags: ["clock"] });
});

it("Turnstile verifies server-side; rejects failures and mismatched production scope", async () => {
  const data = { message: "hello", token: "test-token" };
  const fetchMock = vi.spyOn(globalThis, "fetch");
  fetchMock.mockResolvedValue(Response.json({ success: true }));
  expect((await request(turnstile, "/api/submit", "POST", data)).status).toBe(200);
  fetchMock.mockResolvedValue(Response.json({ success: false }));
  expect((await request(turnstile, "/api/submit", "POST", data)).status).toBe(401);
  fetchMock.mockResolvedValue(new Response("bad", { status: 503 }));
  expect((await request(turnstile, "/api/submit", "POST", data)).status).toBe(502);
  fetchMock.mockRejectedValue(new Error("network"));
  expect((await request(turnstile, "/api/submit", "POST", data)).status).toBe(502);
  expect((await request(turnstile, "/api/submit", "POST", data, { SECRET: "" })).status).toBe(401);
  await sequential(
    [
      { success: true, hostname: "other", action: "message" },
      { success: true, hostname: "demo.local", action: "wrong" },
      { success: true, hostname: "demo.local", action: "message" },
    ],
    async (result) => {
      fetchMock.mockResolvedValue(Response.json(result));
      expect(
        (await request(turnstile, "/api/submit", "POST", data, { MODE: "production" })).status,
      ).toBe(result.hostname === "demo.local" && result.action === "message" ? 200 : 401);
    },
  );
});

it("Access validates signature issuer audience expiry and never fails open", async () => {
  expect((await request(access, "/api/me")).status).toBe(401);
  expect((await request(access, "/protected")).status).toBe(401);
  expect(
    (
      await request(
        access,
        "/api/me",
        "GET",
        undefined,
        {},
        { "Cf-Access-Jwt-Assertion": localToken },
      )
    ).status,
  ).toBe(200);
  const session = await request(access, "/api/session", "POST", { token: localToken });
  expect(session.status).toBe(200);
  expect(session.headers.get("Set-Cookie")).toContain("HttpOnly");
  expect(
    (
      await request(
        access,
        "/protected",
        "GET",
        undefined,
        {},
        { Cookie: `CF_Authorization=${localToken}` },
      )
    ).status,
  ).toBe(200);
  expect(
    (await request(access, "/api/session", "POST", { token: localToken }, { MODE: "production" }))
      .status,
  ).toBe(404);
  expect((await request(access, "/", "GET", undefined, { MODE: "production" })).status).toBe(200);
  await expect(identity(localToken, { ...bindings(), ACCESS_ISSUER: "" })).rejects.toThrow(
    HTTPException,
  );
  await expect(identity(localToken, { ...bindings(), ACCESS_AUDIENCE: "" })).rejects.toThrow(
    HTTPException,
  );
  await expect(identity(localToken + "x", bindings())).rejects.toThrow(HTTPException);
  const key = await importJWK(privateJwk, "RS256");
  await sequential(
    [
      ["wrong", "local-learning", 2100000000],
      ["https://local.access.invalid", "wrong", 2100000000],
      ["https://local.access.invalid", "local-learning", 1],
    ] as const,
    async ([issuer, audience, exp]) => {
      const token = await new SignJWT({ email: "test" })
        .setProtectedHeader({ alg: "RS256", kid: publicJwk.kid })
        .setIssuer(issuer)
        .setAudience(audience)
        .setIssuedAt(1)
        .setExpirationTime(exp)
        .sign(key);
      await expect(identity(token, bindings())).rejects.toThrow(HTTPException);
    },
  );
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(Response.json({ keys: [publicJwk] }));
  expect(await identity(localToken, { ...bindings(), MODE: "production" })).toMatchObject({
    email: "learner@example.invalid",
  });
  expect(fetchMock).toHaveBeenCalled();
});

it("Cron uses scheduled time and retains at most 100 records", async () => {
  await env.HISTORY.delete("history");
  expect(await (await request(cron, "/api/history")).json()).toEqual([]);
  expect((await request(cron, "/api/run", "POST")).status).toBe(200);
  await cron.scheduled(
    createScheduledController({ cron: "0 * * * *", scheduledTime: 1000 }),
    bindings(),
  );
  expect(await (await request(cron, "/api/history")).json()).toHaveLength(2);
  await env.HISTORY.put(
    "history",
    JSON.stringify(Array.from({ length: 100 }, () => ({ at: "old", source: "test" }))),
  );
  expect(await (await request(cron, "/api/run", "POST")).json()).toHaveLength(100);
});

it("Queues handles at-least-once delivery and retries storage failures", async () => {
  const submitted = await request(queues, "/api/jobs", "POST", { text: "hello world" });
  expect(submitted.status).toBe(202);
  const { id } = stringId.parse(await submitted.json());
  expect((await request(queues, "/api/jobs")).status).toBe(200);
  expect((await request(queues, `/api/jobs/${id}/retry`, "POST")).status).toBe(202);
  expect((await request(queues, "/api/jobs/missing/retry", "POST")).status).toBe(404);
  const batch = createMessageBatch("test-jobs", [
    { id: "delivery", timestamp: new Date(), body: { id, text: "hello world" }, attempts: 1 },
  ]);
  let ctx = createExecutionContext();
  await queues.queue(batch, bindings());
  expect((await getQueueResult(batch, ctx)).explicitAcks).toEqual(["delivery"]);
  await queues.queue(batch, bindings());
  expect(
    await env.DB.prepare("SELECT characters,words FROM jobs WHERE id=?").bind(id).first(),
  ).toEqual({ characters: 11, words: 2 });
  vi.spyOn(env.DB, "prepare").mockImplementationOnce(() => {
    throw new Error("storage");
  });
  const retry = createMessageBatch("test-jobs", [
    { id: "retry", timestamp: new Date(), body: { id, text: "hello" }, attempts: 1 },
  ]);
  ctx = createExecutionContext();
  await queues.queue(retry, bindings());
  expect((await getQueueResult(retry, ctx)).retryMessages).toHaveLength(1);
  await env.DB.batch(
    Array.from({ length: 99 }, (_, i) =>
      env.DB.prepare("INSERT INTO jobs(id,text,state,created_at) VALUES(?,'x','pending',0)").bind(
        String(i),
      ),
    ),
  );
  expect((await request(queues, "/api/jobs", "POST", { text: "over cap" })).status).toBe(429);
  await env.DB.exec("DELETE FROM jobs");
});

it("DO serializes concurrent updates and recovers persisted SQLite after eviction", async () => {
  const stub = env.COUNTER.getByName("shared");
  const before = await stub.read();
  await Promise.all(Array.from({ length: 20 }, () => stub.add(1)));
  expect(await stub.read()).toBe(before + 20);
  await evictDurableObject(stub);
  expect(await stub.read()).toBe(before + 20);
  expect(await env.COUNTER.getByName("separate").read()).toBe(0);
  await runInDurableObject(stub, (instance) => {
    expect(() => instance.add(2)).toThrow(/./);
  });
  expect((await request(counter, "/api/counter")).status).toBe(200);
  expect((await request(counter, "/api/counter", "POST", { delta: 1 })).status).toBe(200);
  expect((await request(counter, "/api/counter", "POST", { delta: -1 })).status).toBe(200);
  expect((await request(counter, "/api/counter", "POST", { delta: 2 })).status).toBe(400);
});

it("RPC and HTTP use the real internal entrypoint", async () => {
  // ctx.exports routes RPC in workerd, without exposing an internet endpoint.
  const internal = workerExports["Internal"];
  if (!isInternal(internal)) throw new Error("Internal entrypoint is missing");
  await sequential(
    ["/", "/api/http?name=Cloudflare", "/api/rpc?name=Cloudflare", "/api/http", "/api/rpc"],
    async (path) => {
      expect(
        (
          await rpc.fetch(
            new Request("https://demo.local" + path),
            { ...bindings(), INTERNAL: internal },
            createExecutionContext(),
          )
        ).status,
      ).toBe(200);
    },
  );
  expect(await (await internal.fetch("https://internal/")).json()).toMatchObject({
    message: "こんにちは、学習者さん。",
  });
});

it("bounded JSON, safe SSR embedding and isolated state", async () => {
  expect(await boundedBody(new Request("https://demo.local"), 10)).toHaveLength(0);
  await sequential(["bad", "[]", "null", "1"], async (body) => {
    await expect(
      jsonInput(new Request("https://demo.local", { method: "POST", body })),
    ).rejects.toThrow(HTTPException);
  });
  for (const value of [undefined, "", "x".repeat(4097)])
    expect(() => textField(value)).toThrow(HTTPException);
  expect(textField(" trimmed ")).toBe("trimmed");
  const malicious = "</script><script>alert(1)</script>\u2028\u2029";
  const [first, second] = await Promise.all([
    page(new Request("https://demo.local"), ASSETS as Fetcher, View, { title: malicious }),
    page(new Request("https://demo.local"), ASSETS as Fetcher, View, { title: "separate" }),
  ]);
  expect(await first.text()).not.toContain("<script>alert");
  expect(await second.text()).not.toContain("alert");
  const app = configureApp(new Hono<{ Bindings: { ASSETS: Fetcher } }>());
  app.get("/failure", () => fail(409, "CONFLICT", "duplicate"));
  finish(app);
  expect((await app.request("/failure", {}, { ASSETS: ASSETS })).status).toBe(409);
  ASSETS.fetch.mockResolvedValueOnce(new Response("", { status: 404 }));
  await expect(
    page(new Request("https://demo.local"), ASSETS as Fetcher, View, { title: "x" }),
  ).rejects.toThrow("shell");
});

it("the single entry redirects and dispatches subpath APIs without topic bindings", async () => {
  const redirected = await request(home, "/d1?q=one");
  expect(redirected.status).toBe(308);
  expect(redirected.headers.get("Location")).toBe("https://demo.local/d1/?q=one");
  expect((await request(home, "/d1/")).status).toBe(200);
  const forwarded = await request(home, "/workers/api/request?query=yes", "POST", "example");
  expect(forwarded.status).toBe(200);
  expect(await forwarded.json()).toMatchObject({
    method: "POST",
    url: "https://demo.local/workers/api/request?query=yes",
  });
  expect((await request(workers, "/workers/api/unknown")).headers.get("Content-Type")).toContain(
    "application/json",
  );
});

it("the unified entry serves every topic with isolated SSR data", async () => {
  const { catalog } = await import("../../packages/catalog/index.ts");
  await sequential(catalog, async (topic) => {
    const response = await request(home, topic.path);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain(topic.title);
  });
});
