import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { root } from "./process.ts";
import { localQuery } from "./local-query.ts";
const args = process.argv.slice(2).filter((value) => value !== "--");
const [action] = args;
if ((action !== "setup" && action !== "reset") || args.length !== 1)
  throw new Error("setupまたはresetだけを指定してください。初期化は全題材共通です。");
const cwd = resolve(root, "apps/00-home");
if (action === "reset")
  await rm(resolve(cwd, ".cloudflare/state"), { recursive: true, force: true });
// 同じローカルDBへの連続CLI起動を避け、全migrationを一度に適用する。
const migrations = await Promise.all(
  [
    "03-d1/migrations/0001_bookmarks.sql",
    "10-queues/migrations/0001_jobs.sql",
    "13-workflows/migrations/0001_orders.sql",
  ].map((file) => readFile(resolve(root, "apps", file), "utf8")),
);
await localQuery(migrations.join("\n"), cwd, "DB-cf-playground");
