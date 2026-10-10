import { resolve } from "node:path";
import { access, readFile, readdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { command, root } from "./process.ts";
const cwd = resolve(root, "apps/00-home");
await command(["exec", "cf", "build"], cwd);
const output = resolve(cwd, ".cloudflare/output/v0/workers");
const workers = await readdir(output);
if (workers.length !== 1 || workers[0] !== "default")
  throw new Error("出力Workerはdefault一つである必要があります。");
await access(resolve(output, "default/bundle/index.js"));
if (
  gzipSync(await readFile(resolve(output, "default/bundle/index.js"))).byteLength >
  3 * 1024 * 1024
)
  throw new Error("Worker bundleがWorkers Freeの3MiB上限を超えています。");
await access(resolve(output, "default/assets/shell.html"));
